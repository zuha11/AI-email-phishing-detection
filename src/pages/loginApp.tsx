
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import "./SmartMaillogin.css";

// SmartMail frontend: https://localhost:5173
// Flask backend: https://localhost:5000
const API_BASE_URL = `https://${window.location.hostname}:5000`;

type Screen = "login" | "forgot" | "reset" | "create" | "passkey";

type AuthenticationOptions = Parameters<
  typeof startAuthentication
>[0]["optionsJSON"];

type PasswordFieldProps = {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
};

function PasswordField({
  id,
  placeholder,
  value,
  onChange,
  autoComplete = "new-password",
  required = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
      />

      <button
        type="button"
        className="toggle-password"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

export default function LoginApp() {
  const [screen, setScreen] = useState<Screen>("login");

  const [email, setEmail] = useState("zuhasamrin5@gmail.com");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmCreatePassword, setConfirmCreatePassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingPasskeyOptions, setPendingPasskeyOptions] =
    useState<AuthenticationOptions | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("smartmail_email");

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // -------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------

  const navigate = (nextScreen: Screen) => {
    setMessage("");
    setScreen(nextScreen);

    if (nextScreen !== "passkey") {
      setPendingPasskeyOptions(null);
    }
  };

  const openDashboard = () => {
    window.dispatchEvent(new Event("smartmail-login-success"));
  };

  // -------------------------------------------------------
  // BACKEND REQUEST HELPER
  // -------------------------------------------------------

  const postAuth = async (
    endpoint: string,
    body?: unknown
  ) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    });

    const responseText = await response.text();

    let data: Record<string, any> = {};

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "The server returned an invalid response. Please restart the backend."
      );
    }

    return { response, data };
  };

  // -------------------------------------------------------
  // REMEMBER EMAIL
  // -------------------------------------------------------

  const updateRememberedEmail = (loginEmail: string) => {
    if (rememberMe) {
      localStorage.setItem("smartmail_email", loginEmail);
    } else {
      localStorage.removeItem("smartmail_email");
    }
  };

  // -------------------------------------------------------
  // WINDOWS HELLO PASSKEY LOGIN
  // -------------------------------------------------------

  const verifyPasskeyLogin = async (
    options: AuthenticationOptions
  ) => {
    setLoading(true);

    setMessage(
      "Follow the Windows Hello prompt to verify your identity."
    );

    try {
      const credential = await startAuthentication({
        optionsJSON: options,
      });

      const { response, data } = await postAuth(
        "/api/auth/passkey/login/verify",
        { credential }
      );

      console.log("PASSKEY HTTP STATUS:", response.status);
      console.log("PASSKEY RESPONSE:", data);

      if (
        !response.ok ||
        data.success !== true ||
        !data.user?.user_id
      ) {
        throw new Error(
          data.error ||
            data.message ||
            "Passkey verification failed. Please try again."
        );
      }

      setPendingPasskeyOptions(null);

      setMessage("Identity verified! Opening PhishSense...");

      openDashboard();
    } catch (error) {
      console.error("SmartMail passkey login error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Passkey verification failed.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // PASSWORD LOGIN
  // -------------------------------------------------------

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { response, data } = await postAuth(
        "/api/auth/login",
        {
          email: email.trim(),
          password,
        }
      );

      console.log("LOGIN HTTP STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      if (!response.ok || data.success !== true) {
        setMessage(
          data.error ||
            data.message ||
            "Login failed. Check your email and password."
        );
        return;
      }

      updateRememberedEmail(email.trim());

      // ---------------------------------------------------
      // CASE 1: 2FA ENABLED - FETCH PASSKEY OPTIONS
      // ---------------------------------------------------

      if (
        data.requiresPasskey === true ||
        data.requires_passkey === true
      ) {
        setMessage("Password verified. Preparing Windows Hello...");

        const {
          response: optionsResponse,
          data: optionsData,
        } = await postAuth(
          "/api/auth/passkey/login/options",
          {}
        );

        console.log(
          "PASSKEY OPTIONS HTTP STATUS:",
          optionsResponse.status
        );

        console.log(
          "PASSKEY OPTIONS RESPONSE:",
          optionsData
        );

        if (
          !optionsResponse.ok ||
          !optionsData.challenge
        ) {
          throw new Error(
            optionsData.message ||
              optionsData.error ||
              "Could not prepare Windows Hello verification."
          );
        }

        const authenticationOptions =
          optionsData as AuthenticationOptions;

        setPendingPasskeyOptions(authenticationOptions);
        setScreen("passkey");

        setMessage(
          "Password verified. Complete Windows Hello verification to continue."
        );

        // verifyPasskeyLogin manages its own loading state.
        await verifyPasskeyLogin(authenticationOptions);

        return;
      }

      // ---------------------------------------------------
      // CASE 2: PASSWORD-ONLY LOGIN
      // ---------------------------------------------------

      if (
        data.success === true &&
        data.user
      ) {
        setMessage("Login successful! Opening PhishSense...");

        openDashboard();
        return;
      }

      // ---------------------------------------------------
      // CASE 3: UNEXPECTED RESPONSE
      // ---------------------------------------------------

      console.error(
        "Unexpected SmartMail login response:",
        data
      );

      setMessage(
        "Login was successful, but the response format was unexpected. Please check the browser console."
      );
    } catch (error) {
      console.error("SmartMail login error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to SmartMail. Check that the Flask HTTPS backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // RETRY WINDOWS HELLO VERIFICATION
  // -------------------------------------------------------

  const retryPasskeyLogin = async () => {
    if (!pendingPasskeyOptions) {
      setMessage(
        "Your passkey verification session has expired. Please sign in again."
      );
      return;
    }

    await verifyPasskeyLogin(pendingPasskeyOptions);
  };

  // -------------------------------------------------------
  // PASSWORD RESET PLACEHOLDER
  // -------------------------------------------------------

  const handleResetRequest = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    navigate("reset");
  };

  const handleSavePassword = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match. Please try again.");
      return;
    }

    setMessage(
      "Password fields match, but password reset is not connected to the backend yet."
    );
  };

  // -------------------------------------------------------
  // ACCOUNT CREATION
  // -------------------------------------------------------

  const handleCreateAccount = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage("");

    if (!fullName.trim() || !newEmail.trim()) {
      setMessage("Please complete all fields.");
      return;
    }

    if (createPassword.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (createPassword !== confirmCreatePassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await postAuth(
        "/api/auth/register",
        {
          name: fullName.trim(),
          email: newEmail.trim(),
          password: createPassword,
        }
      );

      if (
        !response.ok ||
        data.success !== true ||
        !(data.user?.user_id || data.user?.id)
      ) {
        setMessage(
          data.error ||
            data.message ||
            "Could not create your PhishSense account."
        );
        return;
      }

      setEmail(data.user.email || newEmail.trim());
      setPassword("");

      setFullName("");
      setNewEmail("");
      setCreatePassword("");
      setConfirmCreatePassword("");

      setPendingPasskeyOptions(null);
      setScreen("login");

      setMessage(
        "Account created successfully! Please sign in with your new account."
      );
    } catch (error) {
      console.error("SmartMail registration error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Cannot connect to SmartMail. Check that the Flask HTTPS backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // PAGE DISPLAY
  // -------------------------------------------------------

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="brand">
          <div className="brand-icon">
            <span>✦</span>
          </div>

          <h1>PhishSense</h1>
        </div>

        {/* LOGIN SCREEN */}

        {screen === "login" && (
          <div className="login-content">
            <h2>Welcome back</h2>

            <p className="subtitle">
              Sign in to your PhishSense account
            </p>

            <form onSubmit={handleLogin}>
              <label htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                }}
                autoComplete="email"
                required
              />

              <label htmlFor="login-password">
                Password
              </label>

              <PasswordField
                id="login-password"
                placeholder="Enter your password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setMessage("");
                }}
                autoComplete="current-password"
              />

              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />

                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => navigate("forgot")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="sign-in-button"
                disabled={loading}
              >
                {loading
                  ? "Verifying..."
                  : "Sign In to PhishSense"}
              </button>
            </form>

            <button
              type="button"
              className="create-account"
              onClick={() => navigate("create")}
            >
              Create New Account
            </button>

            {message && (
              <div className="login-message" role="status">
                {message}
              </div>
            )}
          </div>
        )}

        {/* PASSKEY / WINDOWS HELLO SCREEN */}

        {screen === "passkey" && (
          <div className="login-content">
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <ShieldCheck size={42} />
            </div>

            <h2>Verify Your Identity</h2>

            <p className="subtitle">
              Your password has been verified. Complete the
              second authentication factor to access PhishSense.
            </p>

            <div
              style={{
                textAlign: "center",
                margin: "24px 0",
              }}
            >
              <Fingerprint size={54} />
            </div>

            <button
              type="button"
              className="sign-in-button"
              disabled={loading || !pendingPasskeyOptions}
              onClick={() => {
                void retryPasskeyLogin();
              }}
            >
              {loading
                ? "Waiting for Windows Hello..."
                : "Continue with Windows Hello"}
            </button>

            {message && (
              <div className="login-message" role="status">
                {message}
              </div>
            )}

            <button
              type="button"
              className="create-account"
              disabled={loading}
              onClick={() => {
                setPassword("");
                setPendingPasskeyOptions(null);
                setMessage("");
                setScreen("login");
              }}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* FORGOT PASSWORD SCREEN */}

        {screen === "forgot" && (
          <div className="login-content">
            <h2>Forgot Password?</h2>

            <p className="subtitle">
              Continue to set a new password for your account.
            </p>

            <form onSubmit={handleResetRequest}>
              <button
                type="submit"
                className="sign-in-button"
              >
                Reset Password
              </button>
            </form>

            <button
              type="button"
              className="create-account"
              onClick={() => navigate("login")}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* RESET PASSWORD SCREEN */}

        {screen === "reset" && (
          <div className="login-content">
            <h2>Reset Password</h2>

            <p className="subtitle">
              Enter and confirm your new password.
            </p>

            <form onSubmit={handleSavePassword}>
              <label htmlFor="new-password">
                New Password
              </label>

              <PasswordField
                id="new-password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  setMessage("");
                }}
              />

              <label htmlFor="confirm-password">
                Confirm Password
              </label>

              <PasswordField
                id="confirm-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  setMessage("");
                }}
              />

              <button
                type="submit"
                className="sign-in-button"
              >
                Save Password
              </button>
            </form>

            <button
              type="button"
              className="create-account"
              onClick={() => navigate("login")}
            >
              Back to Login
            </button>

            {message && (
              <div className="login-message" role="status">
                {message}
              </div>
            )}
          </div>
        )}

        {/* CREATE ACCOUNT SCREEN */}

        {screen === "create" && (
          <div className="login-content">
            <h2>Create Account</h2>

            <p className="subtitle">
              Create your PhishSense account.
            </p>

            <form onSubmit={handleCreateAccount}>
              <label htmlFor="full-name">
                Full Name
              </label>

              <input
                id="full-name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setMessage("");
                }}
                autoComplete="name"
                required
              />

              <label htmlFor="new-email">
                Email Address
              </label>

              <input
                id="new-email"
                type="email"
                placeholder="Enter your email"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setMessage("");
                }}
                autoComplete="email"
                required
              />

              <label htmlFor="create-password">
                Password
              </label>

              <PasswordField
                id="create-password"
                placeholder="Create a password"
                value={createPassword}
                onChange={(value) => {
                  setCreatePassword(value);
                  setMessage("");
                }}
              />

              <label htmlFor="confirm-create-password">
                Confirm Password
              </label>

              <PasswordField
                id="confirm-create-password"
                placeholder="Confirm your password"
                value={confirmCreatePassword}
                onChange={(value) => {
                  setConfirmCreatePassword(value);
                  setMessage("");
                }}
              />

              <button
                type="submit"
                className="sign-in-button"
                disabled={loading}
              >
                {loading
                  ? "Creating Account..."
                  : "Create Account"}
              </button>
            </form>

            <button
              type="button"
              className="create-account"
              onClick={() => navigate("login")}
            >
              Back to Login
            </button>

            {message && (
              <div className="login-message" role="status">
                {message}
              </div>
            )}
          </div>
        )}

        {/* SECURITY FOOTER */}

        <div className="security-footer">
          Protected by PhishShield AI Engine v3.2
        </div>
      </div>
    </div>
  );
}
