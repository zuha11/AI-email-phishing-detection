import {
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Link as LinkIcon,
} from "lucide-react";

function EmailDetection() {
  return (
    <>
      <style>{`
        .detection-page {
          min-height: 100%;
          padding: 28px 34px;
          background: #f7f8fc;
          overflow-y: auto;
        }

        .detection-back {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: transparent;
          color: #4b5563;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
          margin-bottom: 18px;
        }

        .detection-back:hover {
          color: #4338ca;
        }

        .detection-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 28px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .detection-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 26px;
        }

        .detection-subject {
          margin: 0;
          font-size: 24px;
          line-height: 1.35;
          color: #111827;
          font-weight: 700;
          max-width: 850px;
        }

        .phishing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 13px;
          border-radius: 20px;
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .detection-sender-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding-bottom: 24px;
          border-bottom: 1px solid #edf0f4;
        }

        .detection-sender {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .detection-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          color: #374151;
        }

        .detection-sender-info strong {
          display: block;
          font-size: 15px;
          color: #111827;
          margin-bottom: 3px;
        }

        .detection-sender-info span {
          display: block;
          font-size: 13px;
          color: #6b7280;
        }

        .detection-meta {
          text-align: right;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.7;
        }

        .detection-meta strong {
          color: #4b5563;
        }

        .detection-body {
          padding: 28px 4px 10px;
        }

        .detection-body p {
          margin: 0 0 22px;
          color: #374151;
          font-size: 15px;
          line-height: 1.8;
        }

        .detection-links-title {
          margin-top: 30px;
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.04em;
        }

        .suspicious-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 15px;
          margin-bottom: 10px;
          border: 1px solid #fecdd3;
          background: #fff7f8;
          border-radius: 10px;
        }

        .link-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .link-left span {
          color: #9f1239;
          font-size: 13px;
          word-break: break-all;
        }

        .suspicious-label {
          padding: 5px 9px;
          border-radius: 12px;
          background: #ffe4e6;
          color: #be123c;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .detection-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 25px;
          padding-top: 22px;
          border-top: 1px solid #edf0f4;
        }

        .manual-scan {
          color: #4f46e5;
          font-size: 14px;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }

        .action-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cancel-btn {
          border: none;
          background: transparent;
          color: #4b5563;
          font-size: 14px;
          font-weight: 600;
          padding: 11px 18px;
          cursor: pointer;
        }

        .check-email-btn-detection {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 10px;
          padding: 12px 20px;
          background: #4f46e5;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 5px 14px rgba(79, 70, 229, 0.2);
        }

        .check-email-btn-detection:hover {
          background: #4338ca;
        }

        @media (max-width: 800px) {
          .detection-page {
            padding: 20px;
          }

          .detection-card-header,
          .detection-sender-row,
          .detection-actions {
            flex-direction: column;
            align-items: flex-start;
          }

          .detection-meta {
            text-align: left;
          }

          .action-right {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <span>Email Detection</span>
          </div>

          <div className="top-actions">
            <button className="notification" type="button">
              <span>🔔</span>
              <span className="notification-count">3</span>
            </button>

            <div className="profile">
              <div className="profile-avatar">MA</div>
              <div className="profile-info">
                <strong>Maryam Arif</strong>
                <span>Admin</span>
              </div>
            </div>
          </div>
        </header>

        <section className="detection-page">
          <button className="detection-back" type="button">
            <ArrowLeft size={16} />
            Back to Inbox
          </button>

          <div className="detection-card">

            <div className="detection-card-header">
              <h1 className="detection-subject">
                URGENT: Your account has been suspended — Verify immediately
              </h1>

              <span className="phishing-badge">
                <ShieldAlert size={14} />
                PHISHING
              </span>
            </div>

            <div className="detection-sender-row">
              <div className="detection-sender">
                <div className="detection-avatar">S</div>

                <div className="detection-sender-info">
                  <strong>SBI Net Banking</strong>
                  <span>noreply@sbi-secure-alerts.xyz</span>
                </div>
              </div>

              <div className="detection-meta">
                <div>Today, 09:14 AM</div>
                <div>
                  Category: <strong>Banking/Finance</strong>
                </div>
              </div>
            </div>

            <div className="detection-body">

              <p>Dear Customer,</p>

              <p>
                We have detected suspicious activity on your SBI account
                (ending in 4821). Your account has been temporarily suspended
                for security reasons.
              </p>

              <p>
                To restore access, click the verification link below and
                confirm your identity within 24 hours, or your account will
                be permanently closed.
              </p>

              <p>
                This is an urgent security matter. Do not ignore this notice.
                Failure to verify will result in permanent closure of all
                associated services.
              </p>

              <p>
                Regards,<br />
                SBI Security Team<br />
                State Bank of India
              </p>

              <div className="detection-links-title">
                LINKS IN THIS EMAIL
              </div>

              <div className="suspicious-link">
                <div className="link-left">
                  <AlertTriangle size={16} />
                  <span>
                    http://sbi-account-verify.xyz/login
                  </span>
                </div>

                <span className="suspicious-label">
                  SUSPICIOUS
                </span>
              </div>

              <div className="suspicious-link">
                <div className="link-left">
                  <AlertTriangle size={16} />
                  <span>
                    http://sbi-helpdesk.xyz/support
                  </span>
                </div>

                <span className="suspicious-label">
                  SUSPICIOUS
                </span>
              </div>

              <div className="detection-actions">
                <span className="manual-scan">
                  Scan Email Manually
                </span>

                <div className="action-right">
                  <button className="cancel-btn" type="button">
                    Cancel
                  </button>

                  <button
                    className="check-email-btn-detection"
                    type="button"
                  >
                    <ShieldCheck size={16} />
                    Check Email
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default EmailDetection;