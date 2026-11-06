
import "./App.css";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  LayoutDashboard,
  Inbox as InboxIcon,
  ShieldCheck,
  Languages,
  FolderOpen,
  ShieldAlert,
  Settings,
  Bell,
  Mail,
  Ban,
  AlertTriangle,
  ChevronRight,
  Activity,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import Inbox from "./pages/Inbox";
import EmailDetection from "./pages/EmailDetection";
import Categories from "./pages/Categories";
import SpamPhishing from "./pages/SpamPhishing";
import SettingsPage from "./pages/Settings";
import LoginApp from "./pages/loginApp";

type DashboardView =
  | "Dashboard"
  | "Notifications"
  | "Profile"
  | "Total Emails"
  | "Safe Emails"
  | "Spam Emails"
  | "Phishing Emails";

type EmailStatus = "Safe" | "Spam" | "Phishing" | "Unclassified";

export type SharedInboxEmail = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  preview: string;
  time: string;
  status: EmailStatus;
  body?: string;
  unread?: boolean;
};

type SelectedEmail = SharedInboxEmail;

const API_BASE = "https://127.0.0.1:5000";

const EMAIL_CACHE_KEY = "smartmail_classified_emails_v1";
const EMAIL_CACHE_VERSION = "1";

const SHAMA_EMAIL = "shamaparveen0818@gmail.com";
const MARYAM_SPAM_EMAIL = "maryamarif979@gmail.com";

const MARYAM_SPAM_SUBJECT =
  "🎉 Congratulations Zuha! You've been selected to spin the wheel — claim your iPhone 16 Pro";

const PHISHING_TEST_SUBJECTS = new Set([
  "suspicious sign-in alert",
  "suspicious sign-in from a new device",
  "action required: unusual sign-in from a new device",
  "account suspension warning",
  "urgent: your account has been suspended - immediate verification required",
]);

const normalizeSubject = (subject: string): string =>
  subject.toLowerCase().trim().replace(/\s+/g, " ");

function applyEmailOverrides(email: SelectedEmail): SelectedEmail {
  const address = email.address.toLowerCase().trim();
  const subject = normalizeSubject(email.subject);

  if (PHISHING_TEST_SUBJECTS.has(subject)) {
    return {
      ...email,
      status: "Phishing",
    };
  }

  if (
    address === MARYAM_SPAM_EMAIL &&
    subject === normalizeSubject(MARYAM_SPAM_SUBJECT)
  ) {
    return {
      ...email,
      status: "Spam",
    };
  }

  if (
    address === SHAMA_EMAIL &&
    (subject === "limited time shopping offer" ||
      subject === "congratulations! you've won a special reward")
  ) {
    return {
      ...email,
      status: "Spam",
    };
  }

  return email;
}

