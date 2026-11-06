
import email
import imaplib
import os
import re
from email.header import decode_header
from email.utils import parseaddr


# ---------------------------------------------------------
# GMAIL CONFIGURATION
# ---------------------------------------------------------

IMAP_SERVER = "imap.gmail.com"
IMAP_TIMEOUT = 30

BATCH_SIZE = 251
MAX_INBOX_EMAILS = 251

GMAIL_SEARCH_CRITERIA = 'X-GM-RAW "category:primary"'

# Filtering rules for SmartMail display only.
SHAMA_EMAIL_ADDRESS = "shamaparveen0818@gmail.com"
TRANSACTION_EMAIL_ADDRESS = "canarabank@canarabank.com"
TRANSACTION_SUBJECT_KEYWORD = "transaction alert"


# ---------------------------------------------------------
# CONNECT TO GMAIL
# ---------------------------------------------------------

def connect_gmail():
    """Connect to Gmail using the configured app credentials."""
    account = os.environ.get("SMARTMAIL_EMAIL")
    password = os.environ.get("SMARTMAIL_APP_PASSWORD")

    if not account or not password:
        raise RuntimeError(
            "Set SMARTMAIL_EMAIL and SMARTMAIL_APP_PASSWORD "
            "as environment variables before connecting Gmail."
        )

    connection = imaplib.IMAP4_SSL(
        IMAP_SERVER,
        timeout=IMAP_TIMEOUT,
    )

    try:
        connection.login(account, password)
        return connection

    except Exception:
        try:
            connection.logout()
        except Exception:
            pass
        raise


# ---------------------------------------------------------
# EMAIL HEADER HELPERS
# ---------------------------------------------------------

def decode_mime_header(value):
    """Decode an email header into readable text."""
    if not value:
        return ""

    parts = decode_header(value)
    result = []

    for part, encoding in parts:
        if isinstance(part, bytes):
            result.append(
                part.decode(
                    encoding or "utf-8",
                    errors="replace",
                )
            )
        else:
            result.append(part)

    return "".join(result)


# ---------------------------------------------------------
# EMAIL BODY HELPERS
# ---------------------------------------------------------

def _decode_payload(part):
    """Decode a message part safely into text."""
    payload = part.get_payload(decode=True)

    if not payload:
        return ""

    charset = part.get_content_charset() or "utf-8"

    try:
        return payload.decode(
            charset,
            errors="replace",
        )
    except (LookupError, UnicodeError):
        return payload.decode(
            "utf-8",
            errors="replace",
        )


def extract_email_bodies(message):
    """Extract readable plain-text and HTML bodies."""
    body_text = []
    body_html = []

    if message.is_multipart():
        for part in message.walk():
            if part.is_multipart():
                continue

            disposition = str(
                part.get("Content-Disposition", "")
            ).lower()

            if "attachment" in disposition:
                continue

            content_type = part.get_content_type()

            if content_type == "text/plain":
                text = _decode_payload(part)

                if text:
                    body_text.append(text)

            elif content_type == "text/html":
                html = _decode_payload(part)

                if html:
                    body_html.append(html)

    else:
        content_type = message.get_content_type()
        content = _decode_payload(message)

        if content_type == "text/html":
            body_html.append(content)
        else:
            body_text.append(content)

    return "\n".join(body_text), "\n".join(body_html)


def get_email_preview(message):
    """Return a short text preview without loading attachments."""
    body_text, _ = extract_email_bodies(message)

    if body_text.strip():
        return body_text.strip()[:300]

    return "(No text preview available)"


# ---------------------------------------------------------
# SMARTMAIL INBOX DISPLAY FILTER
# ---------------------------------------------------------

