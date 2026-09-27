import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  MoreVertical,
  Star,
  ShieldCheck,
  Ban,
  AlertTriangle,
  Mail,
  ChevronLeft,
  ChevronDown,
  X,
} from "lucide-react";

type EmailStatus = "Safe" | "Spam" | "Phishing";

type Email = {
  id: number;
  sender: string;
  address: string;
  subject: string;
  preview: string;
  time: string;
  status: EmailStatus;
  unread: boolean;
  starred: boolean;
};

const initialEmails: Email[] = [
  {
    id: 1,
    sender: "Google Security",
    address: "security@google.com",
    subject: "Security alert for your account",
    preview: "We detected a new sign-in to your Google account.",
    time: "10:32 AM",
    status: "Safe",
    unread: true,
    starred: true,
  },
  {
    id: 2,
    sender: "Microsoft 365",
    address: "office@microsoft.com",
    subject: "Your weekly account summary",
    preview: "Here is your weekly summary and recent activity.",
    time: "10:14 AM",
    status: "Safe",
    unread: true,
    starred: false,
  },
  {
    id: 3,
    sender: "Unknown Sender",
    address: "winner@unknown.com",
    subject: "Congratulations! You have won a prize",
    preview: "Claim your exclusive reward before it expires.",
    time: "09:48 AM",
    status: "Spam",
    unread: false,
    starred: false,
  },
  {
    id: 4,
    sender: "Bank Security",
    address: "security@bank-alert.com",
    subject: "Verify your account information",
    preview: "Your account requires immediate verification.",
    time: "09:15 AM",
    status: "Phishing",
    unread: true,
    starred: false,
  },
  {
    id: 5,
    sender: "College Administration",
    address: "admin@college.edu",
    subject: "Important notice for students",
    preview: "Please read the following important announcement.",
    time: "08:52 AM",
    status: "Safe",
    unread: false,
    starred: false,
  },
  {
    id: 6,
    sender: "Shopping Updates",
    address: "orders@shopping.com",
    subject: "Your order has been shipped",
    preview: "Your recent order is on its way.",
    time: "08:31 AM",
    status: "Safe",
    unread: false,
    starred: true,
  },
  {
    id: 7,
    sender: "Unknown Sender",
    address: "reward@claim-now.com",
    subject: "Claim your exclusive reward now",
    preview: "You have been selected for a special reward.",
    time: "08:05 AM",
    status: "Spam",
    unread: false,
    starred: false,
  },
];

function StatusIcon({ status }: { status: EmailStatus }) {
  if (status === "Safe") {
    return <ShieldCheck size={13} />;
  }

  if (status === "Spam") {
    return <Ban size={13} />;
  }

  return <AlertTriangle size={13} />;
}

