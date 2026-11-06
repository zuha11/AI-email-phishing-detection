import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Link as LinkIcon,
} from "lucide-react";

type EmailDetectionProps = {
  onOpenLogin?: () => void;
};

type EmailItem = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  body: string;
  date: string;
  unread: boolean;
};

type ScanResult = {
  success: boolean;
  prediction: number;
  label: string;
  confidence: number | null;
  message?: string;
};

// UPDATED: Flask backend is running on HTTPS.
const EMAILS_URL = "https://127.0.0.1:5000/api/poc1/emails";
const SCAN_URL = "https://127.0.0.1:5000/api/poc3/detect";

const SAMPLE_EMAIL: EmailItem = {
  id: "sample-email",
  sender: "SBI Net Banking",
  address: "noreply@sbi-secure-alerts.xyz",
  subject: "URGENT: Your account has been suspended — Verify immediately",
  body: `Dear Customer,

We have detected suspicious activity on your SBI account. Your account has been temporarily suspended for security reasons.

To restore access, click the verification link below and confirm your identity within 24 hours, or your account will be permanently closed.

This is an urgent security matter. Do not ignore this notice.

Regards, SBI Security Team, State Bank of India
http://sbi-account-verify.xyz/login
http://sbi-helpdesk.xyz/support`,
  date: "Today, 09:14 AM",
  unread: true,
};

function normalizeEmail(raw: any, index: number): EmailItem {
  const senderValue =
    raw?.sender ?? raw?.from ?? raw?.name ?? "Unknown sender";

  const addressValue =
    raw?.address ??
    raw?.email ??
    raw?.sender_email ??
    raw?.from_email ??
    raw?.email_address ??
    "";

  const sender = String(senderValue || "Unknown sender");
  const address = String(addressValue || "");
  const status = raw?.readStatus ?? raw?.read_status;

  const unread =
    typeof raw?.unread === "boolean"
      ? raw.unread
      : typeof raw?.is_unread === "boolean"
        ? raw.is_unread
        : typeof status === "string"
          ? status.trim().toLowerCase() === "unread"
          : false;

  return {
    id: String(raw?.id ?? raw?.email_id ?? raw?.uid ?? index),
    sender,
    address: address || (sender.includes("@") ? sender : ""),
    subject: String(raw?.subject ?? raw?.title ?? "(No subject)"),
    body: String(
      raw?.body ??
        raw?.text ??
        raw?.body_text ??
        raw?.plain_text ??
        raw?.content ??
        raw?.preview ??
        raw?.snippet ??
        ""
    ),
    date: String(
      raw?.time ??
        raw?.date ??
        raw?.received_at ??
        raw?.timestamp ??
        "Date unavailable"
    ),
    unread,
  };
}

function getEmailList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.emails)) return payload.emails;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.inbox)) return payload.inbox;
  return [];
}

function getPrediction(payload: any): ScanResult | null {
  const candidates = [
    payload,
    payload?.result,
    payload?.data,
    payload?.prediction_result,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const rawPrediction =
      item.prediction ?? item.prediction_value ?? item.class_id;

    const rawLabel =
      item.label ?? item.predicted_label ?? item.classification;

    let prediction: number | null = null;

    if (
      typeof rawPrediction === "number" &&
      Number.isFinite(rawPrediction)
    ) {
      prediction = rawPrediction;
    } else if (
      typeof rawPrediction === "string" &&
      rawPrediction.trim() !== "" &&
      Number.isFinite(Number(rawPrediction))
    ) {
      prediction = Number(rawPrediction);
    }

    let label =
      typeof rawLabel === "string" ? rawLabel.trim() : "";

    if (!label && prediction !== null) {
      label = prediction === 1 ? "Phishing" : "Legitimate";
    }

    if (prediction === null && label) {
      const normalized = label.toLowerCase();

      if (
        normalized.includes("phish") ||
        normalized.includes("malicious") ||
        normalized.includes("fraud")
      ) {
        prediction = 1;
      } else if (
        normalized.includes("legitimate") ||
        normalized.includes("safe") ||
        normalized.includes("ham") ||
        normalized.includes("not phishing")
      ) {
        prediction = 0;
      }
    }

    if (prediction !== null && label) {
      let confidence: number | null = null;

      if (typeof item.confidence === "number") {
        confidence = item.confidence;
      } else if (typeof item.probability === "number") {
        confidence = item.probability;
      }

      if (
        confidence !== null &&
        confidence >= 0 &&
        confidence <= 1
      ) {
        confidence *= 100;
      }

      return {
        success: item.success !== false,
        prediction,
        label,
        confidence,
        message:
          typeof item.message === "string"
            ? item.message
            : undefined,
      };
    }
  }

  return null;
}

