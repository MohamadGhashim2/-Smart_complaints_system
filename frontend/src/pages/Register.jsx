// frontend/pages/Register.jsx
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Register() {
  const [username, setUsername] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!username.trim() || !password || !password2 || !nationalId) {
      setErr(t("register.errors.fillAllFields"));
      return;
    }

    if (password !== password2) {
      setErr(t("register.errors.passwordsDontMatch"));
      return;
    }

    if (nationalId.length !== 11 || !/^\d{11}$/.test(nationalId)) {
      setErr(t("register.errors.nationalId11Digits"));
      return;
    }

    const payload = {
      username: username.trim(),
      password,
      password2,
      national_id: nationalId,
    };

    try {
      setLoading(true);
      const res = await api.post("/api/v1/auth/register/", payload);
      console.log("REGISTER RESPONSE:", res.data);
      setOk(t("register.success.registered"));
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      console.log(
        "REGISTER ERROR:",
        error?.response?.status,
        error?.response?.data
      );
      if (error?.response?.data) {
        const d = error.response.data;
        if (typeof d === "string") setErr(d);
        else if (d.detail) setErr(String(d.detail));
        else if (d.non_field_errors) setErr(String(d.non_field_errors));
        else if (d.username) setErr(String(d.username));
        else if (d.national_id) setErr(String(d.national_id));
        else setErr(t("register.errors.genericFail"));
      } else {
        setErr(t("register.errors.genericFail"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero-kicker">{t("register.heroKicker")}</div>

        <h1 className="auth-hero-title">
          {t("register.heroTitle.main")}{" "}
          <span className="auth-hero-highlight">
            {t("register.heroTitle.highlight")}
          </span>
        </h1>

        <p className="auth-hero-text">{t("register.heroText")}</p>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">
              {t("register.fields.username")}
            </label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("register.placeholders.username")}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t("register.fields.nationalId")}
            </label>
            <input
              className="input"
              maxLength={11}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder={t("register.placeholders.nationalId")}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t("register.fields.password")}
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("register.placeholders.password")}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              {t("register.fields.passwordAgain")}
            </label>
            <input
              className="input"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder={t("register.placeholders.passwordAgain")}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? t("register.buttons.submitting")
              : t("register.buttons.submit")}
          </button>
        </form>

        <p className="auth-meta-small">
          {t("register.meta.haveAccountQuestion")}{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/")}
          >
            {t("register.buttons.login")}
          </button>
        </p>
      </div>
    </div>
  );
}
