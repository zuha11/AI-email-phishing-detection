
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Star,
  Mail,
  ChevronLeft,
  Trash2,
  Inbox as InboxIcon,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Send,
  Save,
  LoaderCircle,
} from "lucide-react";

type SecurityStatus = "Safe" | "Spam" | "Phishing" | "Unclassified";
type MailFolder = "Inbox" | "Starred" | "Drafts" | "Bin";
type EmailFilter = "All" | "Spam" | "Phishing" | "Unclassified";

export type InboxEmail = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  preview: string;
  time: string;
  status: SecurityStatus;
  body?: string;
  unread?: boolean;
};

type Draft = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  updated_at: string;
};

type InboxProps = {
  emails: InboxEmail[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onOpenEmail: (email: InboxEmail) => Promise<InboxEmail>;
};

const API_BASE = `https://${window.location.hostname}:5000`;
const STARRED_KEY = "smartmail_starred_ids";
const TRASH_KEY = "smartmail_trashed_ids";

function readIds(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export default function Inbox({
  emails,
  loading,
  error,
  onRefresh,
  onOpenEmail,
}: InboxProps) {
  const [folder, setFolder] = useState<MailFolder>("Inbox");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InboxEmail | null>(null);
  const [starred, setStarred] = useState<string[]>(() => readIds(STARRED_KEY));
  const [trashed, setTrashed] = useState<string[]>(() => readIds(TRASH_KEY));
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeMessage, setComposeMessage] = useState("");
  const [composeError, setComposeError] = useState("");

  const loadDrafts = async () => {
    setDraftsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/mail/drafts`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load drafts.");
      }

      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (err) {
      console.error("Draft loading failed:", err);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    void loadDrafts();
  }, []);

  useEffect(() => {
    const updateStars = () => setStarred(readIds(STARRED_KEY));
    const updateTrash = () => setTrashed(readIds(TRASH_KEY));

    window.addEventListener("storage", updateStars);
    window.addEventListener("smartmail-starred-updated", updateStars);
    window.addEventListener("smartmail-trash-updated", updateTrash);

    return () => {
      window.removeEventListener("storage", updateStars);
      window.removeEventListener("smartmail-starred-updated", updateStars);
      window.removeEventListener("smartmail-trash-updated", updateTrash);
    };
  }, []);

  const openEmail = async (email: InboxEmail) => {
    setSelected(email);
    setDetailLoading(true);

    try {
      const updated = await onOpenEmail(email);
      setSelected(updated);
    } catch (err) {
      console.error("Unable to open email:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStar = (id: string) => {
    const next = starred.includes(id)
      ? starred.filter((item) => item !== id)
      : [...starred, id];

    setStarred(next);
    localStorage.setItem(STARRED_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("smartmail-starred-updated"));
  };

  const moveToBin = (id: string) => {
    const next = [...new Set([...trashed, id])];
    setTrashed(next);
    localStorage.setItem(TRASH_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("smartmail-trash-updated"));
    setSelected((current) => current?.id === id ? null : current);
  };

  const restore = (id: string) => {
    const next = trashed.filter((item) => item !== id);
    setTrashed(next);
    localStorage.setItem(TRASH_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("smartmail-trash-updated"));
  };

  const startCompose = () => {
    setDraftId(null);
    setRecipient("");
    setSubject("");
    setBody("");
    setComposeError("");
    setComposeMessage("");
    setComposeOpen(true);
  };

  const editDraft = (draft: Draft) => {
    setDraftId(draft.id);
    setRecipient(draft.recipient);
    setSubject(draft.subject);
    setBody(draft.body);
    setComposeError("");
    setComposeMessage("");
    setComposeOpen(true);
  };

  const closeCompose = () => {
    if (composeBusy) return;
    setComposeOpen(false);
    setComposeError("");
    setComposeMessage("");
  };

  const saveDraft = async () => {
    if (!recipient.trim() && !subject.trim() && !body.trim()) {
      setComposeError("Enter something before saving your draft.");
      return;
    }

    setComposeBusy(true);
    setComposeError("");
    setComposeMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/mail/drafts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId,
          recipient,
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not save draft.");
      }

      await loadDrafts();
      setComposeMessage("Draft saved successfully.");
      setDraftId(data.draft.id);
      setFolder("Drafts");
      setComposeOpen(false);
    } catch (err) {
      setComposeError(
        err instanceof Error ? err.message : "Could not save draft."
      );
    } finally {
      setComposeBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!recipient.trim()) {
      setComposeError("Please enter a recipient email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setComposeError("Please enter a valid email address.");
      return;
    }

    setComposeBusy(true);
    setComposeError("");
    setComposeMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/mail/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient.trim(),
          subject,
          body,
          draft_id: draftId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Email could not be sent.");
      }

      await loadDrafts();
      setComposeMessage("Email sent successfully through Gmail.");
      setComposeOpen(false);
      setDraftId(null);
      setRecipient("");
      setSubject("");
      setBody("");
    } catch (err) {
      setComposeError(
        err instanceof Error ? err.message : "Email could not be sent."
      );
    } finally {
      setComposeBusy(false);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/mail/drafts/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not delete draft.");
      }

      await loadDrafts();
    } catch (err) {
      console.error("Draft deletion failed:", err);
    }
  };

  const draftEmails: InboxEmail[] = drafts.map((draft) => ({
    id: draft.id,
    sender: "Draft",
    address: draft.recipient || "No recipient",
    subject: draft.subject || "(No subject)",
    preview: draft.body.slice(0, 140),
    time: draft.updated_at
      ? new Date(draft.updated_at).toLocaleString()
      : "",
    status: "Unclassified",
    body: draft.body,
  }));

  const folderEmails = useMemo(() => {
    if (folder === "Drafts") return draftEmails;

    if (folder === "Bin") {
      return emails.filter((email) => trashed.includes(email.id));
    }

    const active = emails.filter((email) => !trashed.includes(email.id));

    if (folder === "Starred") {
      return active.filter((email) => starred.includes(email.id));
    }

    return active;
  }, [emails, folder, starred, trashed, drafts]);

  const filteredEmails = useMemo(() => {
    if (emailFilter === "All" || folder !== "Inbox") {
      return folderEmails;
    }

    return folderEmails.filter((email) => email.status === emailFilter);
  }, [folderEmails, emailFilter, folder]);

  const visibleEmails = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return filteredEmails;

    return filteredEmails.filter((email) =>
      `${email.sender} ${email.address} ${email.subject} ${email.preview}`
        .toLowerCase()
        .includes(query)
    );
  }, [filteredEmails, search]);

  const activeEmails = emails.filter((email) => !trashed.includes(email.id));

  const counts = {
    inbox: activeEmails.length,
    starred: activeEmails.filter((email) => starred.includes(email.id)).length,
    drafts: drafts.length,
    bin: trashed.length,
  };

  if (selected) {
    const selectedStatus = selected.status;

    return (
      <section className="inbox-page">
        <div className="inbox-topbar">
          <div className="inbox-title-area">
            <button
              className="inbox-icon-btn"
              type="button"
              onClick={() => setSelected(null)}
            >
              <ChevronLeft size={19} />
            </button>
            <div>
              <h1>Email Details</h1>
              <p>View your email securely</p>
            </div>
          </div>
        </div>

        <div className="email-detail-card">
          <div className="email-detail-header">
            <div className="detail-avatar">
              {selected.sender.charAt(0).toUpperCase()}
            </div>
            <div className="detail-sender">
              <h2>{selected.sender}</h2>
              <span>{selected.address}</span>
            </div>
            <span>{selected.time}</span>
          </div>

          <div className="email-detail-content">
            <h2>{selected.subject}</h2>
            <span className={`inbox-status ${selectedStatus.toLowerCase()}`}>
              {selectedStatus}
            </span>
            <div className="detail-divider" />

            {detailLoading ? (
              <p>Loading email details...</p>
            ) : (
              <div className="detail-body">
                {selected.body || selected.preview || "No email content available."}
              </div>
            )}

            <div className="detail-divider" />

            <div className="inbox-actions">
              <button
                className="filter-btn"
                type="button"
                onClick={() => toggleStar(selected.id)}
              >
                <Star size={16} />
                {starred.includes(selected.id) ? "Unstar" : "Star"}
              </button>

              <button
                className="filter-btn"
                type="button"
                onClick={() => moveToBin(selected.id)}
              >
                <Trash2 size={16} />
                Move to Bin
              </button>

              <button
                className="filter-btn"
                type="button"
                onClick={() => setSelected(null)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="inbox-page">
      <div className="inbox-topbar">
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
            type="button"
            className="smartmail-compose-btn"
            onClick={startCompose}
          >
            <Plus size={17} />
            Compose
          </button>

          <button
            type="button"
            className="inbox-icon-btn"
            onClick={() => void onRefresh()}
            title="Refresh inbox"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {composeMessage && (
        <div className="smartmail-compose-success" role="status">
          {composeMessage}
        </div>
      )}

      <div className="inbox-summary">
        {(["Inbox", "Starred", "Drafts", "Bin"] as MailFolder[]).map((name) => (
          <button
            key={name}
            type="button"
            className={folder === name ? "filter-option active" : "filter-option"}
            onClick={() => {
              setFolder(name);
              setEmailFilter("All");
              setSearch("");
            }}
          >
            {name === "Inbox" ? <InboxIcon size={17} /> :
              name === "Starred" ? <Star size={17} /> :
              name === "Drafts" ? <FileText size={17} /> :
              <Trash2 size={17} />}
            {name}
            {name === "Inbox" && ` ${counts.inbox}`}
            {name === "Starred" && ` ${counts.starred}`}
            {name === "Drafts" && ` ${counts.drafts}`}
            {name === "Bin" && ` ${counts.bin}`}
          </button>
        ))}
      </div>

      <div className="inbox-connection-status">
        {error ? (
          <span>{`Gmail connection error: ${error}`}</span>
        ) : (
          <span>
            Connected to Gmail — showing shared emails and saved classifications.
          </span>
        )}
      </div>

      <div className="inbox-toolbar">
        <div className="inbox-search">
          <Search size={17} />
          <input
            type="search"
            placeholder={folder === "Drafts" ? "Search drafts..." : "Search inbox..."}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {folder === "Inbox" && (
          <div className="filter-wrapper">
            <button
              className="filter-btn"
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
            >
              <SlidersHorizontal size={16} />
              Filter
              <span>⌄</span>
            </button>

            {filterOpen && (
              <div className="filter-menu">
                {(["All", "Spam", "Phishing", "Unclassified"] as EmailFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={emailFilter === option ? "filter-option active" : "filter-option"}
                    onClick={() => {
                      setEmailFilter(option);
                      setFilterOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="inbox-list-heading">
        <strong>{folder === "Inbox" ? "Inbox" : folder}</strong>
        <span>
          {folder === "Drafts" && draftsLoading
            ? "Loading drafts..."
            : `${visibleEmails.length} ${folder === "Drafts" ? "drafts" : "emails"}`}
        </span>
      </div>

      <div className="inbox-list">
        {visibleEmails.length === 0 ? (
          <div className="empty-inbox">
            {loading || (folder === "Drafts" && draftsLoading) ? (
              <>
                <RefreshCw size={28} />
                <h2>Loading...</h2>
              </>
            ) : error && folder === "Inbox" ? (
              <>
                <Mail size={28} />
                <h2>Gmail connection unavailable</h2>
                <p>Use refresh to try again.</p>
              </>
            ) : (
              <>
                <InboxIcon size={28} />
                <h2>
                  {folder === "Drafts" ? "No drafts available" :
                    folder === "Bin" ? "Bin is empty" :
                    folder === "Starred" ? "No starred emails" :
                    emailFilter === "Spam" ? "No spam emails found" :
                    emailFilter === "Phishing" ? "No phishing emails found" :
                    emailFilter === "Unclassified" ? "No unclassified emails" :
                    "No emails found"}
                </h2>
              </>
            )}
          </div>
        ) : (
          visibleEmails.map((email) => (
            <article
              className={email.unread ? "inbox-email unread" : "inbox-email"}
              key={email.id}
              onClick={() => {
                if (folder === "Drafts") {
                  const draft = drafts.find((item) => item.id === email.id);
                  if (draft) editDraft(draft);
                } else {
                  void openEmail(email);
                }
              }}
            >
              <div className="email-checkbox" onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" aria-label={`Select ${email.subject}`} />
              </div>

              {folder !== "Drafts" && (
                <button
                  className={starred.includes(email.id) ? "star-btn starred" : "star-btn"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStar(email.id);
                  }}
                  title="Star email"
                >
                  <Star size={17} fill={starred.includes(email.id) ? "currentColor" : "none"} />
                </button>
              )}

              <div className="inbox-sender">
                <strong>{email.sender}</strong>
                <span>{email.address}</span>
              </div>

              <div className="inbox-message">
                <strong>{email.subject}</strong>
                <span> — {email.preview}</span>
              </div>

              {folder === "Drafts" ? (
                <span className="inbox-status">
                  <FileText size={12} />
                  Draft
                </span>
              ) : (
                <>
                  <span className={`inbox-status ${email.status.toLowerCase()}`}>
                    {email.status === "Safe" ? <ShieldCheck size={12} /> :
                      email.status === "Phishing" ? <ShieldAlert size={12} /> :
                      email.status === "Spam" ? <AlertTriangle size={12} /> : null}
                    {email.status}
                  </span>

                  <span className="inbox-status">
                    <Mail size={12} />
                    {email.unread ? "Unread" : "Read"}
                  </span>
                </>
              )}

              <span className="inbox-time">{email.time}</span>

              {folder === "Drafts" ? (
                <button
                  className="email-more-btn"
                  type="button"
                  title="Delete draft"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteDraft(email.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              ) : folder === "Bin" ? (
                <button
                  className="email-more-btn"
                  type="button"
                  title="Restore email"
                  onClick={(event) => {
                    event.stopPropagation();
                    restore(email.id);
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <button
                  className="email-more-btn"
                  type="button"
                  title="Move to Bin"
                  onClick={(event) => {
                    event.stopPropagation();
                    moveToBin(email.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </article>
          ))
        )}
      </div>

      <div className="inbox-footer">
        Showing {visibleEmails.length} of {filteredEmails.length} emails
      </div>

      {composeOpen && (
        <div className="smartmail-compose-overlay">
          <div
            className="smartmail-compose-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-heading"
          >
            <div className="smartmail-compose-header">
              <div>
                <h2 id="compose-heading">
                  {draftId ? "Edit Draft" : "New Message"}
                </h2>
                <p>Compose an email using your connected Gmail account</p>
              </div>

              <button
                type="button"
                className="inbox-icon-btn"
                onClick={closeCompose}
                disabled={composeBusy}
                aria-label="Close compose window"
              >
                <X size={19} />
              </button>
            </div>

            <div className="smartmail-compose-fields">
              <label>
                To
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  disabled={composeBusy}
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={composeBusy}
                />
              </label>

              <label>
                Message
                <textarea
                  placeholder="Write your message..."
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={10}
                  disabled={composeBusy}
                />
              </label>
            </div>

            {composeError && (
              <p className="smartmail-compose-error" role="alert">
                {composeError}
              </p>
            )}

            <div className="smartmail-compose-footer">
              <button
                type="button"
                className="filter-btn"
                onClick={() => void saveDraft()}
                disabled={composeBusy}
              >
                {composeBusy ? <LoaderCircle size={16} /> : <Save size={16} />}
                Save Draft
              </button>

              <button
                type="button"
                className="smartmail-compose-send"
                onClick={() => void sendEmail()}
                disabled={composeBusy}
              >
                {composeBusy ? <LoaderCircle size={16} /> : <Send size={16} />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
