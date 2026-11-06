
"""
SMARTMAIL POC6: EMAIL FLOODING DETECTION

Purpose:
- Detect unusually high email volume from a sender.
- Identify repeated or similar email content.
- Report potential flooding with reasons and risk levels.
- Never move, delete, or send real emails.

This version accepts email records from a list or JSON file.
Gmail integration will be connected after this detection logic is tested.
"""

import json
import re
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path


# ---------------- CONFIGURATION ----------------

TIME_WINDOW_MINUTES = 10
MIN_EMAILS_FROM_SENDER = 5
MIN_SIMILAR_EMAILS = 3
SIMILARITY_THRESHOLD = 0.80

# These are starting thresholds, not scientifically validated values.
# We'll tune them using representative legitimate and flooding emails.


# ---------------- NORMALIZATION ----------------

def normalize_text(value):
    """Normalize text for comparison without removing its meaning."""
    value = str(value or "").lower()
    value = re.sub(r"https?://\S+|www\.\S+", " URL ", value)
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b", " EMAIL ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_subject(subject):
    """Ignore common reply/forward prefixes."""
    subject = normalize_text(subject)

    while True:
        previous = subject
        subject = re.sub(r"^(re|fw|fwd)\s*:\s*", "", subject)
        if subject == previous:
            break

    return subject


def similarity(text_a, text_b):
    """Return a similarity value from 0 to 1."""
    a = normalize_text(text_a)
    b = normalize_text(text_b)

    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a, b).ratio()


# ---------------- INPUT VALIDATION ----------------

def parse_timestamp(value):
    """Accept datetime objects or ISO-format timestamp strings."""
    if isinstance(value, datetime):
        return value

    if not value:
        raise ValueError("Email is missing its timestamp.")

    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed


def prepare_emails(emails):
    """Validate and standardize email records."""
    prepared = []

    for index, item in enumerate(emails, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Email record {index} must be an object.")

        sender = str(item.get("sender", "")).strip()
        subject = str(item.get("subject", "")).strip()
        body = str(item.get("body", "")).strip()
        email_id = str(item.get("id", index)).strip()

        if not sender:
            raise ValueError(f"Email record {index} has no sender.")

        if not email_id:
            raise ValueError(f"Email record {index} has no ID.")

        prepared.append({
            "id": email_id,
            "sender": sender,
            "sender_key": sender.lower(),
            "subject": subject,
            "body": body,
            "timestamp": parse_timestamp(item.get("timestamp")),
        })

    return prepared


# ---------------- FLOODING ANALYSIS ----------------

def analyze_email_flooding(emails):
    """
    Analyse a batch of emails.

    A sender's volume is evaluated within a rolling time window.
    Similarity is evaluated against other messages from that sender.

    High volume alone does not automatically establish that email is spam.
    """

    emails = prepare_emails(emails)
    by_sender = defaultdict(list)

    for email in emails:
        by_sender[email["sender_key"]].append(email)

    results = {}

    for sender_key, messages in by_sender.items():
        messages.sort(key=lambda item: item["timestamp"])

        for current in messages:
            window_start = current["timestamp"] - timedelta(
                minutes=TIME_WINDOW_MINUTES
            )

            window_messages = [
                message for message in messages
                if window_start <= message["timestamp"] <= current["timestamp"]
            ]

            similar_messages = []

            for candidate in window_messages:
                subject_score = similarity(
                    current["subject"], candidate["subject"]
                )

                body_score = similarity(
                    current["body"], candidate["body"]
                )

                # Similar subjects OR similar bodies can indicate repetition.
                # Empty bodies are not considered similar.
                same_subject = (
                    bool(normalize_subject(current["subject"]))
                    and subject_score >= SIMILARITY_THRESHOLD
                )

                same_body = (
                    bool(normalize_text(current["body"]))
                    and body_score >= SIMILARITY_THRESHOLD
                )

                if candidate["id"] == current["id"] or same_subject or same_body:
                    similar_messages.append(candidate)

            volume_count = len(window_messages)
            repeated_count = len(similar_messages)

            reasons = []
            risk_score = 0

            if volume_count >= MIN_EMAILS_FROM_SENDER:
                reasons.append(
                    f"{volume_count} emails from this sender "
                    f"within {TIME_WINDOW_MINUTES} minutes"
                )
                risk_score += 35

            if repeated_count >= MIN_SIMILAR_EMAILS:
                reasons.append(
                    f"{repeated_count} emails have similar subjects "
                    "or message bodies"
                )
                risk_score += 45

            # Extra evidence when the sender sends many similar emails.
            if (
                volume_count >= MIN_EMAILS_FROM_SENDER
                and repeated_count >= MIN_SIMILAR_EMAILS
            ):
                risk_score += 20

            risk_score = min(risk_score, 100)

            if risk_score >= 80:
                risk_level = "HIGH"
                classification = "SUSPICIOUS FLOODING"
            elif risk_score >= 35:
                risk_level = "MEDIUM"
                classification = "POSSIBLE FLOODING"
            else:
                risk_level = "LOW"
                classification = "NO FLOODING PATTERN DETECTED"

            results[current["id"]] = {
                "id": current["id"],
                "sender": current["sender"],
                "subject": current["subject"],
                "timestamp": current["timestamp"].isoformat(),
                "emails_in_window": volume_count,
                "similar_emails_in_window": repeated_count,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "classification": classification,
                "reasons": reasons or ["No configured flooding pattern detected"],
                "action": "REPORT ONLY - NO EMAIL WAS MOVED",
            }

    return sorted(results.values(), key=lambda item: item["id"])


# ---------------- REPORTING ----------------

def print_report(results):
    print("\n" + "=" * 72)
    print("SMARTMAIL POC6 - EMAIL FLOODING DETECTION")
    print("=" * 72)

    if not results:
        print("No email records were supplied.")
        return

    for result in results:
        print(f"\nEmail ID: {result['id']}")
        print(f"Sender: {result['sender']}")
        print(f"Subject: {result['subject']}")
        print(f"Timestamp: {result['timestamp']}")
        print(f"Emails in time window: {result['emails_in_window']}")
        print(
            "Similar emails in time window: "
            f"{result['similar_emails_in_window']}"
        )
        print(
            f"Risk: {result['risk_level']} "
            f"({result['risk_score']}/100)"
        )
        print(f"Result: {result['classification']}")

        for reason in result["reasons"]:
            print(f"  - {reason}")

        print(f"Action: {result['action']}")

    high = sum(r["risk_level"] == "HIGH" for r in results)
    medium = sum(r["risk_level"] == "MEDIUM" for r in results)
    low = sum(r["risk_level"] == "LOW" for r in results)

    print("\n" + "-" * 72)
    print(f"Emails analysed: {len(results)}")
    print(f"High risk: {high}")
    print(f"Medium risk: {medium}")
    print(f"Low risk: {low}")
    print("Safety: Detection only; no email was moved or deleted.")
    print("=" * 72)


# ---------------- SAMPLE TEST DATA ----------------

def make_sample_emails():
    """Create synthetic test messages; these are not real Gmail emails."""
    start = datetime(2026, 10, 19, 10, 0, 0)
    samples = []

    # Repeated promotional emails from one sender.
    for number in range(1, 7):
        samples.append({
            "id": f"promo-{number}",
            "sender": "offers@example.test",
            "subject": "Special offer - limited time",
            "body": (
                "Visit our website for this special offer. "
                "This promotional message is for testing only."
            ),
            "timestamp": (
                start + timedelta(seconds=number * 60)
            ).isoformat(),
        })

    # Several legitimate college emails from the same sender.
    samples.extend([
        {
            "id": "college-1",
            "sender": "college@example.test",
            "subject": "Assignment submission date",
            "body": "Please submit your assignment by Friday.",
            "timestamp": start.isoformat(),
        },
        {
            "id": "college-2",
            "sender": "college@example.test",
            "subject": "Class timetable",
            "body": "The updated timetable is now available.",
            "timestamp": (start + timedelta(minutes=3)).isoformat(),
        },
        {
            "id": "college-3",
            "sender": "college@example.test",
            "subject": "Examination room details",
            "body": "Please check your examination room details.",
            "timestamp": (start + timedelta(minutes=4)).isoformat(),
        },
    ])

    return samples


def main():
    parser = argparse.ArgumentParser(
        description="Analyse email flooding patterns."
    )
    parser.add_argument(
        "--input",
        help="Path to a JSON file containing an array of email records."
    )
    parser.add_argument(
        "--output",
        default="poc6_flooding_report.json",
        help="Where to save the JSON report."
    )
    args = parser.parse_args()

    try:
        if args.input:
            input_path = Path(args.input)

            with input_path.open("r", encoding="utf-8") as file:
                emails = json.load(file)

            if not isinstance(emails, list):
                raise ValueError("The JSON input must contain an array of emails.")
        else:
            print("Running synthetic sample tests, not analysing real Gmail.")
            emails = make_sample_emails()

        results = analyze_email_flooding(emails)
        print_report(results)

        output_path = Path(args.output)
        with output_path.open("w", encoding="utf-8") as file:
            json.dump(results, file, indent=2, ensure_ascii=False)

        print(f"\nReport saved to: {output_path.resolve()}")

    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"\nError: {error}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
