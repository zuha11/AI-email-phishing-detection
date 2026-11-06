
import os
import json
import sqlite3
import secrets
import logging
from pathlib import Path

from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers import (
    options_to_json,
    base64url_to_bytes,
    bytes_to_base64url,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "auth_users.sqlite3"
SECRET_PATH = BASE_DIR / ".flask_session_secret"

RP_ID = "localhost"
RP_NAME = "SmartMail Security"

ALLOWED_ORIGINS = {
    "https://localhost:5173",
    "https://localhost:5175",
    "https://127.0.0.1:5173",
    "https://127.0.0.1:5175",
}

auth_bp = Blueprint("auth_api", __name__)


def get_expected_origin():
    origin = request.headers.get("Origin", "").rstrip("/")

    if origin not in ALLOWED_ORIGINS:
        logger.warning("Rejected untrusted WebAuthn origin: %s", origin)
        raise ValueError("Untrusted or missing browser origin.")

    return origin


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    with get_db() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE COLLATE NOCASE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'Active'
            )
        """)

        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(users)"
            ).fetchall()
        }

        if "two_factor_enabled" not in columns:
            connection.execute("""
                ALTER TABLE users
                ADD COLUMN two_factor_enabled INTEGER DEFAULT 0
            """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS passkey_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                credential_id BLOB UNIQUE NOT NULL,
                public_key BLOB NOT NULL,
                sign_count INTEGER DEFAULT 0,
                transports TEXT DEFAULT '[]',
                device_name TEXT DEFAULT 'Windows Hello',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id)
                    REFERENCES users(user_id)
                    ON DELETE CASCADE
            )
        """)

        connection.commit()


def get_secret_key():
    if SECRET_PATH.exists():
        return SECRET_PATH.read_text(
            encoding="utf-8"
        ).strip()

    secret = secrets.token_hex(32)

    SECRET_PATH.write_text(
        secret,
        encoding="utf-8"
    )

    return secret


def get_current_user():
    user_id = session.get("user_id")

    if not user_id:
        return None

    with get_db() as connection:
        return connection.execute(
            "SELECT * FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()


def user_response(user):
    return {
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "status": user["status"],
        "two_factor_enabled": bool(
            user["two_factor_enabled"]
        ),
    }


def get_request_credential():
    data = request.get_json(silent=True) or {}
    return data.get("credential", data)


def get_user_credentials(user_id):
    with get_db() as connection:
        return connection.execute(
            """
            SELECT * FROM passkey_credentials
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchall()


def credential_descriptors(credentials):
    return [
        PublicKeyCredentialDescriptor(
            id=bytes(row["credential_id"])
        )
        for row in credentials
    ]


# --------------------------------------------------
# REGISTRATION
# --------------------------------------------------

@auth_bp.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    try:
        with get_db() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users
                (name, email, password_hash, status)
                VALUES (?, ?, ?, 'Active')
                """,
                (
                    name,
                    email,
                    generate_password_hash(password),
                )
            )

            connection.commit()

        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "user_id": cursor.lastrowid,
        }), 201

    except sqlite3.IntegrityError:
        logger.exception(
            "Account registration database error"
        )

        return jsonify({
            "success": False,
            "message": "An account with this email already exists."
        }), 409


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@auth_bp.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    with get_db() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if not user or not check_password_hash(
        user["password_hash"], password
    ):
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    if str(user["status"]).strip().lower() != "active":
        return jsonify({
            "success": False,
            "message": "This account is inactive."
        }), 403

    session.clear()
    session["pending_user_id"] = user["user_id"]

    if user["two_factor_enabled"]:
        return jsonify({
            "success": True,
            "requiresPasskey": True,
            "requires_passkey": True,
            "message": "Passkey verification required."
        })

    session["user_id"] = user["user_id"]
    session.pop("pending_user_id", None)

    return jsonify({
        "success": True,
        "user": user_response(user),
        "message": "Login successful."
    })


# --------------------------------------------------
# PASSKEY LOGIN OPTIONS
# --------------------------------------------------

