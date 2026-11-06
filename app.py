
import os
import re
import json
import uuid
import sqlite3
import logging
import smtplib

from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import parseaddr

from dotenv import load_dotenv
import joblib
import numpy as np
from scipy.sparse import hstack
from flask import Flask, jsonify, request
from flask_cors import CORS

from poc1_email_status import (
    fetch_read_unread_emails,
    fetch_email_content,
)
from email_flooding_poc import analyze_email_flooding
from auth_api import init_auth, get_current_user


# ---------------------------------------------------------
# APP CONFIGURATION
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)

CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "https://localhost:5173",
                "https://127.0.0.1:5173",
                "https://localhost:5175",
                "https://127.0.0.1:5175",
            ],
            "allow_headers": [
                "Content-Type",
                "Authorization",
            ],
            "methods": [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS",
            ],
        }
    },
)

# Keep the existing authentication and passkey setup.
init_auth(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SmartMail")


# ---------------------------------------------------------
# MODEL PATHS
# ---------------------------------------------------------

SPAM_MODEL_PATH = os.path.join(
    BASE_DIR, "src", "pages", "spam_classifier.pkl"
)

PHISHING_MODEL_PATH = os.path.join(
    BASE_DIR, "src", "pages", "phishing_detector.pkl"
)

CATEGORIZATION_MODEL_PATH = os.path.join(
    BASE_DIR, "src", "pages", "email_categorization_model.pkl"
)

spam_bundle = None
phishing_bundle = None
categorization_bundle = None

poc4_cache = {
    "emails": None,
}


# ---------------------------------------------------------
# MODEL LOADER
# ---------------------------------------------------------

def load_model(path):
    if not os.path.isfile(path):
        logger.warning("Model file not found: %s", path)
        return None

    try:
        bundle = joblib.load(path)
        logger.info("Loaded model: %s", path)
        return bundle

    except Exception:
        logger.exception("Could not load model: %s", path)
        return None


spam_bundle = load_model(SPAM_MODEL_PATH)
phishing_bundle = load_model(PHISHING_MODEL_PATH)
categorization_bundle = load_model(CATEGORIZATION_MODEL_PATH)


# ---------------------------------------------------------
# COMMON HELPERS
# ---------------------------------------------------------

def clean_text(value):
    value = str(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def error_response(message, status=500):
    return jsonify({
        "success": False,
        "error": message,
    }), status


def get_request_text(data, *keys):
    for key in keys:
        value = data.get(key)

        if value is not None and str(value).strip():
            return str(value).strip()

    return ""


# ---------------------------------------------------------
# PERSISTENT THREAT HISTORY
# ---------------------------------------------------------

THREAT_HISTORY_DB = os.path.join(
    BASE_DIR, "auth_users.sqlite3"
)


def history_connection():
    conn = sqlite3.connect(THREAT_HISTORY_DB)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS threat_scan_history (
            email_id TEXT PRIMARY KEY,
            threat_json TEXT,
            scanned INTEGER NOT NULL DEFAULT 1,
            scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    return conn


@app.route("/api/threat-history", methods=["GET"])
def get_threat_history():
    try:
        with history_connection() as conn:
            rows = conn.execute("""
                SELECT email_id, threat_json
                FROM threat_scan_history
                ORDER BY scanned_at DESC
            """).fetchall()

        threats = []
        scanned_ids = []

        for row in rows:
            scanned_ids.append(str(row["email_id"]))

            if row["threat_json"]:
                try:
                    threats.append(json.loads(row["threat_json"]))
                except (TypeError, json.JSONDecodeError):
                    logger.warning(
                        "Invalid saved threat JSON for %s",
                        row["email_id"],
                    )

        return jsonify({
            "success": True,
            "threats": threats,
            "scanned_ids": scanned_ids,
        })

    except Exception:
        logger.exception("Threat history read failed")
        return error_response("Could not load threat scan history")


@app.route("/api/threat-history", methods=["POST"])
def save_threat_history():
    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        email_id = str(data.get("email_id") or "").strip()

        if not email_id:
            return error_response("email_id is required.", 400)

        threat = data.get("threat")

        if threat is not None and not isinstance(threat, dict):
            return error_response(
                "threat must be an object or null.",
                400,
            )

        required = {
            "id",
            "sender",
            "subject",
            "type",
            "email",
            "category",
            "reason",
            "body",
            "time",
            "spamPrediction",
            "phishingPrediction",
        }

        if threat is not None and not required.issubset(threat):
            return error_response(
                "Threat record is missing required fields.",
                400,
            )

        if (
            threat is not None
            and str(threat.get("type", "")).upper()
            not in {"SPAM", "PHISHING"}
        ):
            return error_response(
                "Threat type must be SPAM or PHISHING.",
                400,
            )

        encoded = (
            json.dumps(threat, ensure_ascii=False)
            if threat is not None
            else None
        )

        with history_connection() as conn:
            conn.execute("""
                INSERT INTO threat_scan_history (
                    email_id,
                    threat_json,
                    scanned,
                    scanned_at
                )
                VALUES (?, ?, 1, ?)
                ON CONFLICT(email_id) DO UPDATE SET
                    threat_json = excluded.threat_json,
                    scanned = 1,
                    scanned_at = excluded.scanned_at
            """, (
                email_id,
                encoded,
                datetime.now(timezone.utc).isoformat(),
            ))

        return jsonify({
            "success": True,
            "email_id": email_id,
        })

    except Exception:
        logger.exception("Threat history save failed")
        return error_response("Could not save threat scan history")


# ---------------------------------------------------------
# COMPOSE EMAIL AND PERSISTENT DRAFTS
# ---------------------------------------------------------

MAIL_STORAGE_DB = os.path.join(
    BASE_DIR, "smartmail_mail.sqlite3"
)


def mail_connection():
    conn = sqlite3.connect(MAIL_STORAGE_DB)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS mail_drafts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            recipient TEXT NOT NULL DEFAULT '',
            subject TEXT NOT NULL DEFAULT '',
            body TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_mail_drafts_user
        ON mail_drafts(user_id)
    """)

    return conn


def authenticated_mail_user():
    try:
        user = get_current_user()

        if not user:
            return None

        user_id = user.get("user_id")

        if user_id is None:
            return None

        return str(user_id)

    except Exception:
        logger.exception("Could not verify current mail user")
        return None


def valid_email_address(address):
    address = str(address or "").strip()

    if not address or len(address) > 254:
        return False

    parsed_name, parsed_address = parseaddr(address)

    if parsed_address != address:
        return False

    return bool(
        re.fullmatch(
            r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
            r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}"
            r"[A-Za-z0-9])?"
            r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}"
            r"[A-Za-z0-9])?)+",
            address,
        )
    )


def get_mail_credentials():
    email_address = (
        os.getenv("SMARTMAIL_EMAIL") or ""
    ).strip()

    app_password = (
        os.getenv("SMARTMAIL_APP_PASSWORD") or ""
    ).replace(" ", "")

    return email_address, app_password


@app.route("/api/mail/account", methods=["GET"])
def get_mail_account():
    user_id = authenticated_mail_user()

    if not user_id:
        return error_response(
            "Please sign in to SmartMail.",
            401,
        )

    email_address, _ = get_mail_credentials()

    if not email_address:
        return error_response(
            "Connected Gmail account is not configured.",
            503,
        )

    return jsonify({
        "success": True,
        "from": email_address,
    })


@app.route("/api/mail/drafts", methods=["GET"])
def get_mail_drafts():
    user_id = authenticated_mail_user()

    if not user_id:
        return error_response(
            "Please sign in to SmartMail.",
            401,
        )

    try:
        with mail_connection() as conn:
            rows = conn.execute("""
                SELECT id, recipient, subject, body, updated_at
                FROM mail_drafts
                WHERE user_id = ?
                ORDER BY updated_at DESC
            """, (user_id,)).fetchall()

        drafts = [
            {
                "id": row["id"],
                "recipient": row["recipient"],
                "subject": row["subject"],
                "body": row["body"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

        return jsonify({
            "success": True,
            "drafts": drafts,
        })

    except Exception:
        logger.exception("Could not load mail drafts")
        return error_response("Could not load drafts")


@app.route("/api/mail/drafts", methods=["POST"])
def save_mail_draft():
    user_id = authenticated_mail_user()

    if not user_id:
        return error_response(
            "Please sign in to SmartMail.",
            401,
        )

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        draft_id = str(data.get("id") or "").strip()
        recipient = str(data.get("recipient") or "").strip()
        subject = str(data.get("subject") or "")
        body = str(data.get("body") or "")

        if len(recipient) > 254:
            return error_response(
                "Recipient address is too long.",
                400,
            )

        if len(subject) > 998:
            return error_response(
                "Subject is too long.",
                400,
            )

        if len(body) > 1000000:
            return error_response(
                "Message is too large.",
                400,
            )

        if not draft_id:
            draft_id = str(uuid.uuid4())

        updated_at = datetime.now(
            timezone.utc
        ).isoformat()

        with mail_connection() as conn:
            existing = conn.execute("""
                SELECT id
                FROM mail_drafts
                WHERE id = ? AND user_id = ?
            """, (draft_id, user_id)).fetchone()

            if existing:
                conn.execute("""
                    UPDATE mail_drafts
                    SET recipient = ?,
                        subject = ?,
                        body = ?,
                        updated_at = ?
                    WHERE id = ? AND user_id = ?
                """, (
                    recipient,
                    subject,
                    body,
                    updated_at,
                    draft_id,
                    user_id,
                ))

            else:
                # A supplied ID belonging to another user
                # is never overwritten.
                draft_id = str(uuid.uuid4())

                conn.execute("""
                    INSERT INTO mail_drafts (
                        id,
                        user_id,
                        recipient,
                        subject,
                        body,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    draft_id,
                    user_id,
                    recipient,
                    subject,
                    body,
                    updated_at,
                ))

        return jsonify({
            "success": True,
            "message": "Draft saved successfully.",
            "draft": {
                "id": draft_id,
                "recipient": recipient,
                "subject": subject,
                "body": body,
                "updated_at": updated_at,
            },
        })

    except Exception:
        logger.exception("Could not save mail draft")
        return error_response("Could not save draft")


@app.route("/api/mail/drafts/<draft_id>", methods=["DELETE"])
def delete_mail_draft(draft_id):
    user_id = authenticated_mail_user()

    if not user_id:
        return error_response(
            "Please sign in to SmartMail.",
            401,
        )

    try:
        with mail_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM mail_drafts
                WHERE id = ? AND user_id = ?
            """, (draft_id, user_id))

        if cursor.rowcount == 0:
            return error_response(
                "Draft not found.",
                404,
            )

        return jsonify({
            "success": True,
            "message": "Draft deleted successfully.",
        })

    except Exception:
        logger.exception("Could not delete mail draft")
        return error_response("Could not delete draft")


@app.route("/api/mail/send", methods=["POST"])
def send_mail():
    user_id = authenticated_mail_user()

    if not user_id:
        return error_response(
            "Please sign in to SmartMail.",
            401,
        )

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        recipient = str(
            data.get("recipient") or ""
        ).strip()

        subject = str(
            data.get("subject") or ""
        ).strip()

        body = str(
            data.get("body") or ""
        )

        draft_id = str(
            data.get("draft_id") or ""
        ).strip()

        if not valid_email_address(recipient):
            return error_response(
                "Enter a valid recipient email address.",
                400,
            )

        if not subject:
            return error_response(
                "Enter an email subject.",
                400,
            )

        if not body.strip():
            return error_response(
                "Enter a message before sending.",
                400,
            )

        if len(subject) > 998 or len(body) > 1000000:
            return error_response(
                "Email content exceeds the allowed size.",
                400,
            )

        sender, app_password = get_mail_credentials()

        if not sender or not app_password:
            return error_response(
                "Gmail SMTP is not configured on the backend.",
                503,
            )

        if not valid_email_address(sender):
            return error_response(
                "The configured Gmail sender address is invalid.",
                503,
            )

        message = EmailMessage()
        message["From"] = sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

        # The message is sent through the connected Gmail account.
        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=30,
        ) as smtp:
            smtp.login(sender, app_password)
            smtp.send_message(message)

        # Delete the associated draft only after sending succeeds.
        if draft_id:
            with mail_connection() as conn:
                conn.execute("""
                    DELETE FROM mail_drafts
                    WHERE id = ? AND user_id = ?
                """, (draft_id, user_id))

        logger.info(
            "Mail successfully sent for SmartMail user %s",
            user_id,
        )

        return jsonify({
            "success": True,
            "message": "Email sent successfully.",
        })

    except smtplib.SMTPAuthenticationError:
        logger.exception("Gmail SMTP authentication failed")

        return error_response(
            "Gmail could not authenticate the connected account. "
            "Check the backend Gmail configuration.",
            502,
        )

    except (smtplib.SMTPException, OSError):
        logger.exception("Gmail SMTP sending failed")

        return error_response(
            "Could not send the email through Gmail.",
            502,
        )

    except Exception:
        logger.exception("Email sending failed")
        return error_response("Email sending failed")


# ---------------------------------------------------------
# HOME AND HEALTH
# ---------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "SmartMail Security API is running",
        "pocs": [
            "POC 1 - Email Read and Unread",
            "POC 2 - Spam and Non-Spam Detection",
            "POC 3 - Phishing Detection",
            "POC 4 - Email Categorization",
            "POC 6 - Email Flooding Detection",
        ],
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "backend": "running",
        "poc2_model_loaded": spam_bundle is not None,
        "poc3_model_loaded": phishing_bundle is not None,
        "poc4_model_loaded": categorization_bundle is not None,
        "poc6_available": callable(analyze_email_flooding),
    })


# ---------------------------------------------------------
# POC 1 - LIVE GMAIL EMAIL READ AND UNREAD
# ---------------------------------------------------------

INBOX_DISPLAY_LIMIT = 251


@app.route("/api/poc1/emails", methods=["GET"])
def get_poc1_emails():
    try:
        logger.info("POC1: Starting live Gmail Inbox retrieval.")

        live_emails = fetch_read_unread_emails()

        if not isinstance(live_emails, list):
            raise RuntimeError(
                "Gmail retrieval returned an invalid email list."
            )

        emails = []

        for item in live_emails[:INBOX_DISPLAY_LIMIT]:

            if not isinstance(item, dict):
                continue

            email_id = str(
                item.get("id")
                or item.get("email_id")
                or ""
            ).strip()

            if not email_id:
                continue

            sender_address = str(
                item.get("address") or ""
            ).strip()

            sender_name = str(
                item.get("sender") or ""
            ).strip()

            read_status = str(
                item.get("readStatus")
                or item.get("read_status")
                or (
                    "Unread"
                    if item.get("unread")
                    else "Read"
                )
            )

            emails.append({
                "id": email_id,
                "email_id": email_id,
                "sender": (
                    sender_address
                    or sender_name
                    or "Unknown sender"
                ),
                "sender_name": sender_name,
                "address": sender_address,
                "subject": str(
                    item.get("subject") or "(No subject)"
                ),
                "preview": str(
                    item.get("preview")
                    or "Open email to view its message preview."
                ),
                "time": str(
                    item.get("time") or ""
                ),
                "read_status": read_status,
                "unread": bool(
                    item.get(
                        "unread",
                        read_status.lower() == "unread"
                    )
                ),
            })

        logger.info(
            "POC1: Successfully retrieved %s live Gmail emails.",
            len(emails),
        )

        return jsonify({
            "success": True,
            "poc": "POC 1 - Email Read and Unread",
            "source": "live_gmail_imap",
            "count": len(emails),
            "emails": emails,
        })

    except Exception:
        logger.exception("POC1 live Gmail retrieval failed")

        return error_response(
            "Could not retrieve live Gmail emails. "
            "Check Gmail connection and app credentials.",
            503,
        )


@app.route("/api/poc1/emails/<email_id>", methods=["GET"])
def get_poc1_email_content(email_id):
    try:
        email_data = fetch_email_content(email_id)

        return jsonify({
            "success": True,
            "poc": "POC 1 - Email Read and Unread",
            "email": email_data,
        })

    except Exception:
        logger.exception("POC1 email detail fetch failed")

        return error_response(
            "Could not fetch the selected email"
        )


# ---------------------------------------------------------
# POC 2 - SPAM AND NON-SPAM DETECTION
# ---------------------------------------------------------

@app.route("/api/poc2/detect", methods=["POST"])
def detect_spam():
    try:
        if spam_bundle is None:
            return error_response(
                "Spam detection model could not be loaded. "
                "Check src/pages/spam_classifier.pkl.",
                503,
            )

        if not isinstance(spam_bundle, dict):
            return error_response(
                "The spam model bundle must contain a vectorizer and model.",
                500,
            )

        vectorizer = spam_bundle.get("vectorizer")
        model = spam_bundle.get("model")

        if vectorizer is None or model is None:
            return error_response(
                "The spam model bundle is missing its vectorizer or model.",
                500,
            )

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        subject = clean_text(get_request_text(data, "subject"))

        body = clean_text(
            get_request_text(
                data, "body", "text", "content", "email"
            )
        )

        if not subject and not body:
            return error_response(
                "Provide an email subject or body.",
                400,
            )

        email_text = " ".join(
            part for part in (subject, body) if part
        )

        features = vectorizer.transform([email_text])
        raw_prediction = model.predict(features)[0]

        prediction_text = str(raw_prediction).strip()
        normalized = prediction_text.lower().replace("_", "-")

        if normalized in {"spam", "1", "true"}:
            label = "Spam"

        elif normalized in {
            "non-spam",
            "nonspam",
            "not spam",
            "ham",
            "0",
            "false",
            "legitimate",
            "legit",
        }:
            label = "Non-Spam"

        else:
            return error_response(
                "The spam model returned an unrecognized prediction label.",
                500,
            )

        decision_score = None
        review_required = False

        if hasattr(model, "decision_function"):
            scores = np.asarray(
                model.decision_function(features)
            ).reshape(-1)

            if len(scores):
                decision_score = float(scores[0])

                if -0.20 <= decision_score <= 0.20:
                    label = "Review"
                    review_required = True

        return jsonify({
            "success": True,
            "poc": 2,
            "prediction": prediction_text,
            "label": label,
            "subject": subject,
            "decision_score": (
                round(decision_score, 6)
                if decision_score is not None
                else None
            ),
            "review_required": review_required,
            "message": (
                "Borderline result: review the email before "
                "deciding whether it is spam."
                if review_required
                else "Email classified successfully."
            ),
        })

    except Exception:
        logger.exception("POC2 spam detection failed")
        return error_response("Spam detection failed")


# ---------------------------------------------------------
# POC 3 - PHISHING DETECTION
# ---------------------------------------------------------

@app.route("/api/poc3/detect", methods=["POST"])
def detect_phishing():
    try:
        if phishing_bundle is None:
            return error_response(
                "Phishing model could not be loaded. "
                "Check src/pages/phishing_detector.pkl.",
                503,
            )

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        subject = get_request_text(data, "subject")
        sender = get_request_text(
            data, "sender", "address", "from"
        )
        body = get_request_text(
            data, "body", "email", "text", "content"
        )

        if not any([
            subject.strip(),
            sender.strip(),
            body.strip(),
        ]):
            return error_response(
                "Provide an email subject, sender, or body.",
                400,
            )

        if not isinstance(phishing_bundle, dict):
            return error_response(
                "The original POC3 model bundle must be a dictionary.",
                500,
            )

        model = phishing_bundle.get("model")
        vectorizer = phishing_bundle.get("vectorizer")

        if model is None or vectorizer is None:
            return error_response(
                "The POC3 bundle is missing its model or vectorizer.",
                500,
            )

        if not hasattr(model, "decision_function"):
            return error_response(
                "The original POC3 model must support decision_function().",
                500,
            )

        threshold = float(
            phishing_bundle.get("decision_threshold", 0.066)
        )

        urls = " ".join(re.findall(
            r"https?://[^\s<>\"']+|www\.[^\s<>\"']+",
            body,
            flags=re.IGNORECASE,
        ))

        sender_lower = sender.lower().strip()
        sender_domain = ""

        if "@" in sender_lower:
            sender_domain = sender_lower.split("@", 1)[-1]
            sender_domain = sender_domain.split(">", 1)[0].strip()
            sender_domain = sender_domain.split()[0]

        combined_text = (
            (subject + " ") * 2
            + (sender + " ") * 2
            + body + " "
            + urls + " "
            + (
                "senderdomain_"
                + re.sub(
                    r"[^a-z0-9]+",
                    "_",
                    sender_domain,
                ).strip("_")
                + " "
            ) * 3
        ).lower()

        cleaned_email = re.sub(
            r"\s+",
            " ",
            re.sub(r"<[^>]+>", " ", combined_text),
        ).strip().lower()

        features = vectorizer.transform([cleaned_email])

        decision_score = float(
            model.decision_function(features)[0]
        )

        prediction = int(decision_score >= threshold)

        review_margin = float(
            os.getenv("PHISHING_REVIEW_MARGIN", "1.25")
        )

        review_required = bool(
            prediction == 1
            and decision_score
            < threshold + max(0.0, review_margin)
        )

        label = (
            "Review"
            if review_required
            else ("Phishing" if prediction == 1 else "Safe")
        )

        normalized_subject = subject.lower().strip()

        is_canara_upi_transaction = (
            sender_lower == "canarabank@canarabank.com"
            and normalized_subject in {
                "upi transaction alert",
                "upi/imps/mb transaction alert",
            }
        )

        if is_canara_upi_transaction:
            prediction = 0
            label = "Safe"

        absolute_score = min(abs(decision_score), 700.0)

        confidence = round(
            (1.0 / (1.0 + np.exp(-absolute_score))) * 100,
            2,
        )

        return jsonify({
            "success": True,
            "poc": 3,
            "prediction": prediction,
            "label": label,
            "confidence": confidence,
            "decision_score": round(decision_score, 6),
            "decision_threshold": threshold,
            "rule_applied": (
                "canara_upi_demo_exception"
                if is_canara_upi_transaction
                else None
            ),
        })

    except Exception:
        logger.exception("POC3 phishing detection failed")
        return error_response("Phishing detection failed")


# ---------------------------------------------------------
# POC 4 - EMAIL CATEGORIZATION HELPER
# ---------------------------------------------------------

def categorize_with_bundle(subject, body):
    bundle = categorization_bundle

    if not isinstance(bundle, dict):
        raise ValueError(
            "POC4 model bundle must be a dictionary."
        )

    model = bundle.get("model")
    word_vectorizer = bundle.get("word_vectorizer")
    char_vectorizer = bundle.get("char_vectorizer")
    categories = bundle.get("categories", [])

    if (
        model is None
        or word_vectorizer is None
        or char_vectorizer is None
    ):
        raise ValueError(
            "POC4 bundle is missing model/vectorizer components."
        )

    if isinstance(categories, np.ndarray):
        categories = categories.tolist()

    categories = [str(category) for category in categories]

    if not categories:
        raise ValueError(
            "POC4 bundle contains no category names."
        )

    subject = clean_text(subject)
    body = clean_text(body)

    combined_text = ((subject + " ") * 5 + body).strip()

    word_features = word_vectorizer.transform([combined_text])
    char_features = char_vectorizer.transform([combined_text])

    features = hstack([word_features, char_features])

    prediction = np.asarray(model.predict(features))

    if (
        prediction.ndim == 2
        and prediction.shape[1] == len(categories)
    ):
        predicted_values = prediction[0]

        active_indices = [
            i for i, value in enumerate(predicted_values)
            if value == 1
            or str(value).strip().lower() in {"true", "yes"}
        ]

        decision_scores = None

        if hasattr(model, "decision_function"):
            try:
                raw_scores = np.asarray(
                    model.decision_function(features)
                )

                if (
                    raw_scores.ndim == 2
                    and raw_scores.shape[1] == len(categories)
                ):
                    decision_scores = raw_scores[0]

            except Exception:
                logger.warning(
                    "Could not calculate POC4 decision scores"
                )

        if active_indices:
            if decision_scores is not None:
                primary_index = max(
                    active_indices,
                    key=lambda i: decision_scores[i],
                )
            else:
                primary_index = active_indices[0]

            secondary_indices = [
                i for i in active_indices
                if i != primary_index
            ]

        else:
            if decision_scores is None:
                raise ValueError(
                    "No categories were predicted and the model "
                    "does not provide decision scores."
                )

            primary_index = int(np.argmax(decision_scores))

            secondary_indices = [
                int(i)
                for i in np.argsort(decision_scores)[::-1]
                if int(i) != primary_index
            ][:2]

        primary_category = categories[primary_index]

        secondary_categories = [
            categories[i] for i in secondary_indices[:2]
        ]

    else:
        raw_prediction = prediction.reshape(-1)[0]
        primary_category = str(raw_prediction)

        if primary_category not in categories:
            try:
                category_index = int(raw_prediction)

                if 0 <= category_index < len(categories):
                    primary_category = categories[category_index]

            except (TypeError, ValueError):
                pass

        secondary_categories = []

    return {
        "primary_category": primary_category,
        "secondary_categories": secondary_categories,
        "all_categories": categories,
        "scores": {},
    }


@app.route("/api/poc4/categorize", methods=["POST"])
def categorize_one_email():
    try:
        if categorization_bundle is None:
            return error_response(
                "Email categorization model could not be loaded.",
                503,
            )

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object.",
                400,
            )

        subject = get_request_text(data, "subject")
        body = get_request_text(
            data, "body", "text", "content", "email"
        )

        if not any([subject, body]):
            return error_response(
                "Provide an email subject or body.",
                400,
            )

        result = categorize_with_bundle(subject, body)

        return jsonify({
            "success": True,
            "poc": 4,
            **result,
        })

    except Exception:
        logger.exception("POC4 categorization failed")
        return error_response("Email categorization failed")


# ---------------------------------------------------------
# POC 4 - CATEGORIZE THE SAME LIVE GMAIL INBOX AS POC 1
# ---------------------------------------------------------

@app.route("/api/poc4/categorize-inbox", methods=["GET"])
def categorize_gmail_inbox():
    try:
        if categorization_bundle is None:
            return error_response(
                "Email categorization model could not be loaded.",
                503,
            )

        logger.info(
            "POC4: Fetching the same live Gmail collection as POC1."
        )

        live_emails = fetch_read_unread_emails()

        if not isinstance(live_emails, list):
            raise RuntimeError(
                "Gmail retrieval returned an invalid email list."
            )

        emails = []
        used_ids = set()

        for item in live_emails[:INBOX_DISPLAY_LIMIT]:

            if not isinstance(item, dict):
                continue

            email_id = str(
                item.get("id")
                or item.get("email_id")
                or ""
            ).strip()

            if not email_id or email_id in used_ids:
                continue

            used_ids.add(email_id)

            sender_address = str(
                item.get("address") or ""
            ).strip()

            sender_name = str(
                item.get("sender") or ""
            ).strip()

            subject = str(
                item.get("subject") or "(No subject)"
            )

            preview = str(
                item.get("preview") or ""
            )

            read_status = str(
                item.get("readStatus")
                or item.get("read_status")
                or (
                    "Unread"
                    if item.get("unread")
                    else "Read"
                )
            )

            email_data = {
                "id": email_id,
                "email_id": email_id,
                "sender": (
                    sender_address
                    or sender_name
                    or "Unknown sender"
                ),
                "sender_name": sender_name,
                "address": sender_address,
                "subject": subject,
                "preview": preview,
                "time": str(item.get("time") or ""),
                "read_status": read_status,
                "unread": bool(
                    item.get(
                        "unread",
                        read_status.lower() == "unread"
                    )
                ),
            }

            result = categorize_with_bundle(
                subject,
                preview,
            )

            email_data.update(result)
            emails.append(email_data)

        logger.info(
            "POC4: Categorized %s live Gmail emails.",
            len(emails),
        )

        return jsonify({
            "success": True,
            "poc": 4,
            "source": "live_gmail_imap",
            "count": len(emails),
            "cached": False,
            "emails": emails,
        })

    except Exception:
        logger.exception("POC4 live inbox categorization failed")

        return error_response(
            "Could not categorize live Gmail inbox emails.",
            503,
        )


# ---------------------------------------------------------
# POC 6 - EMAIL FLOODING DETECTION
# ---------------------------------------------------------

@app.route("/api/poc6/detect", methods=["POST"])
def detect_email_flooding():
    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return error_response(
                "Request body must be a JSON object containing an emails list.",
                400,
            )

        emails = data.get("emails")

        if not isinstance(emails, list) or not emails:
            return error_response(
                "Provide a non-empty 'emails' list.",
                400,
            )

        if len(emails) > 500:
            return error_response(
                "A maximum of 500 email records can be analysed per request.",
                400,
            )

        for index, email_item in enumerate(emails, start=1):
            if not isinstance(email_item, dict):
                return error_response(
                    f"Email record {index} must be a JSON object.",
                    400,
                )

            if not str(email_item.get("sender", "")).strip():
                return error_response(
                    f"Email record {index} is missing its sender.",
                    400,
                )

            if not str(email_item.get("timestamp", "")).strip():
                return error_response(
                    f"Email record {index} is missing its timestamp.",
                    400,
                )

        results = analyze_email_flooding(emails)

        high_risk = sum(
            result["risk_level"] == "HIGH"
            for result in results
        )

        medium_risk = sum(
            result["risk_level"] == "MEDIUM"
            for result in results
        )

        low_risk = sum(
            result["risk_level"] == "LOW"
            for result in results
        )

        return jsonify({
            "success": True,
            "poc": 6,
            "name": "Email Flooding Detection",
            "emails_analysed": len(results),
            "summary": {
                "high_risk": high_risk,
                "medium_risk": medium_risk,
                "low_risk": low_risk,
            },
            "results": results,
            "action": (
                "REPORT ONLY - NO EMAIL WAS MOVED OR DELETED"
            ),
        })

    except (ValueError, TypeError) as exc:
        return error_response(
            f"Invalid POC6 email data: {str(exc)}",
            400,
        )

    except Exception:
        logger.exception("POC6 email flooding detection failed")

        return error_response(
            "Email flooding detection failed"
        )


# ---------------------------------------------------------
# RUN SERVER WITH LOCAL HTTPS
# ---------------------------------------------------------

if __name__ == "__main__":
    ssl_cert = os.path.join(BASE_DIR, "localhost+1.pem")
    ssl_key = os.path.join(BASE_DIR, "localhost+1-key.pem")

    if not os.path.isfile(ssl_cert):
        raise FileNotFoundError(
            f"HTTPS certificate not found: {ssl_cert}"
        )

    if not os.path.isfile(ssl_key):
        raise FileNotFoundError(
            f"HTTPS private key not found: {ssl_key}"
        )

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        ssl_context=(ssl_cert, ssl_key),
    )
