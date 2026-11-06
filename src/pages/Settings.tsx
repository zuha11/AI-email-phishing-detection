
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  UserRound, Bell, ShieldCheck, Eye, EyeOff,
  LogOut, Save, KeyRound, X, CheckCircle2, AlertCircle,
  Mail, Smartphone, ShieldAlert, Moon, Sun, Fingerprint, Loader2
} from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

type SettingsProps = {
  onSignOut?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
};

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

type SettingRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  placeholder: string;
};

const API_BASE_URL = `https://${window.location.hostname}:5000`;

// ---------------------------------------------------------
// AUTHENTICATION REQUEST HELPER
// ---------------------------------------------------------

async function authRequest(
  endpoint: string,
  method = "GET",
  body?: Record<string, unknown>
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    credentials: "include",
    headers:
      method === "GET"
        ? { Accept: "application/json" }
        : {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

// ---------------------------------------------------------
// TOGGLE COMPONENT
// ---------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 20,
        border: "none",
        padding: 3,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        background: checked ? "#2563eb" : "#cbd5e1",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px #0002",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------
// SETTINGS ROW
// ---------------------------------------------------------

function SettingRow({
  icon,
  title,
  description,
  children,
}: SettingRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-icon">{icon}</div>
      <div className="settings-row-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------
// PASSWORD FIELD
// ---------------------------------------------------------

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  placeholder,
}: PasswordFieldProps) {
  return (
    <label className="password-field">
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={onToggleVisibility}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}

// ---------------------------------------------------------
// MAIN SETTINGS COMPONENT
// ---------------------------------------------------------

function Settings({
  onSignOut,
  isDarkMode,
  onToggleDarkMode,
}: SettingsProps) {
  const [name, setName] = useState("Maryam Arif");
  const [email, setEmail] = useState("maryam@example.com");
  const [role] = useState("Admin");

  const [autoScan, setAutoScan] = useState(true);
  const [phishingAlerts, setPhishingAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [overloadWarning, setOverloadWarning] = useState(true);

  // Two-factor authentication
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] =
    useState<"success" | "error">("success");

  const showNotice = (
    message: string,
    type: "success" | "error"
  ) => {
    setNotice(message);
    setNoticeType(type);
  };

  // -------------------------------------------------------
  // LOAD TWO-FACTOR AUTHENTICATION STATUS
  // -------------------------------------------------------

  useEffect(() => {
    let active = true;

    const loadTwoFactorStatus = async () => {
      try {
        const data = await authRequest("/api/auth/2fa/status");

        if (!active) return;

        setTwoFactor(
          data.enabled === true ||
          data.twoFactorEnabled === true ||
          data.two_factor_enabled === true
        );
      } catch (error) {
        if (active) {
          showNotice(
            error instanceof Error
              ? `Could not load two-factor status: ${error.message}`
              : "Could not load two-factor authentication status.",
            "error"
          );
        }
      } finally {
        if (active) setTwoFactorLoading(false);
      }
    };

    loadTwoFactorStatus();

    return () => {
      active = false;
    };
  }, []);

  // -------------------------------------------------------
  // SAVE PROFILE
  // -------------------------------------------------------

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      showNotice("Please enter your name and email address.", "error");
      return;
    }

    showNotice(
      "Profile details updated for this session. Persistent profile saving is not connected yet.",
      "success"
    );
  };

  // -------------------------------------------------------
  // TWO-FACTOR AUTHENTICATION
  // -------------------------------------------------------

  const handleTwoFactorChange = async (enable: boolean) => {
    if (twoFactorBusy || twoFactorLoading) return;

    setTwoFactorBusy(true);
    setNotice("");

    try {
      if (enable) {
        showNotice(
          "Preparing your existing Windows Hello passkey...",
          "success"
        );

        // Request authentication options for the saved passkey.
        const options = await authRequest(
          "/api/auth/2fa/passkey/enable/options",
          "POST"
        );

        if (!options.challenge) {
          throw new Error(
            "The server did not return valid passkey verification options."
          );
        }

        showNotice(
          "Verify your existing passkey using Windows Hello.",
          "success"
        );

        // Authenticate using the existing passkey.
        const credential = await startAuthentication({
          optionsJSON: options,
        });

        // Verify the assertion on the backend.
        const verifyData = await authRequest(
          "/api/auth/2fa/passkey/enable/verify",
          "POST",
          { credential }
        );

        if (
          verifyData.success !== true ||
          verifyData.enabled !== true
        ) {
          throw new Error(
            verifyData.message ||
            "Two-factor authentication could not be enabled."
          );
        }

        setTwoFactor(true);

        showNotice(
          "Two-factor authentication has been successfully enabled.",
          "success"
        );

      } else {
        const password = window.prompt(
          "Enter your current account password to disable two-factor authentication:"
        );

        if (!password) {
          showNotice(
            "Two-factor authentication was not disabled.",
            "error"
          );
          return;
        }

        const data = await authRequest(
          "/api/auth/2fa/disable",
          "POST",
          { password }
        );

        if (data.success !== true) {
          throw new Error(
            data.message ||
            data.error ||
            "The server did not confirm the change."
          );
        }

        setTwoFactor(false);

        showNotice(
          "Two-factor authentication has been disabled.",
          "success"
        );
      }

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The two-factor authentication request failed.";

      showNotice(message, "error");

      // Reload the actual backend state.
      try {
        const status = await authRequest("/api/auth/2fa/status");

        setTwoFactor(
          status.enabled === true ||
          status.twoFactorEnabled === true ||
          status.two_factor_enabled === true
        );
      } catch {
        // Keep the last confirmed state.
      }

    } finally {
      setTwoFactorBusy(false);
    }
  };

  // -------------------------------------------------------
  // PASSWORD MODAL
  // -------------------------------------------------------

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setNotice("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (passwordBusy) return;

    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // -------------------------------------------------------
  // CHANGE PASSWORD
  // -------------------------------------------------------

  const handleChangePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotice("Please complete all password fields.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showNotice(
        "Your new password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (newPassword === currentPassword) {
      showNotice(
        "Your new password must be different from your current password.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotice("The new passwords do not match.", "error");
      return;
    }

    setPasswordBusy(true);

    try {
      const data = await authRequest(
        "/api/auth/change-password",
        "POST",
        {
          currentPassword,
          newPassword,
        }
      );

      if (data.success !== true) {
        throw new Error(
          data.error || "The password could not be changed."
        );
      }

      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showNotice(
        data.message || "Your password has been changed successfully.",
        "success"
      );

    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to change your password.",
        "error"
      );

    } finally {
      setPasswordBusy(false);
    }
  };

  // -------------------------------------------------------
  // SETTINGS UI
  // -------------------------------------------------------

  return (
    <div className="settings-page">
      <style>{`
        .settings-page {
          box-sizing: border-box;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 26px 30px 40px;
          color: var(--text-primary, #172033);
          font-family: inherit;
        }

        .settings-page * { box-sizing: border-box; }

        .settings-heading { margin-bottom: 24px; }

        .settings-heading h1 {
          margin: 0 0 7px;
          font-size: 27px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .settings-heading p {
          margin: 0;
          color: var(--text-secondary, #718096);
          font-size: 14px;
        }

        .settings-notice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 15px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-size: 13px;
          line-height: 1.5;
        }

        .settings-notice.success {
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .settings-notice.error {
          color: #9f1239;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .settings-card {
          background: var(--card-bg, #fff);
          color: var(--text-primary, #172033);
          border: 1px solid var(--border-color, #e7ebf2);
          border-radius: 15px;
          margin-bottom: 20px;
          overflow: hidden;
          box-shadow: 0 3px 12px rgba(15,23,42,.025);
        }

        .settings-card-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 22px;
          border-bottom: 1px solid var(--border-color, #edf0f5);
        }

        .settings-card-heading-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          color: #2563eb;
          background: #eff6ff;
          border-radius: 11px;
        }

        .settings-card-heading h2 {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 700;
        }

        .settings-card-heading p {
          margin: 0;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-profile-form { padding: 22px; }

        .settings-form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 18px;
        }

        .settings-label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #344054);
        }

        .settings-label input {
          width: 100%;
          min-width: 0;
          height: 43px;
          padding: 0 12px;
          border: 1px solid var(--border-color, #dce2eb);
          border-radius: 8px;
          outline: none;
          background: var(--input-bg, #fff);
          color: var(--text-primary, #1f2937);
          font: inherit;
          font-weight: 400;
        }

        .settings-label input:focus,
        .password-input-wrap:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px #3b82f61c;
        }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 22px;
        }

        .settings-primary-btn,
        .settings-secondary-btn,
        .settings-danger-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 39px;
          padding: 0 15px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 650;
          transition: background .15s ease;
        }

        .settings-primary-btn {
          color: #fff;
          background: #2563eb;
        }

        .settings-primary-btn:hover { background: #1d4ed8; }

        .settings-secondary-btn {
          color: var(--text-primary, #344054);
          background: var(--input-bg, #fff);
          border-color: var(--border-color, #dce2eb);
        }

        .settings-secondary-btn:hover {
          background: var(--hover-bg, #f8fafc);
        }

        .settings-danger-btn {
          color: #b42318;
          background: var(--input-bg, #fff);
          border-color: #fecaca;
        }

        .settings-danger-btn:hover { background: #fff1f2; }

        .settings-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px 22px;
          border-bottom: 1px solid var(--border-color, #f0f2f6);
        }

        .settings-row:last-child { border-bottom: none; }

        .settings-row-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          color: var(--text-secondary, #64748b);
          background: var(--icon-bg, #f5f7fb);
          border-radius: 10px;
        }

        .settings-row-copy { flex: 1; min-width: 0; }

        .settings-row-copy strong {
          font-size: 13px;
          font-weight: 650;
        }

        .settings-row-copy p {
          margin: 5px 0 0;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-row-control { flex-shrink: 0; }

        .settings-security-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--border-color, #f0f2f6);
        }

        .settings-security-action strong {
          display: block;
          font-size: 13px;
        }

        .settings-security-action p {
          margin: 5px 0 0;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-session {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 22px;
        }

        .settings-session-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          color: #2563eb;
          background: #eff6ff;
          border-radius: 11px;
          flex-shrink: 0;
        }

        .settings-session-copy { flex: 1; min-width: 0; }

        .settings-session-copy strong { font-size: 13px; }

        .settings-session-copy p {
          margin: 5px 0 0;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .settings-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15,23,42,.55);
          backdrop-filter: blur(3px);
        }

        .settings-modal {
          width: 100%;
          max-width: 465px;
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          border-radius: 16px;
          background: var(--card-bg, #fff);
          color: var(--text-primary, #172033);
          box-shadow: 0 24px 70px rgba(15,23,42,.25);
        }

        .settings-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 22px 23px;
          border-bottom: 1px solid var(--border-color, #edf0f5);
        }

        .settings-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .settings-modal-title h2 {
          margin: 0 0 5px;
          font-size: 19px;
        }

        .settings-modal-title p {
          margin: 0;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-modal-close {
          display: grid;
          place-items: center;
          width: 33px;
          height: 33px;
          flex-shrink: 0;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary, #64748b);
          background: var(--icon-bg, #f5f7fb);
          cursor: pointer;
        }

        .settings-modal-form { padding: 22px 23px 23px; }

        .password-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 17px;
          color: var(--text-primary, #344054);
          font-size: 13px;
          font-weight: 650;
        }

        .password-input-wrap {
          display: flex;
          align-items: center;
          border: 1px solid var(--border-color, #dce2eb);
          border-radius: 8px;
          padding-right: 8px;
        }

        .password-input-wrap input {
          flex: 1;
          width: 100%;
          min-width: 0;
          height: 43px;
          padding: 0 12px;
          border: none;
          outline: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-primary, #1f2937);
          font: inherit;
          font-weight: 400;
          box-shadow: none;
        }

        .password-input-wrap button {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary, #64748b);
          background: transparent;
          cursor: pointer;
        }

        .settings-password-hint {
          margin: -3px 0 18px;
          color: var(--text-secondary, #778195);
          font-size: 12px;
          line-height: 1.5;
        }

        .settings-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 6px;
        }

        /* DARK MODE */

        [data-theme="dark"] .settings-page {
          color: #eeeaf7;
        }

        [data-theme="dark"] .settings-heading h1,
        [data-theme="dark"] .settings-card-heading h2,
        [data-theme="dark"] .settings-row-copy strong,
        [data-theme="dark"] .settings-security-action strong,
        [data-theme="dark"] .settings-session-copy strong,
        [data-theme="dark"] .settings-modal-title h2 {
          color: #eeeaf7;
        }

        [data-theme="dark"] .settings-heading p,
        [data-theme="dark"] .settings-card-heading p,
        [data-theme="dark"] .settings-row-copy p,
        [data-theme="dark"] .settings-security-action p,
        [data-theme="dark"] .settings-session-copy p,
        [data-theme="dark"] .settings-modal-title p,
        [data-theme="dark"] .settings-password-hint {
          color: #aaa4b8;
        }

        [data-theme="dark"] .settings-card,
        [data-theme="dark"] .settings-modal {
          background: #1c1b29;
          color: #eeeaf7;
          border-color: #343143;
        }

        [data-theme="dark"] .settings-card-heading,
        [data-theme="dark"] .settings-row,
        [data-theme="dark"] .settings-security-action,
        [data-theme="dark"] .settings-modal-header {
          border-color: #343143;
        }

        [data-theme="dark"] .settings-card-heading-icon,
        [data-theme="dark"] .settings-session-icon {
          background: #34264f;
          color: #cbb8ff;
        }

        [data-theme="dark"] .settings-row-icon,
        [data-theme="dark"] .settings-modal-close {
          background: #29263a;
          color: #c5bdd5;
        }

        [data-theme="dark"] .settings-label {
          color: #ddd7e9;
        }

        [data-theme="dark"] .settings-label input,
        [data-theme="dark"] .password-input-wrap {
          background: #242334;
          color: #eeeaf7;
          border-color: #343143;
        }

        [data-theme="dark"] .password-input-wrap input {
          background: transparent;
          color: #eeeaf7;
        }

        [data-theme="dark"] .password-input-wrap button {
          color: #aaa4b8;
        }

        [data-theme="dark"] .settings-secondary-btn {
          background: #242334;
          color: #eeeaf7;
          border-color: #343143;
        }

        [data-theme="dark"] .settings-secondary-btn:hover {
          background: #302b43;
        }

        [data-theme="dark"] .settings-danger-btn {
          background: #302124;
          color: #ffaaaa;
          border-color: #654047;
        }

        [data-theme="dark"] .settings-notice.success {
          background: #173c30;
          color: #a7f3d0;
          border-color: #28634c;
        }

        [data-theme="dark"] .settings-notice.error {
          background: #482525;
          color: #ffb4b4;
          border-color: #754040;
        }

        @media(max-width:650px) {
          .settings-page { padding: 18px 13px 30px; }
          .settings-form-grid { grid-template-columns: 1fr; }
          .settings-card-heading,
          .settings-profile-form { padding: 17px; }
          .settings-row { gap: 10px; padding: 15px 16px; }
          .settings-row-icon { width: 33px; height: 33px; }
          .settings-row-copy p { font-size: 11px; }
          .settings-security-action,
          .settings-session { padding: 17px; }
          .settings-session { flex-wrap: wrap; }
          .settings-danger-btn { margin-left: auto; }
        }
      `}</style>

      <div className="settings-heading">
        <h1>Settings</h1>
        <p>Manage your SmartMail profile, preferences and security.</p>
      </div>

      {notice && (
        <div className={`settings-notice ${noticeType}`} role="status">
          {noticeType === "success"
            ? <CheckCircle2 size={18} />
            : <AlertCircle size={18} />}
          <span>{notice}</span>
        </div>
      )}

      {/* PROFILE SETTINGS */}
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-heading-icon">
            <UserRound size={20} />
          </div>
          <div>
            <h2>Profile Settings</h2>
            <p>Update the profile information displayed in SmartMail.</p>
          </div>
        </div>

        <form className="settings-profile-form" onSubmit={handleSaveProfile}>
          <div className="settings-form-grid">
            <label className="settings-label">
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>

            <label className="settings-label">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
              />
            </label>

            <label className="settings-label">
              Account role
              <input value={role} readOnly />
            </label>

            <label className="settings-label">
              Account status
              <input value="Active" readOnly />
            </label>
          </div>

          <div className="settings-actions">
            <button className="settings-primary-btn" type="submit">
              <Save size={16} />
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* APPEARANCE SETTINGS */}
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-heading-icon">
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div>
            <h2>Appearance</h2>
            <p>Customize how your SmartMail dashboard looks.</p>
          </div>
        </div>

        <SettingRow
          icon={isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          title="Dark Mode"
          description={
            isDarkMode
              ? "Dark appearance is currently enabled. Switch off to return to Light Mode."
              : "Use a darker appearance across your SmartMail dashboard."
          }
        >
          <Toggle
            label="Dark Mode"
            checked={isDarkMode}
            onChange={onToggleDarkMode}
          />
        </SettingRow>
      </section>

      {/* NOTIFICATION PREFERENCES */}
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-heading-icon">
            <Bell size={20} />
          </div>
          <div>
            <h2>Notification Preferences</h2>
            <p>Choose which SmartMail alerts you want to enable.</p>
          </div>
        </div>

        <SettingRow
          icon={<Mail size={18} />}
          title="Email notifications"
          description="Receive email-related notification messages in the interface."
        >
          <Toggle
            label="Email notifications"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
        </SettingRow>

        <SettingRow
          icon={<ShieldAlert size={18} />}
          title="Phishing alerts"
          description="Display a warning when the phishing detector identifies a suspicious message."
        >
          <Toggle
            label="Phishing alerts"
            checked={phishingAlerts}
            onChange={setPhishingAlerts}
          />
        </SettingRow>

        <SettingRow
          icon={<Bell size={18} />}
          title="Email overload warning"
          description="Enable the preference for warnings about excessive email activity."
        >
          <Toggle
            label="Email overload warning"
            checked={overloadWarning}
            onChange={setOverloadWarning}
          />
        </SettingRow>
      </section>

      {/* SECURITY SETTINGS */}
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-heading-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Security Settings</h2>
            <p>Manage automatic scanning and account security preferences.</p>
          </div>
        </div>

        <SettingRow
          icon={<ShieldCheck size={18} />}
          title="Automatic email scanning"
          description="Allow the Inbox page to run the configured spam and phishing checks when an email is opened."
        >
          <Toggle
            label="Automatic email scanning"
            checked={autoScan}
            onChange={setAutoScan}
          />
        </SettingRow>

        <SettingRow
          icon={<Fingerprint size={18} />}
          title="Two-factor authentication"
          description={
            twoFactorLoading
              ? "Checking your account security status..."
              : twoFactor
                ? "Enabled. Your account requires an additional Windows Hello/passkey verification during login."
                : "Disabled. Enable this to add Windows Hello/passkey verification after password login."
          }
        >
          {twoFactorBusy || twoFactorLoading ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                color: "var(--text-secondary, #64748b)",
                fontSize: 12,
              }}
            >
              <Loader2 size={16} />
              {twoFactorLoading ? "Loading" : "Updating"}
            </span>
          ) : (
            <Toggle
              label="Two-factor authentication"
              checked={twoFactor}
              onChange={handleTwoFactorChange}
              disabled={twoFactorBusy || twoFactorLoading}
            />
          )}
        </SettingRow>

        <div className="settings-security-action">
          <div>
            <strong>Change password</strong>
            <p>Update your account password using your current password.</p>
          </div>

          <button
            className="settings-secondary-btn"
            type="button"
            onClick={openPasswordModal}
          >
            <KeyRound size={16} />
            Change Password
          </button>
        </div>
      </section>

      {/* SESSION */}
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-card-heading-icon">
            <Smartphone size={20} />
          </div>
          <div>
            <h2>Session</h2>
            <p>Manage your current SmartMail session.</p>
          </div>
        </div>

        <div className="settings-session">
          <div className="settings-session-icon">
            <UserRound size={20} />
          </div>

          <div className="settings-session-copy">
            <strong>{name || "SmartMail user"}</strong>
            <p>
              {email || "No email address entered"} · {role}
            </p>
          </div>

          <button
            className="settings-danger-btn"
            type="button"
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else {
                showNotice(
                  "Sign out is not connected to a parent navigation handler.",
                  "error"
                );
              }
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </section>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div
          className="settings-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePasswordModal();
            }
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <div className="settings-card-heading-icon">
                  <KeyRound size={20} />
                </div>

                <div>
                  <h2 id="change-password-title">Change Password</h2>
                  <p>Enter your current password and choose a new one.</p>
                </div>
              </div>

              <button
                className="settings-modal-close"
                type="button"
                aria-label="Close password dialog"
                onClick={closePasswordModal}
                disabled={passwordBusy}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="settings-modal-form"
              onSubmit={handleChangePassword}
            >
              <PasswordField
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={showCurrentPassword}
                onToggleVisibility={() =>
                  setShowCurrentPassword((value) => !value)
                }
                placeholder="Enter current password"
              />

              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisibility={() =>
                  setShowNewPassword((value) => !value)
                }
                placeholder="Enter new password"
              />

              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggleVisibility={() =>
                  setShowConfirmPassword((value) => !value)
                }
                placeholder="Re-enter new password"
              />

              <p className="settings-password-hint">
                Use at least 8 characters. Your current password is verified
                by the SmartMail backend before the new password is saved.
              </p>

              <div className="settings-modal-actions">
                <button
                  className="settings-secondary-btn"
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordBusy}
                >
                  Cancel
                </button>

                <button
                  className="settings-primary-btn"
                  type="submit"
                  disabled={passwordBusy}
                >
                  {passwordBusy
                    ? <Loader2 size={16} />
                    : <KeyRound size={16} />}
                  {passwordBusy ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Settings;