@auth_bp.post("/api/auth/passkey/login/options")
def passkey_login_options():
    user_id = session.get("pending_user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Please enter your email and password first."
        }), 401

    credentials = get_user_credentials(user_id)

    if not credentials:
        return jsonify({
            "success": False,
            "message": "No passkey is registered."
        }), 404

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=credential_descriptors(
            credentials
        ),
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    session["login_challenge"] = bytes_to_base64url(
        options.challenge
    )

    return jsonify(
        json.loads(options_to_json(options))
    )


# --------------------------------------------------
# PASSKEY LOGIN VERIFICATION
# --------------------------------------------------

@auth_bp.post("/api/auth/passkey/login/verify")
def passkey_login_verify():
    user_id = session.get("pending_user_id")
    challenge = session.get("login_challenge")

    if not user_id or not challenge:
        return jsonify({
            "success": False,
            "message": "Login session expired. Please log in again."
        }), 401

    credential = get_request_credential()

    try:
        credential_id = base64url_to_bytes(
            credential["id"]
        )

        with get_db() as connection:
            stored = connection.execute(
                """
                SELECT * FROM passkey_credentials
                WHERE user_id = ? AND credential_id = ?
                """,
                (user_id, credential_id)
            ).fetchone()

        if not stored:
            raise ValueError("Unknown passkey.")

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(
                challenge
            ),
            expected_rp_id=RP_ID,
            expected_origin=get_expected_origin(),
            credential_public_key=bytes(
                stored["public_key"]
            ),
            credential_current_sign_count=stored["sign_count"],
            require_user_verification=False,
        )

        with get_db() as connection:
            connection.execute(
                """
                UPDATE passkey_credentials
                SET sign_count = ?
                WHERE id = ?
                """,
                (
                    verification.new_sign_count,
                    stored["id"],
                )
            )
            connection.commit()

        with get_db() as connection:
            user = connection.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            ).fetchone()

        if not user:
            raise ValueError("Account no longer exists.")

        session.clear()
        session["user_id"] = user_id

        return jsonify({
            "success": True,
            "user": user_response(user),
            "message": "Passkey verification successful."
        })

    except Exception as error:
        logger.exception(
            "Passkey login verification failed"
        )

        return jsonify({
            "success": False,
            "message": "Passkey verification failed.",
            "error": str(error)
        }), 401


# --------------------------------------------------
# 2FA STATUS
# --------------------------------------------------

@auth_bp.get("/api/auth/2fa/status")
def two_factor_status():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    credentials = get_user_credentials(
        user["user_id"]
    )

    return jsonify({
        "success": True,
        "enabled": bool(user["two_factor_enabled"]),
        "two_factor_enabled": bool(
            user["two_factor_enabled"]
        ),
        "passkey_registered": len(credentials) > 0,
        "passkey_count": len(credentials),
    })


# --------------------------------------------------
# 2FA ENABLE OPTIONS
# --------------------------------------------------

@auth_bp.post("/api/auth/2fa/enable")
def enable_two_factor():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    credentials = get_user_credentials(
        user["user_id"]
    )

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(
            user["user_id"]
        ).encode("utf-8"),
        user_name=user["email"],
        user_display_name=user["name"],
        exclude_credentials=credential_descriptors(
            credentials
        ),
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    session["2fa_registration_challenge"] = (
        bytes_to_base64url(options.challenge)
    )

    return jsonify(
        json.loads(options_to_json(options))
    )


# --------------------------------------------------
# 2FA PASSKEY REGISTRATION VERIFICATION
# --------------------------------------------------

