import csv
from pathlib import Path

from dotenv import load_dotenv
from poc1_email_status import fetch_read_unread_emails

# Load the project's existing Gmail configuration.
load_dotenv()

OUTPUT_FILE = Path(__file__).resolve().parent / "gmail_emails.csv"

COLUMNS = [
    "email_id",
    "sender",
    "subject",
    "preview",
    "time",
    "read_status",
]


def main():
    print("Fetching actual Gmail Inbox emails...")

    # If Gmail fetching fails, stop without creating a fake dataset.
    emails = fetch_read_unread_emails()

    if not emails:
        print("No emails were returned. CSV was not created.")
        return

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=COLUMNS,
            extrasaction="ignore"
        )
        writer.writeheader()

        for item in emails:
            unread = item.get("unread")

            if unread is True:
                read_status = "Unread"
            elif unread is False:
                read_status = "Read"
            else:
                read_status = ""

            writer.writerow({
                "email_id": item.get("id", ""),
                "sender": item.get("address") or item.get("sender", ""),
                "subject": item.get("subject", ""),
                "preview": item.get("preview", ""),
                "time": item.get("time", ""),
                "read_status": read_status,
            })

    print(f"CSV created successfully: {OUTPUT_FILE}")
    print(f"Actual email records exported: {len(emails)}")


if __name__ == "__main__":
    main()