def filter_emails_for_smartmail(emails):
    """
    Before the first Shama Parveen email, keep:
    - The newest Canara Bank transaction alert only.
    - All Nykaa emails.
    - All Airtel emails.

    Keep Shama Parveen and every email after her unchanged.

    This only filters SmartMail's returned list.
    It does not delete or modify Gmail messages.
    """

    if not emails:
        return emails

    # Find the first Shama Parveen email.
    shama_index = None

    for index, item in enumerate(emails):
        address = str(
            item.get("address", "")
        ).strip().lower()

        sender = str(
            item.get("sender", "")
        ).strip().lower()

        if (
            address == SHAMA_EMAIL_ADDRESS
            or sender == "shama parveen"
            or sender == SHAMA_EMAIL_ADDRESS
        ):
            shama_index = index
            break

    # Safety: if Shama's email is not found,
    # do not remove anything.
    if shama_index is None:
        print(
            "POC1 FILTER: Shama Parveen boundary not found. "
            "Keeping the original email list unchanged.",
            flush=True,
        )
        return emails

    # Emails before Shama.
    emails_before_shama = emails[:shama_index]

    # Preserve all Nykaa and Airtel emails.
    protected_emails = []

    # Keep only the newest matching Canara transaction.
    newest_transaction = None

    for item in emails_before_shama:

        address = str(
            item.get("address", "")
        ).strip().lower()

        sender = str(
            item.get("sender", "")
        ).strip().lower()

        subject = str(
            item.get("subject", "")
        ).strip().lower()

        searchable_text = (
            address + " " + sender + " " + subject
        )

        # Preserve Nykaa emails.
        is_nykaa = "nykaa" in searchable_text

        # Preserve Airtel emails.
        is_airtel = "airtel" in searchable_text

        if is_nykaa or is_airtel:
            protected_emails.append(item)
            continue

        # Identify Canara transaction alerts.
        is_transaction = (
            address == TRANSACTION_EMAIL_ADDRESS
            and TRANSACTION_SUBJECT_KEYWORD in subject
        )

        if (
            is_transaction
            and newest_transaction is None
        ):
            newest_transaction = item

    # Keep Shama and every email below her unchanged.
    shama_and_remaining_emails = emails[shama_index:]

    filtered_emails = []

    # Keep the one newest transaction email, if found.
    if newest_transaction is not None:
        filtered_emails.append(newest_transaction)

    # Keep all protected Nykaa and Airtel emails.
    filtered_emails.extend(protected_emails)

    # Keep all emails from Shama onward.
    filtered_emails.extend(
        shama_and_remaining_emails
    )

    removed_count = (
        len(emails) - len(filtered_emails)
    )

    print(
        "POC1 FILTER: SmartMail display filtering completed. "
        f"Kept {len(filtered_emails)} emails; "
        f"removed {removed_count} emails before Shama. "
        f"Nykaa/Airtel preserved: {len(protected_emails)}. "
        f"Canara transaction retained: "
        f"{newest_transaction.get('id') if newest_transaction else 'None found'}.",
        flush=True,
    )

    return filtered_emails


# ---------------------------------------------------------
# IMAP RESPONSE PARSING
# ---------------------------------------------------------

def _extract_fetch_metadata(message_data):
    """Extract UID, flags, and raw header bytes from an IMAP response."""
    records = {}

    for item in message_data or []:
        if not isinstance(item, tuple) or len(item) < 2:
            continue

        metadata, raw_headers = item[0], item[1]

        if not isinstance(metadata, bytes):
            continue

        metadata_text = metadata.decode(
            "utf-8",
            errors="replace",
        )

        uid_match = re.search(
            r"\bUID\s+(\d+)\b",
            metadata_text,
        )

        if not uid_match:
            continue

        uid = uid_match.group(1)

        flags_match = re.search(
            r"\bFLAGS\s+\(([^)]*)\)",
            metadata_text,
        )

        flags_text = (
            flags_match.group(1)
            if flags_match
            else ""
        )

        if isinstance(raw_headers, bytes):
            records[uid] = {
                "headers": raw_headers,
                "flags": flags_text,
            }

    return records


# ---------------------------------------------------------
# POC 1 - FETCH GMAIL PRIMARY READ/UNREAD EMAILS
# ---------------------------------------------------------

