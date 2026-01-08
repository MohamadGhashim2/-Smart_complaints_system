// frontend/pages/Login.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { getAccess, setTokens } from "../auth";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (getAccess()) navigate("/dashboard");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/token/", { username, password });
      setTokens(res.data);
      window.location.href = "/dashboard";
    } catch (error) {
      console.log(
        "LOGIN ERROR:",
        error?.response?.status,
        error?.response?.data
      );
      if (error?.response?.status === 401) {
        setErr(t("login.errors.invalidCreds"));
      } else {
        setErr(t("login.errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* küçük üst عنوان */}
        <div className="auth-hero-kicker">{t("login.brand.kicker")}</div>

        <h1 className="auth-hero-title">
          {t("login.brand.titleMain")}{" "}
          <span className="auth-hero-highlight">
            {t("login.brand.titleHighlight")}
          </span>
        </h1>

        <p className="auth-hero-text">{t("login.brand.subtitle")}</p>

        <div className="auth-hero-pills">
          <span className="auth-pill">
            <span className="auth-dot" />
            {t("login.pills.aiRouting")}
          </span>
          <span className="auth-pill">
            <span className="auth-dot" />
            {t("login.pills.duplicateDetection")}
          </span>
          <span className="auth-pill">
            <span className="auth-dot" />
            {t("login.pills.spamProtection")}
          </span>
        </div>

        <div className="auth-form-header">
          <div className="auth-form-title">{t("login.form.title")}</div>
          <div className="auth-form-caption">{t("login.form.caption")}</div>
        </div>

        {err && <div className="alert error">{err}</div>}

        <form className="form" onSubmit={handleLogin}>
          <div className="field-group">
            <label className="field-label">{t("login.fields.username")}</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.placeholders.username")}
              autoComplete="username"
            />
          </div>

          <div className="field-group">
            <label className="field-label">{t("login.fields.password")}</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.placeholders.password")}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t("login.buttons.loggingIn") : t("login.buttons.login")}
          </button>
        </form>

        {/* زر التسجيل */}
        <p className="auth-meta-small">
          {t("login.registerPrompt.text")}{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/register")}
          >
            {t("login.registerPrompt.button")}
          </button>
        </p>

        <p className="auth-meta">
          {t("login.info.managedAccounts")}
          <br />
        </p>
      </div>
    </div>
  );
}
