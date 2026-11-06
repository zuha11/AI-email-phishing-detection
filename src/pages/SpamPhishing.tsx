import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Mail,
  Search,
  MoreVertical,
  X,
  Ban,
  RefreshCw,
  Activity,
} from "lucide-react";

type SpamPhishingProps = {
  onAddAnotherAccount?: () => void;
};

type Threat = {
  id: number;
  sender: string;
  subject: string;
  type: "PHISHING" | "SPAM" | "FLOODING";
  email: string;
  category: string;
  reason: string;
  isDemo?: boolean;
  riskScore?: number;
  timestamp?: string;
};

type GmailEmail = {
  id?: string | number;
  email_id?: string | number;
  sender?: string;
  subject?: string;
  preview?: string;
  time?: string;
  read_status?: string;
};

type POC6Result = {
  sender?: string;
  subject?: string;
  timestamp?: string;
  risk_level?: string;
  risk_score?: number;
  classification?: string;
  reasons?: string[] | string;
  email_count?: number;
  similar_count?: number;
};

type POC6Response = {
  success?: boolean;
  error?: string;
  message?: string;
  emails_analysed?: number;
  summary?: {
    high_risk?: number;
    medium_risk?: number;
    low_risk?: number;
  };
  results?: POC6Result[];
  action?: string;
};

export const SMARTMAIL_THREAT_QUEUE_KEY = "smartmail_threat_queue";

// HTTPS matches the Flask server address.
const API_BASE = "https://127.0.0.1:5000";

const demoThreats: Threat[] = [
  {
    id: 3,
    sender: "SBI Net Banking",
    subject: "URGENT: Your account has been suspended",
    type: "PHISHING",
    email: "noreply@sbi-secure-alerts.xyz",
    category: "Banking / Finance",
    isDemo: true,
    reason:
      "Demonstration phishing example. It uses urgent language and a suspicious sender domain to create pressure.",
  },
  {
    id: 4,
    sender: "HDFC Credit Cards",
    subject: "Action Required: Card Verification",
    type: "PHISHING",
    email: "verify@hdfc-card-alert.example",
    category: "Banking / Finance",
    isDemo: true,
    reason:
      "Demonstration phishing example. It requests card verification and uses pressure to encourage immediate action.",
  },
  {
    id: 5,
    sender: "ICICI Bank Security",
    subject: "Unusual Login Activity — Verify Your Account",
    type: "PHISHING",
    email: "security@icici-account-alert.example",
    category: "Banking / Finance",
    isDemo: true,
    reason:
      "Demonstration phishing example. It uses an account-security warning and requests verification through a suspicious sender domain.",
  },
  {
    id: 6,
    sender: "Amazon Account Support",
    subject: "Your Account Has Been Temporarily Locked",
    type: "PHISHING",
    email: "support@amazon-security-alert.example",
    category: "Online Shopping",
    isDemo: true,
    reason:
      "Demonstration phishing example. It uses an account-lock warning to create urgency and encourage the recipient to verify account details.",
  },
];