def fetch_read_unread_emails():
    """
    Fetch Gmail Primary email headers and read/unread flags.

    Apply SmartMail display filtering after fetching:
    - Keep the newest Canara Bank transaction before Shama.
    - Preserve all Nykaa and Airtel emails before Shama.
    - Keep Shama and all emails below her.
    """

    connection = None
    emails = []

    try:
        print(
            "POC1 DEBUG: Connecting to Gmail...",
            flush=True,
        )

        connection = connect_gmail()

        status, _ = connection.select(
            "INBOX",
            readonly=True,
        )

        if status != "OK":
            raise RuntimeError(
                "Could not open the Gmail Inbox."
            )

        # Search Gmail Primary emails.
        status, data = connection.uid(
            "search",
            None,
            GMAIL_SEARCH_CRITERIA,
        )

        if status != "OK":
            raise RuntimeError(
                "Could not retrieve Gmail Primary emails. "
                "Check whether Gmail supports the category search."
            )

        if not data or not data[0]:
            print(
                "POC1 DEBUG: No Gmail Primary emails found.",
                flush=True,
            )
            return []

        # Newest UIDs first.
        all_uids = list(
            reversed(data[0].split())
        )

        total_primary_uids = len(all_uids)

        # Limit before fetching headers.
        selected_uids = all_uids[:MAX_INBOX_EMAILS]
        selected_count = len(selected_uids)

        print(
            f"POC1 DEBUG: Found {total_primary_uids} "
            f"Gmail Primary emails. Fetching newest "
            f"{selected_count} in batches of {BATCH_SIZE}...",
            flush=True,
        )

        for start in range(
            0,
            selected_count,
            BATCH_SIZE,
        ):

            uid_batch = selected_uids[
                start:start + BATCH_SIZE
            ]

            uid_set = b",".join(uid_batch)

            try:
                status, message_data = connection.uid(
                    "fetch",
                    uid_set,
                    "(UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])",
                )

                if status != "OK":
                    print(
                        f"POC1 DEBUG: Batch starting "
                        f"at {start} failed; continuing.",
                        flush=True,
                    )
                    continue

                batch_records = _extract_fetch_metadata(
                    message_data
                )

                for uid_bytes in uid_batch:

                    uid = uid_bytes.decode(
                        "ascii",
                        errors="ignore",
                    )

                    record = batch_records.get(uid)

                    if not record:
                        continue

                    try:
                        message = email.message_from_bytes(
                            record["headers"]
                        )

                        flags_text = record["flags"]

                        unread = (
                            "\\Seen"
                            not in flags_text.split()
                        )

                        sender_name, sender_address = parseaddr(
                            decode_mime_header(
                                message.get("From", "")
                            )
                        )

                        emails.append({
                            "id": uid,
                            "sender": (
                                sender_name
                                or sender_address
                                or "Unknown sender"
                            ),
                            "address": sender_address,
                            "subject": decode_mime_header(
                                message.get(
                                    "Subject",
                                    "(No subject)",
                                )
                            ),
                            "preview": (
                                "Open email to view its "
                                "message preview."
                            ),
                            "time": decode_mime_header(
                                message.get("Date", "")
                            ),
                            "unread": unread,
                            "readStatus": (
                                "Unread" if unread else "Read"
                            ),
                        })

                    except (ValueError, TypeError) as exc:
                        print(
                            f"POC1 DEBUG: Skipping "
                            f"UID {uid}: {exc}",
                            flush=True,
                        )

                processed = min(
                    start + len(uid_batch),
                    selected_count,
                )

                print(
                    f"POC1 DEBUG: Processed "
                    f"{processed}/{selected_count} "
                    f"selected Primary UIDs; collected "
                    f"{len(emails)} emails.",
                    flush=True,
                )

            except (
                imaplib.IMAP4.abort,
                TimeoutError,
                OSError,
            ) as exc:

                print(
                    "POC1 DEBUG: Connection "
                    f"interrupted during batch: {exc}",
                    flush=True,
                )
                break

            except imaplib.IMAP4.error as exc:

                print(
                    f"POC1 DEBUG: IMAP batch error: {exc}",
                    flush=True,
                )
                continue

        print(
            f"POC1 DEBUG: Fetched {len(emails)} "
            "email headers before SmartMail filtering.",
            flush=True,
        )

        # Apply display filtering only after fetching
        # the actual Gmail messages.
        emails = filter_emails_for_smartmail(emails)

        print(
            f"POC1 DEBUG: Returning {len(emails)} "
            "emails to SmartMail.",
            flush=True,
        )

        return emails

    finally:
        if connection is not None:
            try:
                connection.logout()
            except Exception:
                pass


# ---------------------------------------------------------
# FETCH FULL CONTENT OF ONE EMAIL
# ---------------------------------------------------------

def fetch_email_content(message_uid):
    """Fetch the full content of one email using its Gmail UID."""

    if not message_uid or not str(message_uid).isdigit():
        raise ValueError("Invalid email ID.")

    connection = None

    try:
        connection = connect_gmail()

        status, _ = connection.select(
            "INBOX",
            readonly=True,
        )

        if status != "OK":
            raise RuntimeError(
                "Could not open the Gmail Inbox."
            )

        status, message_data = connection.uid(
            "fetch",
            str(message_uid).encode("ascii"),
            "(BODY.PEEK[])",
        )

        if status != "OK":
            raise RuntimeError(
                "Could not retrieve this email."
            )

        raw_message = next(
            (
                item[1]
                for item in message_data or []
                if isinstance(item, tuple)
                and len(item) > 1
                and isinstance(item[1], bytes)
            ),
            None,
        )

        if not raw_message:
            raise RuntimeError(
                "Email content was not found."
            )

        message = email.message_from_bytes(
            raw_message
        )

        sender_name, sender_address = parseaddr(
            decode_mime_header(
                message.get("From", "")
            )
        )

        body_text, body_html = extract_email_bodies(
            message
        )

        return {
            "id": str(message_uid),
            "sender": (
                sender_name
                or sender_address
                or "Unknown sender"
            ),
            "address": sender_address,
            "subject": decode_mime_header(
                message.get(
                    "Subject",
                    "(No subject)",
                )
            ),
            "time": decode_mime_header(
                message.get("Date", "")
            ),
            "preview": (
                body_text[:300]
                or "(No text preview available)"
            ),
            "bodyText": body_text,
            "bodyHtml": body_html,
        }

    finally:
        if connection is not None:
            try:
                connection.logout()
            except Exception:
                pass
