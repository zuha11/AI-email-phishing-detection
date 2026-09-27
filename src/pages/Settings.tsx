import { useState } from "react";
import {
  User,
  Globe,
  Mail,
  Bell,
  Lock,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

function Settings() {
  const [autoScan, setAutoScan] = useState(true);
  const [phishingAlerts, setPhishingAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [overloadWarning, setOverloadWarning] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <main className="main-content settings-page">
      <header className="top-bar">
        <div className="page-title">
          <span>Settings</span>
        </div>

        <div className="top-actions">
          <button
            className="notification"
            type="button"
            title="Notifications"
          >
            <Bell size={18} />
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

      <div className="settings-content">

        {/* ACCOUNT */}
        <section className="settings-card">
          <div className="settings-section-title">
            <User size={20} />
            <h2>Account</h2>
          </div>

          <div className="account-card">
            <div className="account-avatar">
              MA
            </div>

            <div className="account-info">
              <h3>Maryam Arif</h3>
              <p>maryam.arif@example.com</p>

              <span className="plan-badge">
                Premium Plan · Active
              </span>
            </div>

            <button
              className="settings-outline-btn"
              type="button"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* LANGUAGE */}
        <section className="settings-card">
          <div className="settings-section-title">
            <Globe size={20} />
            <h2>Language &amp; Multilingual</h2>
          </div>

          <div className="settings-row clickable">
            <div>
              <h3>Active Processing Language</h3>
              <p>
                English (Primary) · 7 languages supported by AI engine
              </p>
            </div>

            <button
              className="manage-btn"
              type="button"
            >
              Manage
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        {/* EMAIL SCANNING */}
        <section className="settings-card">
          <div className="settings-section-title">
            <Mail size={20} />
            <h2>Email Scanning</h2>
          </div>

          <div className="settings-row">
            <div>
              <h3>Auto-scan incoming emails</h3>
              <p>
                PhishShield AI scans every email on arrival
              </p>
            </div>

            <button
              className={`toggle ${autoScan ? "on" : ""}`}
              onClick={() => setAutoScan(!autoScan)}
              type="button"
              aria-label="Toggle auto-scan"
            >
              <span />
            </button>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="settings-card">
          <div className="settings-section-title">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>

          <div className="settings-row">
            <div>
              <h3>Phishing Detected Alerts</h3>
              <p>
                Immediate alert when phishing email is found
              </p>
            </div>

            <button
              className={`toggle ${
                phishingAlerts ? "on" : ""
              }`}
              onClick={() =>
                setPhishingAlerts(!phishingAlerts)
              }
              type="button"
              aria-label="Toggle phishing alerts"
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <h3>New Email Notifications</h3>
              <p>
                Alert when a new email arrives in inbox
              </p>
            </div>

            <button
              className={`toggle ${
                emailNotifications ? "on" : ""
              }`}
              onClick={() =>
                setEmailNotifications(!emailNotifications)
              }
              type="button"
              aria-label="Toggle email notifications"
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <h3>System Overload Warning</h3>
              <p>
                Alert when inbox exceeds the scan threshold
              </p>
            </div>

            <button
              className={`toggle ${
                overloadWarning ? "on" : ""
              }`}
              onClick={() =>
                setOverloadWarning(!overloadWarning)
              }
              type="button"
              aria-label="Toggle overload warning"
            >
              <span />
            </button>
          </div>
        </section>

        {/* SECURITY */}
        <section className="settings-card">
          <div className="settings-section-title">
            <Lock size={20} />
            <h2>Security</h2>
          </div>

          {/* TWO-FACTOR AUTHENTICATION */}
          <div className="settings-row">
            <div>
              <h3>Two-Factor Authentication</h3>
              <p>
                Add an extra layer of security via SMS or authenticator app
              </p>
            </div>

            <button
              className={`toggle ${twoFactor ? "on" : ""}`}
              onClick={() => setTwoFactor(!twoFactor)}
              type="button"
              aria-label="Toggle two-factor authentication"
            >
              <span />
            </button>
          </div>

          {/* CHANGE PASSWORD */}
          <div className="settings-row">
            <div>
              <h3>Change Password</h3>
              <p>
                Last changed 3 months ago
              </p>
            </div>

            <button
              className="manage-btn"
              type="button"
            >
              Change
            </button>
          </div>

          {/* ACTIVE SESSIONS */}
          <div className="settings-row">
            <div>
              <h3>Active Sessions</h3>
              <p>
                1 active session · Chrome on Windows
              </p>
            </div>

            <button
              className="revoke-btn"
              type="button"
            >
              Revoke All
            </button>
          </div>
        </section>

        {/* SIGN OUT */}
        <section className="settings-card signout-card">
          <div className="settings-row signout-row">
            <div>
              <h3>Sign Out</h3>
              <p>
                Sign out of SmartMail Security on this device
              </p>
            </div>

            <button
              className="signout-btn"
              type="button"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </section>

        <div className="settings-security-note">
          <ShieldCheck size={16} />
          <span>
            Your settings are protected by the SmartMail AI security engine.
          </span>
        </div>
      </div>

      <button
        className="settings-help"
        type="button"
        aria-label="Help"
      >
        ?
      </button>

      <style>{`
        .settings-page {
          overflow-y: auto;
        }

        .settings-content {
          padding: 24px 28px 40px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .settings-card {
          background: #ffffff;
          border: 1px solid #eeeaf5;
          border-radius: 18px;
          padding: 24px 28px;
          margin-bottom: 20px;
          box-shadow: 0 4px 18px rgba(55, 35, 90, 0.04);
        }

        .settings-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .settings-section-title svg {
          color: #5b35a8;
        }

        .settings-section-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 650;
          color: #20202b;
        }

        .account-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 8px 4px;
        }

        .account-avatar {
          width: 92px;
          height: 92px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #5140c8, #378ddd);
          color: white;
          font-size: 27px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .account-info {
          flex: 1;
        }

        .account-info h3 {
          margin: 0 0 5px;
          font-size: 22px;
          color: #22222d;
        }

        .account-info p {
          margin: 0 0 10px;
          color: #77778a;
          font-size: 15px;
        }

        .plan-badge {
          display: inline-block;
          padding: 7px 13px;
          border-radius: 20px;
          background: #f1e9ff;
          color: #633ca7;
          font-size: 13px;
          font-weight: 600;
        }

        .settings-outline-btn,
        .manage-btn {
          border: none;
          background: transparent;
          color: #59329d;
          font-weight: 650;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .settings-outline-btn {
          border: 1px solid #e3d9f3;
          padding: 11px 18px;
          border-radius: 22px;
        }

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding: 18px 4px;
          border-top: 1px solid #f0edf4;
        }

        .settings-row:first-of-type {
          border-top: none;
        }

        .settings-row h3 {
          margin: 0 0 5px;
          font-size: 16px;
          font-weight: 600;
          color: #252532;
        }

        .settings-row p {
          margin: 0;
          color: #8a8997;
          font-size: 14px;
        }

        .clickable {
          cursor: pointer;
        }

        .toggle {
          width: 52px;
          height: 30px;
          border: none;
          border-radius: 20px;
          background: #dedee6;
          padding: 3px;
          cursor: pointer;
          flex-shrink: 0;
          transition: 0.2s ease;
        }

        .toggle span {
          display: block;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: 0.2s ease;
        }

        .toggle.on {
          background: #5830a1;
        }

        .toggle.on span {
          transform: translateX(22px);
        }

        .revoke-btn {
          border: 1px solid #f0dede;
          background: #fffafa;
          color: #b33b3b;
          padding: 10px 17px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          flex-shrink: 0;
        }

        .signout-card {
          padding: 10px 28px;
          border-color: #eeeaf5;
        }

        .signout-row {
          border-top: none;
          padding: 18px 4px;
        }

        .signout-btn {
          border: none;
          background: #c93b3b;
          color: white;
          padding: 12px 20px;
          border-radius: 22px;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .settings-security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #77758a;
          font-size: 13px;
          margin-top: 8px;
        }

        .settings-security-note svg {
          color: #5b35a8;
        }

        .settings-help {
          position: fixed;
          right: 22px;
          bottom: 22px;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 50%;
          background: #191923;
          color: white;
          font-size: 21px;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        @media (max-width: 700px) {
          .settings-content {
            padding: 16px;
          }

          .account-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .settings-outline-btn {
            margin-left: 112px;
          }

          .settings-row {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}

export default Settings;