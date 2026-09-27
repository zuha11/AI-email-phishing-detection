import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Eye,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

type ThreatEmail = {
  id: number;
  sender: string;
  email: string;
  subject: string;
  date: string;
  status: "PHISHING" | "SPAM";
};

const threatEmails: ThreatEmail[] = [
  {
    id: 1,
    sender: "SBI Net Banking",
    email: "noreply@sbi-secure.com",
    subject: "URGENT: Your account has been suspended",
    date: "Today, 09:14 AM",
    status: "PHISHING",
  },
  {
    id: 2,
    sender: "HDFC Credit Card",
    email: "alerts@hdfc-card.com",
    subject: "Action Required: Card Verification",
    date: "Yesterday, 03:20 PM",
    status: "PHISHING",
  },
  {
    id: 3,
    sender: "Flipkart",
    email: "noreply@flipkart-offer.com",
    subject: "Big Billion Days — Up to 80% OFF",
    date: "Yesterday, 12:00 PM",
    status: "SPAM",
  },
  {
    id: 4,
    sender: "PhonePe Rewards",
    email: "rewards@phonepe-cashback.com",
    subject: "You've won ₹5,000 cashback!",
    date: "Aug 5, 09:15 AM",
    status: "SPAM",
  },
];

export default function SpamPhishing() {
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [emails, setEmails] = useState(threatEmails);
  const [search, setSearch] = useState("");

  const phishingCount = emails.filter(
    (email) => email.status === "PHISHING"
  ).length;

  const spamCount = emails.filter(
    (email) => email.status === "SPAM"
  ).length;

  const filteredEmails = emails.filter((email) => {
    const text =
      `${email.sender} ${email.email} ${email.subject}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const toggleEmail = (id: number) => {
    setSelectedEmails((current) =>
      current.includes(id)
        ? current.filter((emailId) => emailId !== id)
        : [...current, id]
    );
  };

  const toggleAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((email) => email.id));
    }
  };

  const deleteEmail = (id: number) => {
    setEmails((current) => current.filter((email) => email.id !== id));
    setSelectedEmails((current) => current.filter((emailId) => emailId !== id));
  };

  return (
    <div className="threat-page">
      <style>{`
        .threat-page {
          min-height: 100%;
          background: #f8fafc;
          color: #172033;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .threat-topbar {
          height: 86px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
        }

        .threat-title {
          margin: 0;
          font-size: 25px;
          font-weight: 700;
        }

        .threat-subtitle {
          margin: 5px 0 0;
          color: #8b93a3;
          font-size: 14px;
        }

        .threat-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .threat-bell {
          position: relative;
          width: 42px;
          height: 42px;
          border: 1px solid #e5e7eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
        }

        .threat-notification {
          position: absolute;
          top: -2px;
          right: -1px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .threat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .threat-user-name {
          font-size: 14px;
          font-weight: 600;
        }

        .threat-content {
          padding: 28px 34px 36px;
        }

        .threat-heading-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .threat-heading-row h2 {
          margin: 0;
          font-size: 23px;
        }

        .threat-heading-icon {
          color: #ef4444;
        }

        .threat-summary {
          margin: 0 0 22px;
          color: #687386;
          font-size: 15px;
        }

        .threat-summary strong {
          color: #374151;
        }

        .threat-table-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .threat-search-row {
          display: flex;
          justify-content: flex-end;
          padding: 15px 20px;
          border-bottom: 1px solid #edf0f4;
        }

        .threat-search {
          width: 260px;
          height: 38px;
          border: 1px solid #dfe3e8;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          color: #9aa2af;
        }

        .threat-search input {
          border: 0;
          outline: 0;
          width: 100%;
          font-size: 13px;
          color: #374151;
        }

        .threat-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .threat-table th {
          text-align: left;
          padding: 16px 14px;
          color: #9b3030;
          background: #fffafa;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          border-bottom: 1px solid #f0e5e5;
        }

        .threat-table td {
          padding: 18px 14px;
          border-bottom: 1px solid #edf0f4;
          vertical-align: middle;
          font-size: 14px;
        }

        .threat-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .threat-check {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #dc2626;
        }

        .sender-name {
          font-weight: 650;
          color: #202938;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sender-email {
          margin-top: 4px;
          color: #929aa8;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .subject-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #4b5563;
        }

        .threat-date {
          color: #697586;
          line-height: 1.45;
          font-size: 13px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .status-phishing {
          color: #b42318;
          background: #fff1f1;
          border: 1px solid #f5caca;
        }

        .status-spam {
          color: #a15c19;
          background: #fff8e8;
          border: 1px solid #f2dfb3;
        }

        .threat-actions {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .threat-action {
          border: 0;
          background: transparent;
          padding: 4px;
          cursor: pointer;
          color: #596575;
          display: flex;
          align-items: center;
        }

        .threat-action:hover {
          color: #1f2937;
        }

        .threat-action.delete:hover {
          color: #dc2626;
        }

        .threat-warning {
          margin-top: 26px;
          background: #fff7f7;
          border: 1px solid #f2cccc;
          border-radius: 12px;
          padding: 17px 20px;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          color: #9d3030;
        }

        .threat-warning-title {
          font-weight: 700;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .threat-warning-text {
          font-size: 13px;
          line-height: 1.5;
        }

        .threat-empty {
          text-align: center;
          padding: 42px;
          color: #8b93a3;
        }

        @media (max-width: 900px) {
          .threat-content {
            padding: 20px;
          }

          .threat-table {
            min-width: 900px;
          }

          .threat-table-card {
            overflow-x: auto;
          }
        }
      `}</style>

      <header className="threat-topbar">
        <div>
          <h1 className="threat-title">Spam &amp; Phishing</h1>
          <p className="threat-subtitle">
            Smart Email Security — BCA Project
          </p>
        </div>

        <div className="threat-profile">
          <div className="threat-bell">
            <Bell size={20} />
            <span className="threat-notification">1</span>
          </div>

          <div className="threat-avatar">AK</div>
          <span className="threat-user-name">Arjun Kumar</span>
        </div>
      </header>

      <main className="threat-content">
        <div className="threat-heading-row">
          <ShieldAlert size={25} className="threat-heading-icon" />
          <h2>Spam &amp; Phishing</h2>
        </div>

        <p className="threat-summary">
          <strong>{emails.length}</strong> suspicious emails detected
          {" · "}
          <strong>{phishingCount}</strong> phishing
          {" · "}
          <strong>{spamCount}</strong> spam
        </p>

        <section className="threat-table-card">
          <div className="threat-search-row">
            <div className="threat-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search suspicious emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <table className="threat-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>
                  <input
                    className="threat-check"
                    type="checkbox"
                    checked={
                      filteredEmails.length > 0 &&
                      selectedEmails.length === filteredEmails.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th style={{ width: "22%" }}>SENDER</th>
                <th style={{ width: "29%" }}>SUBJECT</th>
                <th style={{ width: "16%" }}>DATE</th>
                <th style={{ width: "14%" }}>STATUS</th>
                <th style={{ width: "14%" }}>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                  <tr key={email.id}>
                    <td>
                      <input
                        className="threat-check"
                        type="checkbox"
                        checked={selectedEmails.includes(email.id)}
                        onChange={() => toggleEmail(email.id)}
                      />
                    </td>

                    <td>
                      <div className="sender-name">{email.sender}</div>
                      <div className="sender-email">{email.email}</div>
                    </td>

                    <td>
                      <div className="subject-text" title={email.subject}>
                        {email.subject}
                      </div>
                    </td>

                    <td>
                      <div className="threat-date">{email.date}</div>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          email.status === "PHISHING"
                            ? "status-phishing"
                            : "status-spam"
                        }`}
                      >
                        {email.status === "PHISHING" ? (
                          <ShieldAlert size={13} />
                        ) : (
                          <AlertTriangle size={13} />
                        )}
                        {email.status}
                      </span>
                    </td>

                    <td>
                      <div className="threat-actions">
                        <button
                          className="threat-action"
                          title="View email"
                          onClick={() =>
                            alert(`Viewing: ${email.subject}`)
                          }
                        >
                          <Eye size={19} />
                        </button>

                        <button
                          className="threat-action delete"
                          title="Delete email"
                          onClick={() => deleteEmail(email.id)}
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="threat-empty">
                      No suspicious emails found.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="threat-warning">
          <AlertTriangle size={22} />
          <div>
            <div className="threat-warning-title">
              Warning: These emails have been flagged by PhishShield AI.
            </div>
            <div className="threat-warning-text">
              Do not click any links or download attachments from suspicious
              emails.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}