function EmailDetection({ onOpenLogin }: EmailDetectionProps) {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmailId, setSelectedEmailId] =
    useState(SAMPLE_EMAIL.id);

  const [emailLoading, setEmailLoading] = useState(true);
  const [emailLoadError, setEmailLoadError] = useState("");

  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] =
    useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");

  const selectedEmail = useMemo(
    () =>
      emails.find((email) => email.id === selectedEmailId) ??
      SAMPLE_EMAIL,
    [emails, selectedEmailId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEmails() {
      setEmailLoading(true);
      setEmailLoadError("");

      try {
        const response = await fetch(EMAILS_URL, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.success === false) {
          throw new Error(
            payload?.error ||
              `Email API returned HTTP ${response.status}`
          );
        }

        const normalized = getEmailList(payload).map(
          normalizeEmail
        );

        if (cancelled) return;

        setEmails(normalized);

        if (normalized.length > 0) {
          setSelectedEmailId(normalized[0].id);
        } else {
          setEmailLoadError(
            "POC 1 returned no emails. The sample email is shown instead."
          );
        }
      } catch (error) {
        if (!cancelled) {
          setEmailLoadError(
            error instanceof Error
              ? `Could not load Gmail emails: ${error.message}. Showing the sample email.`
              : "Could not load Gmail emails. Showing the sample email."
          );
        }
      } finally {
        if (!cancelled) {
          setEmailLoading(false);
        }
      }
    }

    void loadEmails();

    return () => {
      cancelled = true;
    };
  }, []);

  const runPhishingScan = async () => {
    setScanLoading(true);
    setScanError("");
    setScanResult(null);

    try {
      const response = await fetch(SCAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          subject: selectedEmail.subject,
          sender: [selectedEmail.sender, selectedEmail.address]
            .filter(Boolean)
            .join(" "),
          body: selectedEmail.body,
        }),
      });

      const payload: any = await response.json().catch(() => ({}));

      console.log("POC 3 API response:", response.status, payload);

      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            `Detection API returned HTTP ${response.status}`
        );
      }

      const result = getPrediction(payload);

      if (!result) {
        console.error("Unrecognized POC 3 response:", payload);
        throw new Error(
          "The API responded, but its JSON contains no recognizable prediction and label. Check the browser Console and Flask terminal."
        );
      }

      if (result.success === false) {
        throw new Error(
          result.message || "The POC 3 scan was unsuccessful."
        );
      }

      setScanResult(result);
    } catch (error) {
      console.error("POC 3 phishing scan failed:", error);

      setScanError(
        error instanceof Error
          ? error.message
          : "Phishing detection failed. Check the Flask terminal."
      );
    } finally {
      setScanLoading(false);
    }
  };

  const emailLinks = useMemo(() => {
    const matches =
      selectedEmail.body.match(
        /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi
      ) ?? [];

    return Array.from(new Set(matches)).slice(0, 10);
  }, [selectedEmail.body]);

  const openLogin = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      window.location.href = "/?page=Login";
    }
  };

  const isPhishing =
    scanResult?.prediction === 1 ||
    scanResult?.label.toLowerCase().includes("phish") === true;

  return (
    <>
      <style>{`
        .detection-page {
          width: 100%;
          min-height: 100%;
          padding: 24px 30px 40px;
          background: #f7f8fc;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .detection-back {
          display: flex;
          align-items: center;
          gap: 9px;
          border: none;
          background: transparent;
          color: #4b5563;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 0;
          margin-bottom: 20px;
        }

        .detection-back:hover { color: #4338ca; }

        .detection-heading {
          margin: 0 0 8px;
          color: #111827;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .detection-description {
          margin: 0 0 25px;
          color: #6b7280;
          font-size: 15px;
          line-height: 1.6;
        }

        .detection-email-picker {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 22px;
          color: #374151;
          font-size: 14px;
          font-weight: 700;
        }

        .detection-email-picker select {
          width: 100%;
          min-height: 54px;
          padding: 13px 16px;
          border: 1px solid #d1d5db;
          border-radius: 11px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 14px;
          box-sizing: border-box;
          cursor: pointer;
        }

        .detection-card {
          width: 100%;
          min-height: 570px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 34px 38px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
          box-sizing: border-box;
        }

        .detection-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 30px;
        }

        .detection-subject {
          margin: 0;
          font-size: clamp(23px, 2.2vw, 30px);
          line-height: 1.4;
          color: #111827;
          font-weight: 750;
          flex: 1;
          overflow-wrap: anywhere;
        }

        .phishing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          border-radius: 22px;
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
          gap: 24px;
          padding-bottom: 27px;
          border-bottom: 1px solid #edf0f4;
        }

        .detection-sender {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .detection-avatar {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          font-weight: 700;
          color: #374151;
        }

        .detection-sender-info { min-width: 0; }

        .detection-sender-info strong {
          display: block;
          font-size: 17px;
          color: #111827;
          margin-bottom: 5px;
        }

        .detection-sender-info span {
          display: block;
          font-size: 14px;
          color: #6b7280;
          overflow-wrap: anywhere;
        }

        .detection-meta {
          text-align: right;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.9;
        }

        .detection-meta strong { color: #4b5563; }

        .detection-body {
          padding: 32px 4px 8px;
          min-height: 220px;
        }

        .detection-body p {
          margin: 0 0 22px;
          color: #374151;
          font-size: 16px;
          line-height: 1.9;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .detection-links-title {
          margin-top: 32px;
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.04em;
        }

        .suspicious-link {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px 18px;
          margin-bottom: 11px;
          border: 1px solid #fecdd3;
          background: #fff7f8;
          border-radius: 10px;
          text-align: left;
        }

        .link-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .link-left svg { flex-shrink: 0; color: #be123c; }

        .link-left span {
          color: #9f1239;
          font-size: 14px;
          word-break: break-all;
        }

        .suspicious-label {
          padding: 6px 11px;
          border-radius: 12px;
          background: #ffe4e6;
          color: #be123c;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .detection-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 32px;
          padding-top: 26px;
          border-top: 1px solid #edf0f4;
        }

        .manual-scan {
          border: 0;
          padding: 10px 0;
          background: transparent;
          color: #4f46e5;
          font: inherit;
          font-size: 15px;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
        }

        .manual-scan:disabled,
        .check-email-btn-detection:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .action-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cancel-btn {
          border: none;
          background: transparent;
          color: #4b5563;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 20px;
          cursor: pointer;
        }

        .check-email-btn-detection {
          display: flex;
          align-items: center;
          gap: 10px;
          border: none;
          border-radius: 10px;
          padding: 16px 25px;
          background: #4f46e5;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 5px 14px rgba(79, 70, 229, 0.2);
        }

        .check-email-btn-detection:hover { background: #4338ca; }

        .detection-status {
          margin: 0 0 18px;
          padding: 15px 17px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .detection-status.info {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .detection-status.error {
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fed7aa;
        }

        .detection-result {
          display: block;
          margin-top: 24px;
          padding: 30px;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          color: #111827;
          overflow-wrap: anywhere;
          background: white;
        }

        .detection-result.phishing {
          border-color: #dc2626;
          background: #fff1f2;
        }

        .detection-result.legitimate {
          border-color: #16a34a;
          background: #f0fdf4;
        }

        .detection-result h2 {
          margin: 0 0 14px;
          font-size: 25px;
          color: #111827;
        }

        .detection-result p {
          margin: 0 0 13px;
          color: #374151;
          font-size: 15px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .detection-loading {
          color: #4f46e5;
          font-size: 14px;
          margin: 0 0 15px;
        }

        /* =========================================
           EMAIL DETECTION - GLOBAL DARK MODE
           COLOURS ONLY - NO LAYOUT CHANGES
           ========================================= */

        [data-theme="dark"] .detection-page {
          background: var(--sm-dark-page, #11111b);
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-back {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .detection-back:hover {
          color: #a5a0ff;
        }

        [data-theme="dark"] .detection-heading {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-description {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .detection-email-picker {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-email-picker select {
          background: var(--sm-dark-input, #242334);
          color: var(--sm-dark-text, #eeeaf7);
          border-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .detection-email-picker select option {
          background: #242334;
          color: #eeeaf7;
        }

        [data-theme="dark"] .detection-card {
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        [data-theme="dark"] .detection-subject {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-sender-row {
          border-bottom-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .detection-avatar {
          background: #302b43;
          color: #eeeaf7;
        }

        [data-theme="dark"] .detection-sender-info strong {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-sender-info span {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .detection-meta {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .detection-meta strong {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-body p {
          color: #d5d0e2;
        }

        [data-theme="dark"] .detection-links-title {
          color: #c4bdd5;
        }

        [data-theme="dark"] .suspicious-link {
          background: #30202d;
          border-color: #713348;
        }

        [data-theme="dark"] .link-left span {
          color: #fda4af;
        }

        [data-theme="dark"] .link-left svg {
          color: #fb7185;
        }

        [data-theme="dark"] .suspicious-label {
          background: #512638;
          color: #fecdd3;
        }

        [data-theme="dark"] .detection-actions {
          border-top-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .manual-scan {
          color: #a5a0ff;
        }

        [data-theme="dark"] .manual-scan:hover {
          color: #c4bfff;
        }

        [data-theme="dark"] .cancel-btn {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .cancel-btn:hover {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .check-email-btn-detection {
          background: #5148c9;
          color: #ffffff;
        }

        [data-theme="dark"] .check-email-btn-detection:hover {
          background: #6259df;
        }

        [data-theme="dark"] .detection-status.info {
          background: #1c2c46;
          color: #bfdbfe;
          border-color: #31547f;
        }

        [data-theme="dark"] .detection-status.error {
          background: #392719;
          color: #fed7aa;
          border-color: #754522;
        }

        [data-theme="dark"] .detection-loading {
          color: #aaa5ff;
        }

        [data-theme="dark"] .detection-result {
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-result h2 {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .detection-result p {
          color: #d5d0e2;
        }

        [data-theme="dark"] .detection-result.phishing {
          background: #351d2a;
          border-color: #a8324c;
        }

        [data-theme="dark"] .detection-result.legitimate {
          background: #193326;
          border-color: #28764b;
        }

        @media (min-width: 1500px) {
          .detection-page { padding-left: 42px; padding-right: 42px; }
          .detection-card { padding: 42px 48px; }
        }

        @media (max-width: 800px) {
          .detection-page { padding: 20px 16px 30px; }
          .detection-card { padding: 22px 18px; min-height: auto; }
          .detection-heading { font-size: 25px; }

          .detection-card-header,
          .detection-sender-row,
          .detection-actions {
            flex-direction: column;
            align-items: flex-start;
          }

          .detection-meta { text-align: left; }

          .action-right {
            width: 100%;
            flex-wrap: wrap;
            justify-content: flex-start;
          }

          .check-email-btn-detection { padding: 14px 18px; }
        }

        @media (max-width: 480px) {
          .detection-email-picker select { min-width: 0; }
          .action-right { gap: 6px; }
          .detection-result { padding: 20px; }
        }
      `}</style>

      <section className="detection-page">
        <button
          className="detection-back"
          type="button"
          onClick={openLogin}
        >
          <ArrowLeft size={17} />
          Back to Login
        </button>

        <h1 className="detection-heading">Email Detection</h1>

        <p className="detection-description">
          Review emails retrieved from Gmail and scan them using the PhishShield AI detection engine.
        </p>

        {emails.length > 0 && (
          <div className="detection-email-picker">
            <label htmlFor="detection-email-select">
              Choose an email from your Gmail inbox
            </label>

            <select
              id="detection-email-select"
              value={selectedEmailId}
              onChange={(event) => {
                setSelectedEmailId(event.target.value);
                setScanResult(null);
                setScanError("");
              }}
            >
              {emails.map((email) => (
                <option key={email.id} value={email.id}>
                  {email.subject} — {email.address || email.sender}
                </option>
              ))}
            </select>
          </div>
        )}

        {emailLoading && (
          <p className="detection-status info" role="status">
            Connecting to POC 1 and loading your Gmail emails…
          </p>
        )}

        {!emailLoading && emailLoadError && (
          <p className="detection-status error" role="alert">
            {emailLoadError}
          </p>
        )}

        {scanLoading && (
          <p className="detection-loading" role="status">
            PhishShield AI is analyzing the selected email…
          </p>
        )}

        {scanError && (
          <p className="detection-status error" role="alert">
            {scanError}
          </p>
        )}

        <div className="detection-card">
          <div className="detection-card-header">
            <h2 className="detection-subject">
              {selectedEmail.subject}
            </h2>

            <span className="phishing-badge">
              <ShieldAlert size={15} />
              {scanResult
                ? scanResult.label
                : "NOT YET SCANNED"}
            </span>
          </div>

          <div className="detection-sender-row">
            <div className="detection-sender">
              <div className="detection-avatar">
                {(
                  selectedEmail.sender ||
                  selectedEmail.address ||
                  "?"
                )
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="detection-sender-info">
                <strong>
                  {selectedEmail.sender || "Unknown sender"}
                </strong>

                <span>
                  {selectedEmail.address ||
                    "Sender address unavailable"}
                </span>
              </div>
            </div>

            <div className="detection-meta">
              <div>{selectedEmail.date}</div>

              <div>
                Read status:{" "}
                <strong>
                  {selectedEmail.unread
                    ? "Unread"
                    : "Read / unknown"}
                </strong>
              </div>
            </div>
          </div>

          <div className="detection-body">
            {(selectedEmail.body ||
              "No email body preview is available for this message.")
              .split(/\n+/)
              .map((paragraph, index) =>
                paragraph.trim() ? (
                  <p key={`${selectedEmail.id}-body-${index}`}>
                    {paragraph}
                  </p>
                ) : null
              )}

            {emailLinks.length > 0 && (
              <>
                <div className="detection-links-title">
                  LINKS IN THIS EMAIL
                </div>

                {emailLinks.map((url) => (
                  <div
                    className="suspicious-link"
                    key={url}
                    title="Link displayed for review; not opened"
                  >
                    <div className="link-left">
                      <AlertTriangle size={17} />
                      <span>{url}</span>
                    </div>

                    <span className="suspicious-label">
                      REVIEW
                    </span>
                  </div>
                ))}
              </>
            )}

            <div className="detection-actions">
              <button
                className="manual-scan"
                type="button"
                onClick={runPhishingScan}
                disabled={scanLoading}
                aria-busy={scanLoading}
              >
                {scanLoading
                  ? "Scanning…"
                  : "Scan Email Manually"}
              </button>

              <div className="action-right">
                <button
                  className="cancel-btn"
                  type="button"
                  onClick={() => {
                    setScanResult(null);
                    setScanError("");
                  }}
                >
                  Clear Result
                </button>

                <button
                  className="check-email-btn-detection"
                  type="button"
                  onClick={runPhishingScan}
                  disabled={scanLoading}
                  aria-busy={scanLoading}
                >
                  <ShieldCheck size={18} />
                  {scanLoading ? "Checking…" : "Check Email"}
                  <LinkIcon size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {scanResult && (
          <section
            className={`detection-result ${
              isPhishing ? "phishing" : "legitimate"
            }`}
            role="status"
            aria-live="polite"
          >
            <h2>{scanResult.label}</h2>

            <p>
              {isPhishing
                ? "The POC 3 model classified this email as potentially phishing. Verify the sender independently before interacting with the email."
                : "The POC 3 model classified this email as legitimate. This prediction does not guarantee the email is safe."}
            </p>

            {typeof scanResult.confidence === "number" && (
              <p>
                Model confidence:{" "}
                {scanResult.confidence.toFixed(2)}%
              </p>
            )}

            {scanResult.message && <p>{scanResult.message}</p>}
          </section>
        )}
      </section>
    </>
  );
}

export default EmailDetection;