function convertTimestamp(value: string | undefined): string | null {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function getReasons(value: POC6Result["reasons"]): string {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value;

  return "POC6 identified an email-flooding pattern. Review the detection result.";
}

function mapPOC6Results(results: POC6Result[]): Threat[] {
  return results
    .filter((result) => {
      const risk = String(result.risk_level || "").toUpperCase();
      return risk === "HIGH" || risk === "MEDIUM";
    })
    .map((result, index) => ({
      id: 10000 + index,
      sender: result.sender || "Unknown sender",
      subject: result.subject || "Email flooding alert",
      type: "FLOODING",
      email: result.sender || "Sender unavailable",
      category: "POC6 — Email Flooding Detection",
      reason: [
        result.classification || "Email flooding pattern detected.",
        getReasons(result.reasons),
        result.email_count !== undefined
          ? `Emails from sender in detected window: ${result.email_count}.`
          : "",
        result.similar_count !== undefined
          ? `Similar emails detected: ${result.similar_count}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      riskScore:
        typeof result.risk_score === "number"
          ? result.risk_score
          : undefined,
      timestamp: result.timestamp,
    }));
}

export default function SpamPhishing(_props: SpamPhishingProps) {
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "PHISHING" | "SPAM" | "FLOODING"
  >("ALL");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [floodingThreats, setFloodingThreats] = useState<Threat[]>([]);
  const [emailsAnalysed, setEmailsAnalysed] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [mediumRisk, setMediumRisk] = useState(0);
  const [lowRisk, setLowRisk] = useState(0);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState(
    "POC6 scan has not been run yet."
  );
  const [scanError, setScanError] = useState("");

  const scanInProgressRef = useRef(false);

  const threats = useMemo(
    () => [...floodingThreats, ...demoThreats],
    [floodingThreats]
  );

  const runPOC6Scan = useCallback(async () => {
    if (scanInProgressRef.current) return;

    scanInProgressRef.current = true;

    setScanLoading(true);
    setScanError("");
    setScanMessage("Loading Gmail records...");

    try {
      const inboxResponse = await fetch(`${API_BASE}/api/poc1/emails`);

      if (!inboxResponse.ok) {
        throw new Error(
          `Could not load Gmail records. Backend returned ${inboxResponse.status}.`
        );
      }

      const inboxData = await inboxResponse.json();

      const rawEmails: GmailEmail[] = Array.isArray(inboxData)
        ? inboxData
        : Array.isArray(inboxData.emails)
          ? inboxData.emails
          : Array.isArray(inboxData.data)
            ? inboxData.data
            : [];

      if (!rawEmails.length) {
        throw new Error(
          "No Gmail records were returned by POC1. Check the Gmail connection and CSV."
        );
      }

      setScanMessage(
        `Preparing ${rawEmails.length} Gmail records for POC6...`
      );

      const emailsForPOC6 = rawEmails
        .map((email) => {
          const timestamp = convertTimestamp(email.time);

          if (!email.sender || !timestamp) return null;

          return {
            sender: email.sender,
            subject: email.subject || "",
            body: email.preview || "",
            timestamp,
          };
        })
        .filter(
          (
            email
          ): email is {
            sender: string;
            subject: string;
            body: string;
            timestamp: string;
          } => email !== null
        );

      if (!emailsForPOC6.length) {
        throw new Error(
          "No valid email records with sender and readable timestamps were found."
        );
      }

      setScanMessage(
        `Running POC6 on ${emailsForPOC6.length} Gmail records...`
      );

      const poc6Response = await fetch(`${API_BASE}/api/poc6/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: emailsForPOC6,
        }),
      });

      const data: POC6Response = await poc6Response.json();

      if (!poc6Response.ok || data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            `POC6 request failed with status ${poc6Response.status}.`
        );
      }

      const results = Array.isArray(data.results) ? data.results : [];

      setFloodingThreats(mapPOC6Results(results));
      setEmailsAnalysed(data.emails_analysed ?? emailsForPOC6.length);
      setHighRisk(data.summary?.high_risk ?? 0);
      setMediumRisk(data.summary?.medium_risk ?? 0);
      setLowRisk(data.summary?.low_risk ?? 0);

      setScanMessage(
        `POC6 completed successfully. ${
          data.emails_analysed ?? emailsForPOC6.length
        } emails analysed.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown POC6 error.";

      setScanError(message);
      setScanMessage("POC6 scan could not be completed.");

      console.error("SmartMail POC6 integration error:", error);
    } finally {
      scanInProgressRef.current = false;
      setScanLoading(false);
    }
  }, []);

  useEffect(() => {
    void runPOC6Scan();
  }, [runPOC6Scan]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SMARTMAIL_THREAT_QUEUE_KEY,
        JSON.stringify(threats)
      );

      window.dispatchEvent(new Event("smartmail-threat-queue-updated"));
    } catch (error) {
      console.error("Could not publish SmartMail Threat Queue:", error);
    }
  }, [threats]);

  const phishingCount = demoThreats.length;
  const floodingCount = floodingThreats.length;

  const filteredThreats = threats.filter((threat) => {
    const matchesFilter = filter === "ALL" || threat.type === filter;
    const text = searchText.toLowerCase();

    const matchesSearch =
      threat.sender.toLowerCase().includes(text) ||
      threat.subject.toLowerCase().includes(text) ||
      threat.type.toLowerCase().includes(text) ||
      threat.category.toLowerCase().includes(text);

    return matchesFilter && matchesSearch;
  });

  const getThreatColor = (type: Threat["type"]) => {
    if (type === "PHISHING") return "#df4545";
    if (type === "FLOODING") return "#8a4de8";
    return "#c47b18";
  };

  const getThreatBackground = (type: Threat["type"]) => {
    if (type === "PHISHING") return "#fff0f0";
    if (type === "FLOODING") return "#f3edff";
    return "#fff5e8";
  };

  return (
    <div className="spam-phishing-page">
      <style>{`
        .spam-phishing-page {
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          background: #f7f8fc;
          color: #172033;
          font-family: Inter, Arial, sans-serif;
        }

        .spam-phishing-page,
        .spam-phishing-page * {
          box-sizing: border-box;
        }

        html[data-theme="dark"] .spam-phishing-page {
          background: #11111b !important;
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page main {
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page h1,
        html[data-theme="dark"] .spam-phishing-page h2,
        html[data-theme="dark"] .spam-phishing-page h3,
        html[data-theme="dark"] .spam-phishing-page strong {
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page p,
        html[data-theme="dark"] .spam-phishing-page span {
          color: #b8b2c8;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner {
          background: #202039 !important;
          border-color: #393958 !important;
          color: #c8c9ff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner strong,
        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner p {
          color: #c8c9ff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner.has-error {
          background: #351f2a !important;
          border-color: #673442 !important;
          color: #ffb9c1 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner.has-error strong,
        html[data-theme="dark"] .spam-phishing-page .sp-scan-banner.has-error p {
          color: #ffb9c1 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-stat-card,
        html[data-theme="dark"] .spam-phishing-page .sp-section {
          background: #1c1b29 !important;
          border-color: #343143 !important;
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-stat-card > div:first-child span,
        html[data-theme="dark"] .spam-phishing-page .sp-stat-card > span {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-section-subtitle {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-high {
          background: #38232d !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-medium {
          background: #392f22 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-low {
          background: #20352d !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-high div,
        html[data-theme="dark"] .spam-phishing-page .sp-risk-high strong {
          color: #ff9da8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-medium div,
        html[data-theme="dark"] .spam-phishing-page .sp-risk-medium strong {
          color: #f2c27e !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-low div,
        html[data-theme="dark"] .spam-phishing-page .sp-risk-low strong {
          color: #85d5a7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-chart-grid {
          stroke: #393747 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-chart-axis {
          stroke: #615c70 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-chart-label {
          fill: #b8b2c8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-chart-footnote {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-queue-header {
          border-bottom-color: #343143 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-row {
          border-bottom-color: #343143 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-subtitle,
        html[data-theme="dark"] .spam-phishing-page .sp-threat-category {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-search-box,
        html[data-theme="dark"] .spam-phishing-page .sp-filter-select,
        html[data-theme="dark"] .spam-phishing-page .sp-more-button {
          background: #242334 !important;
          border-color: #403b50 !important;
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-search-input {
          background: transparent !important;
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-search-input::placeholder {
          color: #928ba2 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-filter-select option {
          background: #242334;
          color: #eeeaf7;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-more-menu {
          background: #242334 !important;
          border-color: #403b50 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-more-menu button {
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-more-menu button:hover {
          color: #aeb8ff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-review-button {
          background: #292944 !important;
          border-color: #48466f !important;
          color: #b9c0ff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-demo-tag {
          background: #343143 !important;
          color: #c4bfd0 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-risk-score-tag {
          background: #302747 !important;
          color: #c7adff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-icon-phishing {
          background: #40252e !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-icon-flooding {
          background: #302747 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-icon-spam {
          background: #403323 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-type-phishing {
          background: #40252e !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-type-flooding {
          background: #302747 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-threat-type-spam {
          background: #403323 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-modal {
          background: #1c1b29 !important;
          color: #eeeaf7 !important;
          border: 1px solid #393447;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-modal-info {
          background: #242334 !important;
          color: #eeeaf7 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-modal-info p {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-modal-description {
          color: #c0bacd !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-phishing-notice {
          background: #40252e !important;
          color: #ffb3bd !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-flooding-notice {
          background: #302747 !important;
          color: #d0b9ff !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-modal-close {
          color: #c7c1d2 !important;
        }

        html[data-theme="dark"] .spam-phishing-page .sp-empty-state {
          color: #aaa4b8 !important;
        }

        html[data-theme="dark"] .spam-phishing-page button:focus-visible,
        html[data-theme="dark"] .spam-phishing-page input:focus-visible,
        html[data-theme="dark"] .spam-phishing-page select:focus-visible {
          outline: 2px solid #818cf8;
          outline-offset: 2px;
        }

        @media (max-width: 700px) {
          .spam-phishing-page main {
            padding: 22px 16px !important;
          }
        }
      `}</style>

      <main
        style={{
          padding: "30px 28px",
          width: "100%",
          maxWidth: "none",
          boxSizing: "border-box",
          margin: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>
              Spam / Phishing
            </h1>
            <p style={{ color: "#778197", margin: 0 }}>
              AI-powered email security and threat detection
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => void runPOC6Scan()}
              disabled={scanLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: 0,
                background: scanLoading ? "#929bbd" : "#4d5fe5",
                color: "#fff",
                borderRadius: 10,
                padding: "11px 15px",
                cursor: scanLoading ? "wait" : "pointer",
                fontWeight: 700,
              }}
            >
              <RefreshCw size={16} />
              {scanLoading ? "Scanning..." : "Run POC6 Scan"}
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="More options"
                className="sp-more-button"
                onClick={() => setShowMoreOptions((open) => !open)}
                style={{
                  border: "1px solid #e5e8f0",
                  background: "#fff",
                  borderRadius: 10,
                  width: 42,
                  height: 42,
                  cursor: "pointer",
                }}
              >
                <MoreVertical size={19} />
              </button>

              {showMoreOptions && (
                <div
                  className="sp-more-menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 46,
                    background: "#fff",
                    border: "1px solid #e5e8f0",
                    borderRadius: 10,
                    padding: 12,
                    width: 180,
                    zIndex: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setFilter("ALL");
                      setShowMoreOptions(false);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`sp-scan-banner${scanError ? " has-error" : ""}`}
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 10,
            background: scanError ? "#fff1f1" : "#f0f4ff",
            border: `1px solid ${scanError ? "#ffd0d0" : "#dce4ff"}`,
            color: scanError ? "#b4232d" : "#4655ad",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={17} />
            <strong>POC6 — Email Flooding Detection</strong>
          </div>
          <p style={{ margin: "6px 0 0" }}>{scanError || scanMessage}</p>
          <p style={{ margin: "4px 0 0" }}>
            Report-only detection. No emails are moved, deleted, or sent.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 18,
            marginTop: 22,
          }}
        >
          <div
            className="sp-stat-card"
            style={{
              background: "#fff",
              border: "1px solid #e9ebf2",
              borderRadius: 15,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#727c91", fontSize: 14 }}>
                Phishing examples
              </span>
              <ShieldAlert color="#e34d59" size={22} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14 }}>
              {phishingCount}
            </div>
            <span style={{ fontSize: 12, color: "#e34d59" }}>
              Demonstration examples
            </span>
          </div>

          <div
            className="sp-stat-card"
            style={{
              background: "#fff",
              border: "1px solid #e9ebf2",
              borderRadius: 15,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#727c91", fontSize: 14 }}>
                Flooding alerts
              </span>
              <Ban color="#8a4de8" size={22} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14 }}>
              {floodingCount}
            </div>
            <span style={{ fontSize: 12, color: "#8a4de8" }}>
              Medium and high risk POC6 results
            </span>
          </div>

          <div
            className="sp-stat-card"
            style={{
              background: "#fff",
              border: "1px solid #e9ebf2",
              borderRadius: 15,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#727c91", fontSize: 14 }}>
                Emails analysed
              </span>
              <Mail color="#5264dc" size={22} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14 }}>
              {emailsAnalysed}
            </div>
            <span style={{ fontSize: 12, color: "#68738a" }}>
              Gmail records processed
            </span>
          </div>
        </div>

        <section
          className="sp-section"
          style={{
            background: "#fff",
            border: "1px solid #e9ebf2",
            borderRadius: 15,
            marginTop: 22,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 17, margin: "0 0 14px" }}>
            POC6 Scan Summary
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
            }}
          >
            <div
              className="sp-risk-high"
              style={{ background: "#fff0f0", borderRadius: 10, padding: 14 }}
            >
              <div style={{ fontSize: 12, color: "#b4232d" }}>High risk</div>
              <strong style={{ fontSize: 25, color: "#b4232d" }}>
                {highRisk}
              </strong>
            </div>

            <div
              className="sp-risk-medium"
              style={{ background: "#fff6e8", borderRadius: 10, padding: 14 }}
            >
              <div style={{ fontSize: 12, color: "#a66b1b" }}>
                Medium risk
              </div>
              <strong style={{ fontSize: 25, color: "#a66b1b" }}>
                {mediumRisk}
              </strong>
            </div>

            <div
              className="sp-risk-low"
              style={{ background: "#effaf4", borderRadius: 10, padding: 14 }}
            >
              <div style={{ fontSize: 12, color: "#23834e" }}>Low risk</div>
              <strong style={{ fontSize: 25, color: "#23834e" }}>
                {lowRisk}
              </strong>
            </div>
          </div>
        </section>

        <section
          className="sp-section"
          style={{
            background: "#fff",
            border: "1px solid #e9ebf2",
            borderRadius: 15,
            marginTop: 18,
            padding: 22,
          }}
        >
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>
            Email Flooding — Risk Level Chart
          </h2>

          <p
            className="sp-section-subtitle"
            style={{ color: "#7b8498", fontSize: 12, margin: "0 0 20px" }}
          >
            Actual risk-level counts from the latest POC6 scan
          </p>

          {(() => {
            const chartData = [
              { label: "High Risk", value: highRisk, color: "#e34d59" },
              { label: "Medium Risk", value: mediumRisk, color: "#e5a23b" },
              { label: "Low Risk", value: lowRisk, color: "#35a66f" },
            ];

            const maximum = Math.max(highRisk, mediumRisk, lowRisk, 1);
            const chartMaximum = Math.ceil(maximum * 1.2);
            const chartHeight = 230;
            const chartWidth = 540;
            const leftPadding = 48;
            const rightPadding = 20;
            const topPadding = 25;
            const bottomPadding = 42;
            const plotHeight =
              chartHeight - topPadding - bottomPadding;
            const plotWidth =
              chartWidth - leftPadding - rightPadding;
            const barWidth = 70;
            const gap = (plotWidth - barWidth * 3) / 4;

            return (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label={`POC6 risk level bar graph. High risk: ${highRisk}, Medium risk: ${mediumRisk}, Low risk: ${lowRisk}.`}
                  style={{
                    display: "block",
                    width: "100%",
                    minWidth: 320,
                    maxWidth: 650,
                    margin: "0 auto",
                  }}
                >
                  {[0, 1, 2, 3, 4].map((step) => {
                    const value = Math.ceil(
                      (chartMaximum * step) / 4
                    );
                    const y =
                      topPadding +
                      plotHeight -
                      (plotHeight * step) / 4;

                    return (
                      <g key={step}>
                        <line
                          className="sp-chart-grid"
                          x1={leftPadding}
                          y1={y}
                          x2={chartWidth - rightPadding}
                          y2={y}
                          stroke="#e9ebf2"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          className="sp-chart-label"
                          x={leftPadding - 10}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="#8992a5"
                        >
                          {value}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    className="sp-chart-axis"
                    x1={leftPadding}
                    y1={topPadding + plotHeight}
                    x2={chartWidth - rightPadding}
                    y2={topPadding + plotHeight}
                    stroke="#cfd4df"
                    strokeWidth="1.5"
                  />

                  {chartData.map((item, index) => {
                    const barHeight =
                      (item.value / chartMaximum) * plotHeight;
                    const x =
                      leftPadding +
                      gap * (index + 1) +
                      barWidth * index;
                    const y =
                      topPadding + plotHeight - barHeight;

                    return (
                      <g key={item.label}>
                        <rect
                          x={x}
                          y={
                            item.value > 0
                              ? y
                              : topPadding + plotHeight - 2
                          }
                          width={barWidth}
                          height={item.value > 0 ? barHeight : 2}
                          rx="7"
                          fill={item.color}
                        />

                        <text
                          x={x + barWidth / 2}
                          y={
                            item.value > 0
                              ? Math.max(y - 9, 14)
                              : topPadding + plotHeight - 10
                          }
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="700"
                          fill={item.color}
                        >
                          {item.value}
                        </text>

                        <text
                          className="sp-chart-label"
                          x={x + barWidth / 2}
                          y={chartHeight - 15}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#596579"
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}

          <p
            className="sp-chart-footnote"
            style={{
              fontSize: 11,
              color: "#8992a5",
              margin: "8px 0 0",
              textAlign: "center",
            }}
          >
            Chart values update automatically after a successful POC6 scan.
          </p>
        </section>

        <section
          className="sp-section"
          style={{
            background: "#fff",
            border: "1px solid #e9ebf2",
            borderRadius: 15,
            marginTop: 28,
            overflow: "hidden",
          }}
        >
          <div
            className="sp-queue-header"
            style={{
              padding: 22,
              borderBottom: "1px solid #edf0f5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, margin: "0 0 5px" }}>
                Threat Queue
              </h2>
              <p
                className="sp-threat-subtitle"
                style={{ color: "#7b8498", fontSize: 12, margin: 0 }}
              >
                Review suspicious and unwanted messages
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                className="sp-search-box"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #e5e8f0",
                  borderRadius: 9,
                  padding: "8px 10px",
                }}
              >
                <Search size={16} color="#7b8498" />
                <input
                  className="sp-search-input"
                  aria-label="Search threats"
                  placeholder="Search threats..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  style={{
                    width: 145,
                    border: 0,
                    outline: "none",
                    fontSize: 12,
                  }}
                />
              </div>

              <select
                className="sp-filter-select"
                aria-label="Filter threats"
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as
                      | "ALL"
                      | "PHISHING"
                      | "SPAM"
                      | "FLOODING"
                  )
                }
                style={{
                  border: "1px solid #e5e8f0",
                  borderRadius: 9,
                  padding: 9,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All threats</option>
                <option value="PHISHING">Phishing examples</option>
                <option value="SPAM">Spam</option>
                <option value="FLOODING">Email flooding</option>
              </select>
            </div>
          </div>

          {filteredThreats.length === 0 ? (
            <div
              className="sp-empty-state"
              style={{
                textAlign: "center",
                padding: 35,
                color: "#7b8498",
              }}
            >
              No matching threats found.
            </div>
          ) : (
            filteredThreats.map((threat) => (
              <div
                key={threat.id}
                className="sp-threat-row"
                style={{
                  padding: "19px 22px",
                  borderBottom: "1px solid #edf0f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    className={
                      threat.type === "PHISHING"
                        ? "sp-threat-icon-phishing"
                        : threat.type === "FLOODING"
                          ? "sp-threat-icon-flooding"
                          : "sp-threat-icon-spam"
                    }
                    style={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: getThreatBackground(threat.type),
                      color: getThreatColor(threat.type),
                    }}
                  >
                    {threat.type === "PHISHING" ? (
                      <ShieldAlert size={21} />
                    ) : threat.type === "FLOODING" ? (
                      <Activity size={21} />
                    ) : (
                      <Mail size={21} />
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 9,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: 14 }}>
                        {threat.sender}
                      </strong>

                      <span
                        className={
                          threat.type === "PHISHING"
                            ? "sp-threat-type-phishing"
                            : threat.type === "FLOODING"
                              ? "sp-threat-type-flooding"
                              : "sp-threat-type-spam"
                        }
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          borderRadius: 5,
                          padding: "4px 6px",
                          background: getThreatBackground(threat.type),
                          color: getThreatColor(threat.type),
                        }}
                      >
                        {threat.type}
                      </span>

                      {threat.isDemo && (
                        <span
                          className="sp-demo-tag"
                          style={{
                            fontSize: 9,
                            color: "#667085",
                            background: "#f0f1f5",
                            padding: "3px 6px",
                            borderRadius: 5,
                          }}
                        >
                          DEMO
                        </span>
                      )}

                      {threat.riskScore !== undefined && (
                        <span
                          className="sp-risk-score-tag"
                          style={{
                            fontSize: 10,
                            color: "#7046d9",
                            background: "#f3edff",
                            padding: "3px 6px",
                            borderRadius: 5,
                          }}
                        >
                          Risk score: {threat.riskScore}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        margin: "6px 0",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {threat.subject}
                    </p>

                    <span
                      className="sp-threat-category"
                      style={{ fontSize: 11, color: "#7b8498" }}
                    >
                      {threat.category}
                      {threat.timestamp
                        ? ` • ${new Date(threat.timestamp).toLocaleString()}`
                        : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="sp-review-button"
                  onClick={() => setSelectedThreat(threat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    border: "1px solid #dfe4ff",
                    color: "#4c5ee1",
                    background: "#f7f8ff",
                    borderRadius: 9,
                    padding: "9px 13px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Review <ChevronRight size={15} />
                </button>
              </div>
            ))
          )}
        </section>
      </main>

      {selectedThreat && (
        <div
          role="presentation"
          onClick={() => setSelectedThreat(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#11182766",
            zIndex: 200,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <section
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="threat-detail-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 540,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 20px 60px #0002",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: getThreatColor(selectedThreat.type),
                  }}
                >
                  {selectedThreat.type}
                </span>

                <h2
                  id="threat-detail-title"
                  style={{ fontSize: 20, margin: "8px 0" }}
                >
                  {selectedThreat.sender}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close threat details"
                className="sp-modal-close"
                onClick={() => setSelectedThreat(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="sp-modal-info"
              style={{
                background: "#f7f8fc",
                borderRadius: 10,
                padding: 14,
                marginTop: 12,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#778197",
                  margin: "0 0 5px",
                }}
              >
                SUBJECT
              </p>
              <strong>{selectedThreat.subject}</strong>

              <p
                style={{
                  fontSize: 12,
                  color: "#778197",
                  margin: "15px 0 5px",
                }}
              >
                SENDER
              </p>

              <p
                style={{
                  fontSize: 13,
                  margin: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {selectedThreat.email}
              </p>

              <p
                style={{
                  fontSize: 12,
                  color: "#778197",
                  margin: "15px 0 5px",
                }}
              >
                CATEGORY
              </p>

              <p style={{ fontSize: 13, margin: 0 }}>
                {selectedThreat.category}
              </p>

              {selectedThreat.riskScore !== undefined && (
                <>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#778197",
                      margin: "15px 0 5px",
                    }}
                  >
                    RISK SCORE
                  </p>
                  <strong>{selectedThreat.riskScore}</strong>
                </>
              )}
            </div>

            <h3 style={{ fontSize: 14, marginTop: 20 }}>
              Detection details
            </h3>

            <p
              className="sp-modal-description"
              style={{
                color: "#667085",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {selectedThreat.reason}
            </p>

            {selectedThreat.type === "PHISHING" && (
              <p
                className="sp-phishing-notice"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: 12,
                  background: "#fff1f1",
                  borderRadius: 9,
                  color: "#b4232d",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <AlertTriangle size={17} />
                Do not click links or provide passwords, OTPs, or card details
                in suspicious messages.
              </p>
            )}

            {selectedThreat.type === "FLOODING" && (
              <p
                className="sp-flooding-notice"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: 12,
                  background: "#f3edff",
                  borderRadius: 9,
                  color: "#7046d9",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <Activity size={17} />
                POC6 is reporting a possible email-flooding pattern. This is
                report-only: no email has been moved or deleted.
              </p>
            )}

            <button
              type="button"
              onClick={() => setSelectedThreat(null)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                border: 0,
                borderRadius: 9,
                background: "#4d5fe5",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}