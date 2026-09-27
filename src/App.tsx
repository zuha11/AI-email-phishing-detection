import "./App.css";
import { useState } from "react";
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
  User,
  CheckCircle2,
} from "lucide-react";

import Inbox from "./pages/Inbox";
import EmailDetection from "./pages/EmailDetection";
import LanguageSettings from "./pages/LanguageSettings";
import Categories from "./pages/Categories";
import SpamPhishing from "./pages/SpamPhishing";
import SettingsPage from "./pages/Settings";

type DashboardView =
  | "Dashboard"
  | "Notifications"
  | "Profile"
  | "Total Emails"
  | "Safe Emails"
  | "Spam Emails"
  | "Phishing Emails";

type SelectedEmail = {
  sender: string;
  address: string;
  subject: string;
  preview: string;
  time: string;
  status: "Safe" | "Spam" | "Phishing";
};

function App() {
  const [page, setPage] = useState("Dashboard");

  const [dashboardView, setDashboardView] =
    useState<DashboardView>("Dashboard");

  const [selectedRecentEmail, setSelectedRecentEmail] =
    useState<SelectedEmail | null>(null);

  const recentEmails: SelectedEmail[] = [
    {
      sender: "Google Security",
      address: "security@google.com",
      subject: "Security alert for your account",
      preview:
        "We detected a new sign-in to your Google account.",
      time: "10:32 AM",
      status: "Safe",
    },
    {
      sender: "Microsoft 365",
      address: "office@microsoft.com",
      subject: "Your weekly account summary",
      preview:
        "Here is your weekly summary and recent activity.",
      time: "10:14 AM",
      status: "Safe",
    },
    {
      sender: "Unknown Sender",
      address: "winner@unknown.com",
      subject:
        "Congratulations! You have won a prize",
      preview:
        "Claim your exclusive reward before it expires.",
      time: "09:48 AM",
      status: "Spam",
    },
    {
      sender: "Bank Security",
      address: "security@bank-alert.com",
      subject:
        "Verify your account information",
      preview:
        "Your account requires immediate verification.",
      time: "09:15 AM",
      status: "Phishing",
    },
    {
      sender: "College Administration",
      address: "admin@college.edu",
      subject:
        "Important notice for students",
      preview:
        "Please read the following important announcement.",
      time: "08:52 AM",
      status: "Safe",
    },
    {
      sender: "Shopping Updates",
      address: "orders@shopping.com",
      subject:
        "Your order has been shipped",
      preview:
        "Your recent order is on its way.",
      time: "08:31 AM",
      status: "Safe",
    },
    {
      sender: "Unknown Sender",
      address: "reward@claim-now.com",
      subject:
        "Claim your exclusive reward now",
      preview:
        "You have been selected for a special reward.",
      time: "08:05 AM",
      status: "Spam",
    },
  ];

  const goDashboard = () => {
    setPage("Dashboard");
    setDashboardView("Dashboard");
    setSelectedRecentEmail(null);
  };

  const openInbox = () => {
    setPage("Inbox");
    setSelectedRecentEmail(null);
  };

  const openEmailDetection = () => {
    setPage("EmailDetection");
    setSelectedRecentEmail(null);
  };

  const openLanguageSettings = () => {
    setPage("Language");
    setSelectedRecentEmail(null);
  };

  const openCategories = () => {
    setPage("Categories");
    setSelectedRecentEmail(null);
  };

  const openSpamPhishing = () => {
    setPage("SpamPhishing");
    setSelectedRecentEmail(null);
  };

  const openSettings = () => {
    setPage("Settings");
    setSelectedRecentEmail(null);
  };

  const openRecentEmail = (email: SelectedEmail) => {
    setSelectedRecentEmail(email);
    setPage("RecentEmail");
  };

  const openDashboardView = (view: DashboardView) => {
    setDashboardView(view);
    setPage("Dashboard");
    setSelectedRecentEmail(null);
  };

  /*
   * ==========================================
   * RECENT EMAIL DETAILS
   * ==========================================
   */

  if (page === "RecentEmail" && selectedRecentEmail) {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div
              className="nav-item active"
              onClick={goDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div
              className="nav-item"
              onClick={openInbox}
            >
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="top-bar">
            <div className="page-title">
              <span>Recent Email</span>
            </div>

            <div className="top-actions">
              <button
                className="notification"
                onClick={() =>
                  openDashboardView("Notifications")
                }
                title="Notifications"
                type="button"
              >
                <Bell size={18} />
                <span className="notification-count">
                  3
                </span>
              </button>

              <button
                className="profile"
                onClick={() =>
                  openDashboardView("Profile")
                }
                title="Open profile"
                type="button"
              >
                <div className="profile-avatar">
                  MA
                </div>

                <div className="profile-info">
                  <strong>Maryam Arif</strong>
                  <span>Admin</span>
                </div>
              </button>
            </div>
          </header>

          <section className="dashboard-detail-page">
            <div className="dashboard-detail-card">
              <button
                className="back-dashboard-btn"
                onClick={goDashboard}
                type="button"
              >
                <ChevronRight
                  size={16}
                  style={{
                    transform: "rotate(180deg)",
                  }}
                />
                Back to Dashboard
              </button>

              <div className="email-detail-header">
                <div className="detail-avatar">
                  {selectedRecentEmail.sender.charAt(0)}
                </div>

                <div className="detail-sender">
                  <h2>
                    {selectedRecentEmail.sender}
                  </h2>

                  <span>
                    {selectedRecentEmail.address}
                  </span>
                </div>

                <span
                  className={`inbox-status ${selectedRecentEmail.status.toLowerCase()}`}
                >
                  {selectedRecentEmail.status ===
                    "Safe" && (
                    <ShieldCheck size={13} />
                  )}

                  {selectedRecentEmail.status ===
                    "Spam" && (
                    <Ban size={13} />
                  )}

                  {selectedRecentEmail.status ===
                    "Phishing" && (
                    <AlertTriangle size={13} />
                  )}

                  {selectedRecentEmail.status}
                </span>
              </div>

              <div className="email-detail-content">
                <h2>
                  {selectedRecentEmail.subject}
                </h2>

                <p className="detail-time">
                  Today at{" "}
                  {selectedRecentEmail.time}
                </p>

                <div className="detail-divider"></div>

                <p className="detail-body">
                  {selectedRecentEmail.preview}
                </p>

                <p className="detail-body">
                  This email has been analyzed by the
                  SmartMail security system. The AI
                  engine checks the message using
                  language detection, NLP analysis,
                  machine-learning classification,
                  and risk scoring.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /*
   * ==========================================
   * EMAIL DETECTION
   * ==========================================
   */

  if (page === "EmailDetection") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-item" onClick={goDashboard}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div className="nav-item" onClick={openInbox}>
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item active"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <EmailDetection />
      </div>
    );
  }

  /*
   * ==========================================
   * CATEGORIES
   * ==========================================
   */

  if (page === "Categories") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div
              className="nav-item"
              onClick={goDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div
              className="nav-item"
              onClick={openInbox}
            >
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item active"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <Categories />
      </div>
    );
  }

  /*
   * ==========================================
   * SPAM / PHISHING
   * ==========================================
   */

  if (page === "SpamPhishing") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div
              className="nav-item"
              onClick={goDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div
              className="nav-item"
              onClick={openInbox}
            >
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item active"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <SpamPhishing />
      </div>
    );
  }

  /*
   * ==========================================
   * SETTINGS
   * ==========================================
   */

  if (page === "Settings") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div
              className="nav-item"
              onClick={goDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div
              className="nav-item"
              onClick={openInbox}
            >
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item active"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <SettingsPage />
      </div>
    );
  }

  /*
   * ==========================================
   * LANGUAGE SETTINGS
   * ==========================================
   */

  if (page === "Language") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-item" onClick={goDashboard}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div className="nav-item" onClick={openInbox}>
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item active"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <LanguageSettings />
      </div>
    );
  }

  /*
   * ==========================================
   * INBOX
   * ==========================================
   */

  if (page === "Inbox") {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="brand-text">
              <h2>SmartMail</h2>
              <span>SECURITY</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div
              className="nav-item"
              onClick={goDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>

            <div
              className="nav-item active"
              onClick={openInbox}
            >
              <InboxIcon size={18} />
              <span>Inbox</span>
            </div>

            <div
              className="nav-item"
              onClick={openEmailDetection}
            >
              <ShieldCheck size={18} />
              <span>Email Detection</span>
            </div>

            <div
              className="nav-item"
              onClick={openLanguageSettings}
            >
              <Languages size={18} />
              <span>Language</span>
            </div>

            <div
              className="nav-item"
              onClick={openCategories}
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </div>

            <div
              className="nav-item"
              onClick={openSpamPhishing}
            >
              <ShieldAlert size={18} />
              <span>Spam / Phishing</span>
            </div>

            <div
              className="nav-item"
              onClick={openSettings}
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

            <div className="online-status">
              ● ENGINE ONLINE
            </div>
          </div>
        </aside>

        <Inbox />
      </div>
    );
  }

  /*
   * ==========================================
   * DASHBOARD
   * ==========================================
   */

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={22} />
          </div>

          <div className="brand-text">
            <h2>SmartMail</h2>
            <span>SECURITY</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${
              dashboardView === "Dashboard"
                ? "active"
                : ""
            }`}
            onClick={goDashboard}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className="nav-item"
            onClick={openInbox}
          >
            <InboxIcon size={18} />
            <span>Inbox</span>
          </div>

          <div className="nav-item">
            <ShieldCheck size={18} />
            <span>Email Detection</span>
          </div>

          <div
            className="nav-item"
            onClick={openLanguageSettings}
          >
            <Languages size={18} />
            <span>Language</span>
          </div>

          <div
            className="nav-item"
            onClick={openCategories}
          >
            <FolderOpen size={18} />
            <span>Categories</span>
          </div>

          <div
            className="nav-item"
            onClick={openSpamPhishing}
          >
            <ShieldAlert size={18} />
            <span>Spam / Phishing</span>
          </div>

          <div
            className="nav-item"
            onClick={openSettings}
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

          <div className="online-status">
            ● ENGINE ONLINE
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <span>
              {dashboardView === "Dashboard"
                ? "Dashboard"
                : dashboardView}
            </span>
          </div>

          <div className="top-actions">
            <button
              className="notification"
              onClick={() =>
                openDashboardView("Notifications")
              }
              title="Notifications"
              type="button"
            >
              <Bell size={18} />
              <span className="notification-count">
                3
              </span>
            </button>

            <button
              className="profile"
              onClick={() =>
                openDashboardView("Profile")
              }
              title="Open profile"
              type="button"
            >
              <div className="profile-avatar">
                MA
              </div>

              <div className="profile-info">
                <strong>Maryam Arif</strong>
                <span>Admin</span>
              </div>
            </button>
          </div>
        </header>

        {dashboardView === "Dashboard" && (
          <>
            <section className="welcome-section">
              <div>
                <h1>Welcome back 👋</h1>

                <p>
                  Here's what's happening with your
                  email security today.
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
                onClick={() =>
                  openDashboardView("Total Emails")
                }
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon total">
                    <Mail size={18} />
                  </div>

                  <span className="stat-label">
                    TOTAL EMAILS
                  </span>
                </div>

                <h2>128</h2>

                <p className="stat-description">
                  Emails analyzed
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() =>
                  openDashboardView("Safe Emails")
                }
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon safe">
                    <ShieldCheck size={18} />
                  </div>

                  <span className="stat-label">
                    SAFE EMAILS
                  </span>
                </div>

                <h2>96</h2>

                <p className="stat-description">
                  Safe messages detected
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() =>
                  openDashboardView("Spam Emails")
                }
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon spam">
                    <Ban size={18} />
                  </div>

                  <span className="stat-label">
                    SPAM EMAILS
                  </span>
                </div>

                <h2>21</h2>

                <p className="stat-description">
                  Spam messages detected
                </p>
              </button>

              <button
                className="stat-card"
                onClick={() =>
                  openDashboardView("Phishing Emails")
                }
                type="button"
              >
                <div className="stat-card-top">
                  <div className="stat-icon phishing">
                    <AlertTriangle size={18} />
                  </div>

                  <span className="stat-label">
                    PHISHING EMAILS
                  </span>
                </div>

                <h2>11</h2>

                <p className="stat-description">
                  Threats detected by AI
                </p>
              </button>
            </section>

            <section className="dashboard-section">
              <div className="section-header">
                <div>
                  <h2>Recent Emails</h2>
                  <p>Latest analyzed messages</p>
                </div>

                <button
                  className="view-all-btn"
                  onClick={openInbox}
                  type="button"
                >
                  View all
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="email-list">
                {recentEmails.map((email) => (
                  <button
                    className="email-item"
                    key={email.subject}
                    onClick={() =>
                      openRecentEmail(email)
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

                    <div
                      className={`email-status ${
                        email.status === "Safe"
                          ? "safe-status"
                          : email.status === "Spam"
                          ? "spam-status"
                          : "phishing-status"
                      }`}
                    >
                      {email.status === "Safe" && (
                        <ShieldCheck size={12} />
                      )}

                      {email.status === "Spam" && (
                        <Ban size={12} />
                      )}

                      {email.status ===
                        "Phishing" && (
                        <AlertTriangle size={12} />
                      )}

                      {email.status}
                    </div>

                    <div className="email-time">
                      {email.time}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="bottom-grid">
              <section className="dashboard-section">
                <div className="section-header">
                  <div>
                    <h2>Threat Overview</h2>
                    <p>Email security statistics</p>
                  </div>
                </div>

                <div className="threat-overview">
                  <div className="threat-row">
                    <div className="threat-info">
                      <span className="threat-name">
                        <span className="threat-dot safe-dot"></span>
                        Safe
                      </span>

                      <strong>75%</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill safe-progress"
                        style={{
                          width: "75%",
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="threat-row">
                    <div className="threat-info">
                      <span className="threat-name">
                        <span className="threat-dot spam-dot"></span>
                        Spam
                      </span>

                      <strong>16%</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill spam-progress"
                        style={{
                          width: "16%",
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="threat-row">
                    <div className="threat-info">
                      <span className="threat-name">
                        <span className="threat-dot phishing-dot"></span>
                        Phishing
                      </span>

                      <strong>9%</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill phishing-progress"
                        style={{
                          width: "9%",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="ai-engine-card">
              <div className="ai-engine-icon">
                <ShieldAlert size={25} />
              </div>

              <div className="ai-engine-content">
                <span className="ai-small-title">
                  POWERED BY AI
                </span>

                <h2>PhishShield AI Engine</h2>

                <p>
                  Advanced email security powered by
                  AI. Every message is analyzed through
                  language detection, NLP processing,
                  feature extraction, machine learning
                  classification, and risk scoring.
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
            <div className="dashboard-detail-card">
              <div className="dashboard-detail-icon">
                {dashboardView === "Notifications" && (
                  <Bell size={25} />
                )}

                {dashboardView === "Profile" && (
                  <User size={25} />
                )}

                {dashboardView === "Total Emails" && (
                  <Mail size={25} />
                )}

                {dashboardView === "Safe Emails" && (
                  <ShieldCheck size={25} />
                )}

                {dashboardView === "Spam Emails" && (
                  <Ban size={25} />
                )}

                {dashboardView ===
                  "Phishing Emails" && (
                  <AlertTriangle size={25} />
                )}
              </div>

              <h1>{dashboardView}</h1>

              {dashboardView === "Notifications" && (
                <>
                  <p>
                    You have 3 new security
                    notifications.
                  </p>

                  <div className="detail-list">
                    <div>
                      <Bell size={16} />
                      <span>
                        Security scan completed
                        successfully.
                      </span>
                    </div>

                    <div>
                      <AlertTriangle size={16} />
                      <span>
                        A suspicious email was
                        detected.
                      </span>
                    </div>

                    <div>
                      <CheckCircle2 size={16} />
                      <span>
                        Your inbox is being monitored
                        by the AI engine.
                      </span>
                    </div>
                  </div>
                </>
              )}

              {dashboardView === "Profile" && (
                <>
                  <p>
                    Manage your SmartMail account
                    information.
                  </p>

                  <div className="profile-detail">
                    <div className="large-profile-avatar">
                      MA
                    </div>

                    <div>
                      <strong>
                        Maryam Arif
                      </strong>
                      <span>Admin</span>
                    </div>
                  </div>
                </>
              )}

              {dashboardView === "Total Emails" && (
                <>
                  <p>
                    Overview of all emails analyzed
                    by SmartMail.
                  </p>

                  <div className="detail-number">
                    128
                    <span>
                      Total emails analyzed
                    </span>
                  </div>

                  <button
                    className="detail-action-btn"
                    onClick={openInbox}
                    type="button"
                  >
                    <Mail size={16} />
                    Open Inbox
                  </button>
                </>
              )}

              {dashboardView === "Safe Emails" && (
                <>
                  <p>
                    Emails identified as safe by the
                    AI security engine.
                  </p>

                  <div className="detail-number">
                    96
                    <span>
                      Safe emails detected
                    </span>
                  </div>

                  <button
                    className="detail-action-btn"
                    onClick={openInbox}
                    type="button"
                  >
                    <InboxIcon size={16} />
                    View Inbox
                  </button>
                </>
              )}

              {dashboardView === "Spam Emails" && (
                <>
                  <p>
                    Emails identified as unwanted or
                    spam.
                  </p>

                  <div className="detail-number">
                    21
                    <span>
                      Spam emails detected
                    </span>
                  </div>

                  <button
                    className="detail-action-btn"
                    onClick={openInbox}
                    type="button"
                  >
                    <Ban size={16} />
                    View Emails
                  </button>
                </>
              )}

              {dashboardView ===
                "Phishing Emails" && (
                <>
                  <p>
                    Emails flagged as potential
                    phishing threats.
                  </p>

                  <div className="detail-number">
                    11
                    <span>
                      Phishing threats detected
                    </span>
                  </div>

                  <button
                    className="detail-action-btn"
                    onClick={openInbox}
                    type="button"
                  >
                    <AlertTriangle size={16} />
                    View Emails
                  </button>
                </>
              )}

              <button
                className="back-dashboard-btn"
                onClick={goDashboard}
                type="button"
              >
                <ChevronRight
                  size={16}
                  style={{
                    transform:
                      "rotate(180deg)",
                  }}
                />
                Back to Dashboard
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;