import imaplib

EMAIL_ACCOUNT = "zuhasamrin5@gmail.com"
EMAIL_PASSWORD = "dtksmzoclsrrmrmi"

print("Account:", EMAIL_ACCOUNT)
print("Password length:", len(EMAIL_PASSWORD))
print("Has spaces:", " " in EMAIL_PASSWORD)
print("Has quotes:", '"' in EMAIL_PASSWORD or "'" in EMAIL_PASSWORD)
print()

print("Connecting to Gmail...")

mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)

print("SSL connection successful!")

print("Checking Gmail server capabilities...")
print(mail.capability())

print("Trying login...")

mail.login(EMAIL_ACCOUNT, EMAIL_PASSWORD)

print("LOGIN SUCCESSFUL!")

mail.logout()