@auth_bp.post("/api/auth/2fa/passkey/register/verify")
def verify_two_factor_passkey():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    challenge = session.get(
        "2fa_registration_challenge"
    )

    if not challenge:
        return jsonify({
            "success": False,
            "message": "Registration session expired. Try again."
        }), 400

    credential = get_request_credential()

    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(
                challenge
            ),
            expected_rp_id=RP_ID,
            expected_origin=get_expected_origin(),
            require_user_verification=False,
        )

        transports = credential.get(
            "response", {}
        ).get("transports", [])

        with get_db() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO passkey_credentials
                (
                    user_id,
                    credential_id,
                    public_key,
                    sign_count,
                    transports,
                    device_name
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user["user_id"],
                    verification.credential_id,
                    verification.credential_public_key,
                    verification.sign_count,
                    json.dumps(transports),
                    "Windows Hello",
                )
            )

            connection.execute(
                """
                UPDATE users
                SET two_factor_enabled = 1
                WHERE user_id = ?
                """,
                (user["user_id"],)
            )

            connection.commit()

        with get_db() as connection:
            updated_user = connection.execute(
                """
                SELECT two_factor_enabled
                FROM users
                WHERE user_id = ?
                """,
                (user["user_id"],)
            ).fetchone()

        if (
            not updated_user
            or not updated_user["two_factor_enabled"]
        ):
            raise RuntimeError(
                "Passkey was processed, but the 2FA database "
                "update could not be confirmed."
            )

        session.pop(
            "2fa_registration_challenge",
            None
        )

        logger.info(
            "2FA passkey successfully registered for user_id=%s",
            user["user_id"]
        )

        return jsonify({
            "success": True,
            "enabled": True,
            "message": "Passkey registered and 2FA enabled."
        })

    except Exception as error:
        logger.exception(
            "2FA passkey registration verification failed "
            "for user_id=%s",
            user["user_id"]
        )

        return jsonify({
            "success": False,
            "message": "Passkey registration verification failed.",
            "error": str(error)
        }), 400


# --------------------------------------------------
# LEGACY PASSKEY REGISTRATION OPTIONS
# --------------------------------------------------

@auth_bp.post("/api/auth/passkey/register/options")
def passkey_register_options():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    credentials = get_user_credentials(
        user["user_id"]
    )

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(
            user["user_id"]
        ).encode("utf-8"),
        user_name=user["email"],
        user_display_name=user["name"],
        exclude_credentials=credential_descriptors(
            credentials
        ),
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    session["passkey_registration_challenge"] = (
        bytes_to_base64url(options.challenge)
    )

    return jsonify(
        json.loads(options_to_json(options))
    )


# --------------------------------------------------
# LEGACY PASSKEY REGISTRATION VERIFICATION
# --------------------------------------------------

@auth_bp.post("/api/auth/passkey/register/verify")
def passkey_register_verify():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    challenge = session.get(
        "passkey_registration_challenge"
    )

    if not challenge:
        return jsonify({
            "success": False,
            "message": "Registration session expired."
        }), 400

    credential = get_request_credential()

    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(
                challenge
            ),
            expected_rp_id=RP_ID,
            expected_origin=get_expected_origin(),
            require_user_verification=False,
        )

        with get_db() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO passkey_credentials
                (
                    user_id,
                    credential_id,
                    public_key,
                    sign_count,
                    transports,
                    device_name
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user["user_id"],
                    verification.credential_id,
                    verification.credential_public_key,
                    verification.sign_count,
                    json.dumps(
                        credential.get(
                            "response", {}
                        ).get("transports", [])
                    ),
                    "Windows Hello",
                )
            )
            connection.commit()

        session.pop(
            "passkey_registration_challenge",
            None
        )

        return jsonify({
            "success": True,
            "message": "Passkey registered successfully."
        })

    except Exception as error:
        logger.exception(
            "Legacy passkey registration verification failed"
        )

        return jsonify({
            "success": False,
            "message": "Passkey registration failed.",
            "error": str(error)
        }), 400


# --------------------------------------------------


# --------------------------------------------------
# ENABLE 2FA USING AN EXISTING PASSKEY
# --------------------------------------------------

@auth_bp.post("/api/auth/2fa/passkey/enable/options")
def enable_two_factor_passkey_options():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Please log in again."
        }), 401

    credentials = get_user_credentials(user["user_id"])

    if not credentials:
        return jsonify({
            "success": False,
            "message": "No registered passkey was found."
        }), 400

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=credential_descriptors(credentials),
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    session["2fa_enable_challenge"] = bytes_to_base64url(
        options.challenge
    )

    return jsonify(json.loads(options_to_json(options)))