function Inbox() {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | EmailStatus>("All");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const filteredEmails = useMemo(() => {
    const query = search.trim().toLowerCase();

    return emails.filter((email) => {
      const matchesFilter =
        filter === "All" || email.status === filter;

      const matchesSearch =
        query === "" ||
        email.sender.toLowerCase().includes(query) ||
        email.address.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.preview.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [emails, search, filter]);

  const toggleStar = (id: number) => {
    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === id
          ? { ...email, starred: !email.starred }
          : email
      )
    );
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);

    setEmails((currentEmails) =>
      currentEmails.map((item) =>
        item.id === email.id
          ? { ...item, unread: false }
          : item
      )
    );
  };

  const refreshInbox = () => {
    setEmails(initialEmails);
    setSearch("");
    setFilter("All");
    setShowFilter(false);
    setSelectedEmail(null);
  };

  if (selectedEmail) {
    return (
      <main className="inbox-page">
        <header className="inbox-topbar">
          <div className="inbox-title-area">
            <button
              className="inbox-back-btn"
              onClick={() => setSelectedEmail(null)}
              title="Back to inbox"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="inbox-title-icon">
              <Mail size={21} />
            </div>

            <div>
              <h1>Inbox</h1>
              <p>Email details</p>
            </div>
          </div>

          <button
            className="inbox-icon-btn"
            onClick={() => setSelectedEmail(null)}
            title="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <section className="email-detail-card">
          <div className="email-detail-header">
            <div className="detail-avatar">
              {selectedEmail.sender.charAt(0)}
            </div>

            <div className="detail-sender">
              <h2>{selectedEmail.sender}</h2>
              <span>{selectedEmail.address}</span>
            </div>

            <span
              className={`inbox-status ${selectedEmail.status.toLowerCase()}`}
            >
              <StatusIcon status={selectedEmail.status} />
              {selectedEmail.status}
            </span>
          </div>

          <div className="email-detail-content">
            <h2>{selectedEmail.subject}</h2>

            <p className="detail-time">
              Today at {selectedEmail.time}
            </p>

            <div className="detail-divider"></div>

            <p className="detail-body">
              {selectedEmail.preview}
            </p>

            <p className="detail-body">
              This email has been analyzed by the SmartMail security
              system. The AI engine checks the message using language
              detection, NLP analysis, machine-learning
              classification, and risk scoring.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="inbox-page">
      <header className="inbox-topbar">
        <div className="inbox-title-area">
          <div className="inbox-title-icon">
            <Mail size={21} />
          </div>

          <div>
            <h1>Inbox</h1>
            <p>All your emails in one secure place</p>
          </div>
        </div>

        <div className="inbox-actions">
          <button
            className="inbox-icon-btn"
            onClick={refreshInbox}
            title="Refresh inbox"
            type="button"
          >
            <RefreshCw size={18} />
          </button>

          <button
            className="inbox-icon-btn"
            title="More options"
            type="button"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <section className="inbox-toolbar">
        <div className="inbox-search">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emails..."
          />

          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
              title="Clear search"
              type="button"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filter-wrapper">
          <button
            className="filter-btn"
            onClick={() => setShowFilter((current) => !current)}
            type="button"
          >
            <SlidersHorizontal size={16} />
            Filter
            <ChevronDown size={14} />
          </button>

          {showFilter && (
            <div className="filter-menu">
              {(["All", "Safe", "Spam", "Phishing"] as const).map(
                (option) => (
                  <button
                    key={option}
                    className={
                      filter === option
                        ? "filter-option active"
                        : "filter-option"
                    }
                    onClick={() => {
                      setFilter(option);
                      setShowFilter(false);
                    }}
                    type="button"
                  >
                    {option}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="inbox-summary">
        <div>
          <strong>All Mail</strong>
          <span>
            {filteredEmails.length}{" "}
            {filteredEmails.length === 1 ? "email" : "emails"}
          </span>
        </div>

        <div className="inbox-summary-right">
          <span>
            <span className="summary-dot safe"></span>
            Safe
          </span>

          <span>
            <span className="summary-dot spam"></span>
            Spam
          </span>

          <span>
            <span className="summary-dot phishing"></span>
            Phishing
          </span>
        </div>
      </section>

      <section className="inbox-list">
        {filteredEmails.length === 0 ? (
          <div className="empty-inbox">
            <Search size={28} />
            <h2>No emails found</h2>
            <p>Try a different search or filter.</p>
          </div>
        ) : (
          filteredEmails.map((email) => (
            <article
              className={
                email.unread
                  ? "inbox-email unread"
                  : "inbox-email"
              }
              key={email.id}
              onClick={() => openEmail(email)}
            >
              <div
                className="email-checkbox"
                onClick={(event) => event.stopPropagation()}
              >
                <input type="checkbox" />
              </div>

              <button
                className={
                  email.starred
                    ? "star-btn starred"
                    : "star-btn"
                }
                onClick={(event) => {
                  event.stopPropagation();
                  toggleStar(email.id);
                }}
                title="Star email"
                type="button"
              >
                <Star
                  size={18}
                  fill={email.starred ? "currentColor" : "none"}
                />
              </button>

              <div className="inbox-sender">
                <strong>{email.sender}</strong>
                <span>{email.address}</span>
              </div>

              <div className="inbox-message">
                <strong>{email.subject}</strong>
                <span> — {email.preview}</span>
              </div>

              <div
                className={`inbox-status ${email.status.toLowerCase()}`}
              >
                <StatusIcon status={email.status} />
                {email.status}
              </div>

              <span className="inbox-time">{email.time}</span>

              <button
                className="email-more-btn"
                onClick={(event) => event.stopPropagation()}
                title="Email options"
                type="button"
              >
                <MoreVertical size={17} />
              </button>
            </article>
          ))
        )}
      </section>

      <footer className="inbox-footer">
        <span>
          Showing {filteredEmails.length} of {emails.length} emails
        </span>

        {filter !== "All" && (
          <button
            className="clear-filter-btn"
            onClick={() => setFilter("All")}
            type="button"
          >
            Clear filter
          </button>
        )}
      </footer>
    </main>
  );
}

export default Inbox;