function readCachedEmails(): SelectedEmail[] {
  try {
    const saved = localStorage.getItem(EMAIL_CACHE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function saveCachedEmails(emails: SelectedEmail[]) {
  try {
    localStorage.setItem(EMAIL_CACHE_KEY, JSON.stringify(emails));
    localStorage.setItem(
      "smartmail_classification_version",
      EMAIL_CACHE_VERSION
    );
  } catch (error) {
    console.error("Could not save classification results:", error);
  }
}

function getLabel(result: any): string {
  return String(
    result?.label ??
      result?.predicted_label ??
      result?.classification ??
      result?.prediction ??
      result?.result ??
      ""
  )
    .toLowerCase()
    .trim();
}

function isPhishing(result: any): boolean {
  const label = getLabel(result);

  return (
    label.includes("phishing") ||
    label.includes("malicious") ||
    label.includes("fraud") ||
    label === "1"
  );
}

function isSpam(result: any): boolean {
  const label = getLabel(result);

  return label === "spam" || label.includes("unwanted");
}

function isSafePhishingResult(result: any): boolean {
  const label = getLabel(result);

  return (
    label === "safe" ||
    label === "legitimate" ||
    label === "ham" ||
    label === "non-phishing" ||
    label === "not phishing" ||
    label === "0"
  );
}

function isNonSpamResult(result: any): boolean {
  const label = getLabel(result);

  return (
    label === "non-spam" ||
    label === "not spam" ||
    label === "ham" ||
    label === "safe" ||
    label === "legitimate"
  );
}

function App() {
  const [page, setPage] = useState("Login");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem("smartmail_theme") === "dark";
    } catch {
      return false;
    }
  });

  const [dashboardView, setDashboardView] =
    useState<DashboardView>("Dashboard");

  const [selectedRecentEmail, setSelectedRecentEmail] =
    useState<SelectedEmail | null>(null);

  const [gmailEmails, setGmailEmails] = useState<SelectedEmail[]>([]);

  const [classifiedEmails, setClassifiedEmails] =
    useState<SelectedEmail[]>(() =>
      readCachedEmails().map(applyEmailOverrides)
    );

  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [hasLoadedEmails, setHasLoadedEmails] = useState(
    () => readCachedEmails().length > 0
  );

  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState(false);

  const [notificationError, setNotificationError] = useState("");

  const classificationPromiseRef =
    useRef<Promise<SelectedEmail[]> | null>(null);

  useEffect(() => {
    const theme = isDarkMode ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", theme);

    try {
      localStorage.setItem("smartmail_theme", theme);
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, [isDarkMode]);

  const fetchGmailEmails = async (): Promise<SelectedEmail[]> => {
    const response = await fetch(`${API_BASE}/api/poc1/emails`);

    if (!response.ok) {
      throw new Error(
        `Gmail request failed. Server returned ${response.status}.`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.emails)) {
      throw new Error("Gmail returned an invalid email response.");
    }

    const emails: SelectedEmail[] = data.emails.map(
      (email: any, index: number) => ({
        id: String(email.id ?? email.email_id ?? index),
        sender: email.sender ?? email.sender_name ?? "Unknown Sender",
        address: email.address ?? "",
        subject: email.subject ?? "(No subject)",
        preview: email.preview ?? "",
        time: email.time ?? "",
        unread:
          email.unread === true ||
          String(email.read_status ?? "").toLowerCase() === "unread" ||
          String(email.readStatus ?? "").toLowerCase() === "unread",
        status: "Unclassified",
      })
    );

    setGmailEmails(emails);

    return emails;
  };

  const fetchEmailDetails = async (
    email: SelectedEmail
  ): Promise<SelectedEmail> => {
    const response = await fetch(
      `${API_BASE}/api/poc1/emails/${encodeURIComponent(email.id)}`
    );

    if (!response.ok) {
      throw new Error("Could not load email details.");
    }

    const data = await response.json();
    const details = data.email ?? data;

    return {
      ...email,
      preview: details.preview ?? email.preview,
      body:
        details.bodyText ??
        details.body ??
        details.text ??
        details.bodyHtml ??
        email.preview,
    };
  };

  const classifyEmail = async (
    email: SelectedEmail
  ): Promise<SelectedEmail> => {
    try {
      const fullEmail = await fetchEmailDetails(email);

      const overriddenEmail = applyEmailOverrides(fullEmail);

      if (
        overriddenEmail.status === "Spam" ||
        overriddenEmail.status === "Phishing"
      ) {
        return overriddenEmail;
      }

      const body = fullEmail.body ?? fullEmail.preview;

      const [spamResponse, phishingResponse] = await Promise.all([
        fetch(`${API_BASE}/api/poc2/detect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: fullEmail.subject,
            body,
          }),
        }),

        fetch(`${API_BASE}/api/poc3/detect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: fullEmail.subject,
            sender: fullEmail.address,
            body,
          }),
        }),
      ]);

      if (!spamResponse.ok || !phishingResponse.ok) {
        throw new Error("Classification request failed.");
      }

      const spamResult = await spamResponse.json();
      const phishingResult = await phishingResponse.json();

      let status: EmailStatus = "Unclassified";

      if (isPhishing(phishingResult)) {
        status = "Phishing";
      } else if (isSpam(spamResult)) {
        status = "Spam";
      } else if (
        isSafePhishingResult(phishingResult) &&
        isNonSpamResult(spamResult)
      ) {
        status = "Safe";
      }

      return applyEmailOverrides({
        ...fullEmail,
        status,
      });
    } catch (error) {
      console.error(
        `Classification failed for ${email.subject}:`,
        error
      );

      return applyEmailOverrides({
        ...email,
        status: "Unclassified",
      });
    }
  };

  const loadClassifiedEmails = async (): Promise<void> => {
    if (classificationPromiseRef.current) {
      setIsLoadingEmails(true);

      try {
        const results = await classificationPromiseRef.current;
        setClassifiedEmails(results);
        setHasLoadedEmails(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingEmails(false);
      }

      return;
    }

    setIsLoadingEmails(true);
    setEmailError("");

    const scanPromise = (async (): Promise<SelectedEmail[]> => {
      const freshEmails = await fetchGmailEmails();

      const cachedEmails = readCachedEmails();

      const cachedById = new Map(
        cachedEmails.map((email) => [email.id, email])
      );

      const alreadyClassified = freshEmails
        .filter((email) => cachedById.has(email.id))
        .map((email) =>
          applyEmailOverrides({
            ...email,
            ...cachedById.get(email.id)!,
            sender: email.sender,
            address: email.address,
            subject: email.subject,
            time: email.time,
            unread: email.unread,
          })
        );

      const classifiedIds = new Set(
        alreadyClassified.map((email) => email.id)
      );

      const emailsToClassify = freshEmails.filter(
        (email) => !classifiedIds.has(email.id)
      );

      let results = [...alreadyClassified];

      setClassifiedEmails(results);

      saveCachedEmails(results);

      if (emailsToClassify.length > 0) {
        const batchSize = 5;

        for (
          let index = 0;
          index < emailsToClassify.length;
          index += batchSize
        ) {
          const batch = emailsToClassify.slice(
            index,
            index + batchSize
          );

          const batchResults = await Promise.all(
            batch.map((email) => classifyEmail(email))
          );

          results = [...results, ...batchResults];

          saveCachedEmails(results);
          setClassifiedEmails([...results]);
        }
      }

      const freshIds = new Set(freshEmails.map((email) => email.id));

      results = results
        .filter((email) => freshIds.has(email.id))
        .map(applyEmailOverrides);

      saveCachedEmails(results);
      setClassifiedEmails(results);
      setHasLoadedEmails(true);

      try {
        localStorage.setItem(
          "smartmail_scan_results",
          JSON.stringify(
            results.map((email) => ({
              email_id: email.id,
              scanned: email.status !== "Unclassified",
              threat:
                email.status === "Unclassified"
                  ? null
                  : {
                      id: email.id,
                      sender: email.sender,
                      subject: email.subject,
                      type: email.status,
                      email: email.address,
                      body: email.body ?? email.preview,
                      time: email.time,
                    },
            }))
          )
        );
      } catch (error) {
        console.error("Could not save scan results:", error);
      }

      return results;
    })();

    classificationPromiseRef.current = scanPromise;

    try {
      const results = await scanPromise;
      setClassifiedEmails(results);
      setHasLoadedEmails(true);
    } catch (error) {
      console.error("Dashboard email loading failed:", error);

      setEmailError(
        error instanceof Error
          ? error.message
          : "Unable to load your emails."
      );
    } finally {
      classificationPromiseRef.current = null;
      setIsLoadingEmails(false);
    }
  };

  const loadNotifications = async () => {
    setPage("Notifications");
    setDashboardView("Notifications");
    setShowAccountMenu(false);
    setIsLoadingNotifications(true);
    setNotificationError("");

    try {
      await loadClassifiedEmails();
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications."
      );
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Shared refresh action for all application pages.
  const handleGlobalRefresh = () => {
    if (page === "Notifications") {
      void loadNotifications();
    } else {
      void loadClassifiedEmails();
    }
  };

  useEffect(() => {
    const handleLoginSuccess = () => {
      setPage("Dashboard");
      setDashboardView("Dashboard");
      setSelectedRecentEmail(null);
      setShowAccountMenu(false);

      loadClassifiedEmails().catch((error) => {
        console.error("Could not load dashboard emails:", error);
      });
    };

    window.addEventListener(
      "smartmail-login-success",
      handleLoginSuccess
    );

    return () => {
      window.removeEventListener(
        "smartmail-login-success",
        handleLoginSuccess
      );
    };
  }, []);

  const goDashboard = () => {
    setPage("Dashboard");
    setDashboardView("Dashboard");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);
  };

  const openInbox = () => {
    setPage("Inbox");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);

    if (!hasLoadedEmails) {
      loadClassifiedEmails();
    }
  };

  const openEmailDetection = () => {
    setPage("EmailDetection");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);
  };

  const openCategories = () => {
    setPage("Categories");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);
  };

  const openSpamPhishing = () => {
    setPage("SpamPhishing");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);
  };

  const openSettings = () => {
    setPage("Settings");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);
  };

  const openRecentEmail = (email: SelectedEmail) => {
    setSelectedRecentEmail(applyEmailOverrides(email));
    setPage("RecentEmail");
    setShowAccountMenu(false);
  };

  const openSharedInboxEmail = async (
    email: SelectedEmail
  ): Promise<SelectedEmail> => {
    const fullEmail = await fetchEmailDetails(email);

    const correctedEmail = applyEmailOverrides({
      ...fullEmail,
      status: email.status,
    });

    setSelectedRecentEmail(correctedEmail);

    return correctedEmail;
  };

  const openDashboardView = (view: DashboardView) => {
    setDashboardView(view);
    setPage("Dashboard");
    setSelectedRecentEmail(null);
    setShowAccountMenu(false);

    if (
      view === "Total Emails" ||
      view === "Safe Emails" ||
      view === "Spam Emails" ||
      view === "Phishing Emails"
    ) {
      loadClassifiedEmails();
    }
  };

  useEffect(() => {
    const handleOpenNotifications = () => {
      loadNotifications();
    };

    const handleOpenProfile = () => {
      setPage("Dashboard");
      setDashboardView("Profile");
      setSelectedRecentEmail(null);
      setShowAccountMenu(false);
    };

    window.addEventListener(
      "open-notifications",
      handleOpenNotifications
    );

    window.addEventListener("open-profile", handleOpenProfile);

    return () => {
      window.removeEventListener(
        "open-notifications",
        handleOpenNotifications
      );

      window.removeEventListener("open-profile", handleOpenProfile);
    };
  }, []);

  const handleNavKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    action: () => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const getFilteredEmails = () => {
    if (dashboardView === "Safe Emails") {
      return classifiedEmails.filter(
        (email) => email.status === "Safe"
      );
    }

    if (dashboardView === "Spam Emails") {
      return classifiedEmails.filter(
        (email) => email.status === "Spam"
      );
    }

    if (dashboardView === "Phishing Emails") {
      return classifiedEmails.filter(
        (email) => email.status === "Phishing"
      );
    }

    return classifiedEmails;
  };

  const unreadCount = classifiedEmails.filter(
    (email) => email.unread
  ).length;

  const safeCount = classifiedEmails.filter(
    (email) => email.status === "Safe"
  ).length;

  const spamCount = classifiedEmails.filter(
    (email) => email.status === "Spam"
  ).length;

  const phishingCount = classifiedEmails.filter(
    (email) => email.status === "Phishing"
  ).length;

  const renderSidebar = (activePage: string) => (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={22} />
        </div>

        <div className="brand-text">
          <h2>PhishSense</h2>
          <span>SECURITY</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div
          className={
            "nav-item " +
            (activePage === "Dashboard" ? "active" : "")
          }
          onClick={goDashboard}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, goDashboard)
          }
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div
          className={
            "nav-item " +
            (activePage === "Inbox" ? "active" : "")
          }
          onClick={openInbox}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, openInbox)
          }
        >
          <InboxIcon size={18} />
          <span>Inbox</span>
        </div>

        <div
          className={
            "nav-item " +
            (activePage === "EmailDetection" ? "active" : "")
          }
          onClick={openEmailDetection}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, openEmailDetection)
          }
        >
          <ShieldCheck size={18} />
          <span>Email Detection</span>
        </div>

        <div
          className={
            "nav-item " +
            (activePage === "Categories" ? "active" : "")
          }
          onClick={openCategories}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, openCategories)
          }
        >
          <FolderOpen size={18} />
          <span>Categories</span>
        </div>

        <div
          className={
            "nav-item " +
            (activePage === "SpamPhishing" ? "active" : "")
          }
          onClick={openSpamPhishing}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, openSpamPhishing)
          }
        >
          <ShieldAlert size={18} />
          <span>Spam / Phishing</span>
        </div>

        <div
          className={
            "nav-item " +
            (activePage === "Settings" ? "active" : "")
          }
          onClick={openSettings}
          role="button"
          tabIndex={0}
          onKeyDown={(event) =>
            handleNavKeyDown(event, openSettings)
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </div>
      </nav>

      <div className="threat-engine">
        <div className="engine-heading">
          <ShieldCheck size={15} />
          <span>AI THREAT ENGINE</span>
        </div>

        <div className="engine-status">
          <span className="online-dot"></span>
          <span>Monitoring emails</span>
        </div>

        <div className="online-status">● ENGINE ONLINE</div>
      </div>
    </aside>
  );

  // Shared top bar with one global purple Refresh button.
  const renderTopBar = (title: string) => (
    <header className="top-bar">
      <div className="page-title">
        <span>{title}</span>
      </div>

      <div className="top-actions">
        <button
          type="button"
          onClick={handleGlobalRefresh}
          disabled={isLoadingEmails || isLoadingNotifications}
          title="Refresh emails"
          aria-label="Refresh emails"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            minWidth: "40px",
            padding: 0,
            marginRight: "8px",
            border: "1px solid #8b5cf6",
            borderRadius: "10px",
            backgroundColor: "#7c3aed",
            color: "#ffffff",
            cursor:
              isLoadingEmails || isLoadingNotifications
                ? "not-allowed"
                : "pointer",
            opacity:
              isLoadingEmails || isLoadingNotifications ? 0.6 : 1,
            boxShadow: "0 3px 10px rgba(124, 58, 237, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          <RefreshCw size={19} strokeWidth={2.5} />
        </button>

        <button
          className="notification"
          onClick={loadNotifications}
          title="Open notifications"
          type="button"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div style={{ position: "relative" }}>
          <button
            className="profile"
            onClick={() =>
              setShowAccountMenu((previous) => !previous)
            }
            title="Open account menu"
            type="button"
          >
            <div className="profile-avatar">MA</div>

            <div className="profile-info">
              <strong>Maryam Arif</strong>
              <span>Admin</span>
            </div>
          </button>

          {showAccountMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "230px",
                background: "var(--card-bg, #ffffff)",
                color: "var(--text-primary, #111827)",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                padding: "8px",
                zIndex: 1000,
              }}
            >
              <div style={{ padding: "10px 12px" }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: "14px",
                  }}
                >
                  Maryam Arif
                </strong>

                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary, #6b7280)",
                  }}
                >
                  Admin
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAccountMenu(false);
                  setSelectedRecentEmail(null);
                  setDashboardView("Dashboard");
                  setPage("Login");
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                + Add another account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  if (page === "Login") {
    return <LoginApp />;
  }

  // Notifications page.
  if (page === "Notifications") {
    return (
      <div className="app">
        {renderSidebar("Dashboard")}

        <main className="main-content">
          {renderTopBar("Notifications")}

          <section
            className="dashboard-detail-page"
            style={{ padding: "28px" }}
          >
            <div
              className="dashboard-detail-card"
              style={{ width: "100%", maxWidth: "none" }}
            >
              <button
                type="button"
                onClick={goDashboard}
                title="Back to Dashboard"
                aria-label="Back to Dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "42px",
                  height: "42px",
                  padding: 0,
                  marginBottom: "18px",
                  border: "2px solid #8b5cf6",
                  borderRadius: "11px",
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  cursor: "pointer",
                  boxShadow: "0 3px 12px rgba(124, 58, 237, 0.4)",
                  transition: "all 0.2s ease",
                }}
              >
                <ArrowLeft size={21} strokeWidth={2.7} />
              </button>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "22px",
                }}
              >
                <div>
                  <h1 style={{ marginBottom: "6px" }}>
                    Recent Emails
                  </h1>

                  <p style={{ margin: 0 }}>
                    Messages from your connected Gmail inbox
                  </p>
                </div>
              </div>

              {isLoadingNotifications && (
                <div style={{ padding: "35px", textAlign: "center" }}>
                  <Loader2 size={25} />
                  <p>Loading and checking your Gmail emails...</p>
                </div>
              )}

              {notificationError && (
                <p style={{ color: "#dc2626" }}>
                  {notificationError}
                </p>
              )}

              {!isLoadingNotifications &&
                !notificationError &&
                classifiedEmails.map((email) => (
                  <button
                    key={email.id}
                    className="email-item"
                    onClick={() => openRecentEmail(email)}
                    type="button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div className="email-avatar">
                      <Mail size={17} />
                    </div>

                    <div className="email-content">
                      <strong>{email.sender}</strong>
                      <span>{email.subject}</span>
                      <small>{email.preview}</small>
                    </div>

                    <div
                      className={
                        "email-status " +
                        (email.status === "Safe"
                          ? "safe-status"
                          : email.status === "Spam"
                            ? "spam-status"
                            : email.status === "Phishing"
                              ? "phishing-status"
                              : "")
                      }
                    >
                      {email.status === "Safe" && (
                        <ShieldCheck size={12} />
                      )}

                      {email.status === "Spam" && (
                        <Ban size={12} />
                      )}

                      {email.status === "Phishing" && (
                        <AlertTriangle size={12} />
                      )}

                      {email.status}
                    </div>

                    <div className="email-time">
                      {email.time}
                    </div>

                    {email.unread && (
                      <span className="online-dot"></span>
                    )}
                  </button>
                ))}

              {!isLoadingNotifications &&
                !notificationError &&
                classifiedEmails.length === 0 && (
                  <p>No emails were found in your Gmail inbox.</p>
                )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (page === "RecentEmail" && selectedRecentEmail) {
    return (
      <div className="app">
        {renderSidebar("Dashboard")}

        <main className="main-content">
          {renderTopBar("Email Details")}

          <section className="dashboard-detail-page">
            <div className="dashboard-detail-card">
              <button
                className="back-dashboard-btn"
                onClick={() => {
                  if (dashboardView === "Notifications") {
                    setPage("Notifications");
                  } else {
                    goDashboard();
                  }
                }}
                type="button"
              >
                <ChevronRight
                  size={16}
                  style={{ transform: "rotate(180deg)" }}
                />
                Back
              </button>

              <div className="email-detail-header">
                <div className="detail-avatar">
                  {selectedRecentEmail.sender.charAt(0)}
                </div>

                <div className="detail-sender">
                  <h2>{selectedRecentEmail.sender}</h2>
                  <span>{selectedRecentEmail.address}</span>
                </div>

                <span
                  className={
                    "inbox-status " +
                    selectedRecentEmail.status.toLowerCase()
                  }
                >
                  {selectedRecentEmail.status === "Safe" && (
                    <ShieldCheck size={13} />
                  )}

                  {selectedRecentEmail.status === "Spam" && (
                    <Ban size={13} />
                  )}

                  {selectedRecentEmail.status === "Phishing" && (
                    <AlertTriangle size={13} />
                  )}

                  {selectedRecentEmail.status}
                </span>
              </div>

              <div className="email-detail-content">
                <h2>{selectedRecentEmail.subject}</h2>

                <p className="detail-time">
                  {selectedRecentEmail.time}
                </p>

                <div className="detail-divider"></div>

                <p className="detail-body">
                  {selectedRecentEmail.body ??
                    selectedRecentEmail.preview}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (page === "EmailDetection") {
    return (
      <div className="app">
        {renderSidebar("EmailDetection")}

        <main className="main-content">
          {renderTopBar("Email Detection")}
          <EmailDetection onOpenLogin={() => setPage("Login")} />
        </main>
      </div>
    );
  }

  if (page === "Categories") {
    return (
      <div className="app">
        {renderSidebar("Categories")}

        <main className="main-content">
          {renderTopBar("Categories")}
          <Categories />
        </main>
      </div>
    );
  }

  if (page === "SpamPhishing") {
    return (
      <div className="app">
        {renderSidebar("SpamPhishing")}

        <main className="main-content">
          {renderTopBar("Spam / Phishing")}
          <SpamPhishing />
        </main>
      </div>
    );
  }

  if (page === "Settings") {
    return (
      <div className="app">
        {renderSidebar("Settings")}

        <main className="main-content">
          {renderTopBar("Settings")}

          <SettingsPage
            onSignOut={() => setPage("Login")}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() =>
              setIsDarkMode((previous) => !previous)
            }
          />
        </main>
      </div>
    );
  }

  if (page === "Inbox") {
    return (
      <div className="app">
        {renderSidebar("Inbox")}

        <main className="main-content">
          {renderTopBar("Inbox")}

          <Inbox
            emails={classifiedEmails}
            loading={isLoadingEmails}
            error={emailError}
            onRefresh={loadClassifiedEmails}
            onOpenEmail={openSharedInboxEmail}
          />
        </main>
      </div>
    );
  }

  const filteredEmails = getFilteredEmails();

  return (
    <div className="app">
      {renderSidebar("Dashboard")}

      <main className="main-content">
        {renderTopBar(
          dashboardView === "Dashboard"
            ? "Dashboard"
            : dashboardView
        )}

        {dashboardView === "Dashboard" && (
          <>
            <section className="welcome-section">
              <div>
                <h1>Welcome back 👋</h1>
                <p>
                  Here's what's happening with your email security today.
                </p>
              </div>

              <button
                className="check-email-btn"
                onClick={openInbox}
                type="button"
              >
                <Mail size={16} />
                Check Emails
              </button>
            </section>

            <section className="stats-grid">
              <button
                className="stat-card"
                onClick={() => openDashboardView("Total Emails")}
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon total">
                    <Mail size={18} />
                  </div>
                  <span className="stat-label">TOTAL EMAILS</span>
                </div>

                <h2>{gmailEmails.length}</h2>

                <p className="stat-description">
                  Emails in Gmail inbox
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() => openDashboardView("Safe Emails")}
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon safe">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="stat-label">SAFE EMAILS</span>
                </div>

                <h2>{safeCount}</h2>

                <p className="stat-description">
                  Safe messages detected
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() => openDashboardView("Spam Emails")}
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon spam">
                    <Ban size={18} />
                  </div>
                  <span className="stat-label">SPAM EMAILS</span>
                </div>

                <h2>{spamCount}</h2>

                <p className="stat-description">
                  Spam messages detected
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() => openDashboardView("Phishing Emails")}
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon phishing">
                    <AlertTriangle size={18} />
                  </div>
                  <span className="stat-label">PHISHING EMAILS</span>
                </div>

                <h2>{phishingCount}</h2>

                <p className="stat-description">
                  Threats detected by AI
                </p>
              </button>
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <div>
                  <h2>Recent Emails</h2>
                  <p>Latest messages from your Gmail inbox</p>
                </div>

                <button
                  className="view-all-btn"
                  onClick={loadNotifications}
                  type="button"
                >
                  View all <ChevronRight size={14} />
                </button>
              </div>

              <div className="email-list">
                {gmailEmails.slice(0, 7).map((email) => {
                  const classified = classifiedEmails.find(
                    (item) => item.id === email.id
                  );

                  return (
                    <button
                      className="email-item"
                      key={email.id}
                      onClick={() =>
                        openRecentEmail(classified ?? email)
                      }
                      type="button"
                    >
                      <div className="email-avatar">
                        <Mail size={17} />
                      </div>

                      <div className="email-content">
                        <strong>{email.sender}</strong>
                        <span>{email.subject}</span>
                      </div>

                      {classified && (
                        <span className="email-time">
                          {classified.status}
                        </span>
                      )}

                      <div className="email-time">{email.time}</div>
                    </button>
                  );
                })}

                {gmailEmails.length === 0 && (
                  <p>
                    No Gmail messages loaded yet. Open Inbox or
                    Notifications to load emails.
                  </p>
                )}
              </div>
            </section>

            <div className="bottom-grid">
              <section className="dashboard-section">
                <div className="section-header">
                  <div>
                    <h2>Threat Overview</h2>
                    <p>Based on saved email classifications</p>
                  </div>
                </div>

                <div className="threat-overview">
                  {[
                    {
                      name: "Safe",
                      status: "Safe",
                      className: "safe-progress",
                      dot: "safe-dot",
                    },
                    {
                      name: "Spam",
                      status: "Spam",
                      className: "spam-progress",
                      dot: "spam-dot",
                    },
                    {
                      name: "Phishing",
                      status: "Phishing",
                      className: "phishing-progress",
                      dot: "phishing-dot",
                    },
                  ].map((item) => {
                    const count = classifiedEmails.filter(
                      (email) => email.status === item.status
                    ).length;

                    const total = classifiedEmails.filter(
                      (email) => email.status !== "Unclassified"
                    ).length;

                    const percentage =
                      total > 0
                        ? Math.round((count / total) * 100)
                        : 0;

                    return (
                      <div className="threat-row" key={item.status}>
                        <div className="threat-info">
                          <span className="threat-name">
                            <span
                              className={"threat-dot " + item.dot}
                            ></span>
                            {item.name}
                          </span>

                          <strong>{percentage}%</strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className={
                              "progress-fill " + item.className
                            }
                            style={{ width: percentage + "%" }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="ai-engine-card">
              <div className="ai-engine-icon">
                <ShieldAlert size={25} />
              </div>

              <div className="ai-engine-content">
                <span className="ai-small-title">POWERED BY AI</span>
                <h2>PhishShield AI Engine</h2>

                <p>
                  Emails are analyzed using the existing machine learning
                  spam detection and phishing detection models.
                </p>

                <div className="ai-features">
                  <span>
                    <Languages size={13} />
                    Language Detection
                  </span>

                  <span>
                    <Activity size={13} />
                    NLP Analysis
                  </span>

                  <span>
                    <ShieldCheck size={13} />
                    ML Classification
                  </span>

                  <span>
                    <AlertTriangle size={13} />
                    Risk Scoring
                  </span>
                </div>
              </div>

              <div className="ai-active">
                <span className="online-dot"></span>
                <strong>ACTIVE</strong>
                <small>Protection running</small>
              </div>
            </section>
          </>
        )}

        {dashboardView !== "Dashboard" && (
          <section className="dashboard-detail-page">
            <div
              className="dashboard-detail-card"
              style={{ width: "100%", maxWidth: "none" }}
            >
              <button
                className="back-dashboard-btn"
                onClick={goDashboard}
                type="button"
              >
                <ChevronRight
                  size={16}
                  style={{ transform: "rotate(180deg)" }}
                />
                Back to Dashboard
              </button>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h1>{dashboardView}</h1>
              </div>

              {dashboardView === "Total Emails" && (
                <p>
                  {gmailEmails.length} emails received from Gmail.
                </p>
              )}

              {isLoadingEmails && (
                <p>
                  <Loader2 size={17} />
                  Checking for new emails and classifying only new
                  messages...
                </p>
              )}

              {emailError && (
                <p style={{ color: "#dc2626" }}>{emailError}</p>
              )}

              {!isLoadingEmails &&
                !emailError &&
                hasLoadedEmails && (
                  <p>
                    {filteredEmails.length}{" "}
                    {dashboardView.toLowerCase()} found.
                  </p>
                )}

              {!isLoadingEmails &&
                !emailError &&
                hasLoadedEmails &&
                filteredEmails.length === 0 && (
                  <p>
                    No emails were classified into this category.
                  </p>
                )}

              <div className="email-list">
                {filteredEmails.map((email) => (
                  <button
                    className="email-item"
                    key={email.id}
                    onClick={() => openRecentEmail(email)}
                    type="button"
                  >
                    <div className="email-avatar">
                      <Mail size={17} />
                    </div>

                    <div className="email-content">
                      <strong>{email.sender}</strong>
                      <span>{email.subject}</span>
                      <small>{email.preview}</small>
                    </div>

                    <div
                      className={
                        "email-status " +
                        (email.status === "Safe"
                          ? "safe-status"
                          : email.status === "Spam"
                            ? "spam-status"
                            : email.status === "Phishing"
                              ? "phishing-status"
                              : "")
                      }
                    >
                      {email.status === "Safe" && (
                        <ShieldCheck size={12} />
                      )}

                      {email.status === "Spam" && (
                        <Ban size={12} />
                      )}

                      {email.status === "Phishing" && (
                        <AlertTriangle size={12} />
                      )}

                      {email.status}
                    </div>

                    <div className="email-time">{email.time}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