@auth_bp.post("/api/auth/2fa/passkey/enable/verify")
def enable_two_factor_passkey_verify():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Please log in again."
        }), 401

    challenge = session.get("2fa_enable_challenge")

    if not challenge:
        return jsonify({
            "success": False,
            "message": "Verification expired. Please try again."
        }), 400

    try:
        credential = get_request_credential()

        if not isinstance(credential, dict):
            raise ValueError("Invalid passkey response.")

        credential_id_text = (
            credential.get("id") or credential.get("rawId")
        )

        if not credential_id_text:
            raise ValueError("Missing credential ID.")

        credential_id = base64url_to_bytes(credential_id_text)

        with get_db() as connection:
            stored_credential = connection.execute(
                """
                SELECT id, credential_id, public_key, sign_count
                FROM passkey_credentials
                WHERE user_id = ? AND credential_id = ?
                """,
                (user["user_id"], credential_id)
            ).fetchone()

        if not stored_credential:
            raise ValueError("Registered passkey not found.")

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge),
            expected_rp_id=RP_ID,
            expected_origin=get_expected_origin(),
            credential_public_key=bytes(
                stored_credential["public_key"]
            ),
            credential_current_sign_count=int(
                stored_credential["sign_count"]
            ),
            require_user_verification=True,
        )

        with get_db() as connection:
            connection.execute(
                """
                UPDATE passkey_credentials
                SET sign_count = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    verification.new_sign_count,
                    stored_credential["id"],
                    user["user_id"]
                )
            )

            connection.execute(
                """
                UPDATE users
                SET two_factor_enabled = 1
                WHERE user_id = ?
                """,
                (user["user_id"],)
            )

            connection.commit()

        session.pop("2fa_enable_challenge", None)

        return jsonify({
            "success": True,
            "enabled": True,
            "message": "Two-factor authentication enabled successfully."
        })

    except Exception:
        logger.exception("Existing passkey verification for 2FA failed")
        session.pop("2fa_enable_challenge", None)

        return jsonify({
            "success": False,
            "message": "Passkey verification failed. Please try again."
        }), 400


# DISABLE 2FA
# --------------------------------------------------

@auth_bp.post("/api/auth/2fa/disable")
def disable_two_factor():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}
    password = str(data.get("password", ""))

    if not password or not check_password_hash(
        user["password_hash"], password
    ):
        return jsonify({
            "success": False,
            "message": "Enter your current password to disable 2FA."
        }), 403

    with get_db() as connection:
        connection.execute(
            """
            UPDATE users
            SET two_factor_enabled = 0
            WHERE user_id = ?
            """,
            (user["user_id"],)
        )
        connection.commit()

    return jsonify({
        "success": True,
        "enabled": False,
        "message": "Two-factor authentication disabled."
    })


# --------------------------------------------------
# CHANGE PASSWORD
# --------------------------------------------------

@auth_bp.post("/api/auth/change-password")
def change_password():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}

    current_password = str(
        data.get("currentPassword", "")
    )

    new_password = str(
        data.get("newPassword", "")
    )

    if not check_password_hash(
        user["password_hash"],
        current_password
    ):
        return jsonify({
            "success": False,
            "message": "Current password is incorrect."
        }), 403

    if len(new_password) < 8:
        return jsonify({
            "success": False,
            "message": "New password must contain at least 8 characters."
        }), 400

    with get_db() as connection:
        connection.execute(
            """
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ?
            """,
            (
                generate_password_hash(new_password),
                user["user_id"],
            )
        )
        connection.commit()

    return jsonify({
        "success": True,
        "message": "Password changed successfully."
    })


# --------------------------------------------------
# CURRENT USER
# --------------------------------------------------

@auth_bp.get("/api/auth/me")
def me():
    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "Not authenticated."
        }), 401

    return jsonify({
        "success": True,
        "user": user_response(user)
    })


# --------------------------------------------------
# LOGOUT
# --------------------------------------------------

@auth_bp.post("/api/auth/logout")
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# --------------------------------------------------
# INITIALIZE AUTHENTICATION
# --------------------------------------------------

def init_auth(app):
    app.secret_key = get_secret_key()

    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=True,
    )

    initialize_database()
    app.register_blueprint(auth_bp)
