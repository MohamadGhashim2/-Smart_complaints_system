// frontend/pages/SystemSettings.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import { useTranslation } from "react-i18next";

const normalizeSettingsFromApi = (raw) => {
  if (!raw) return null;
  return {
    ...raw,
    ai_min_confidence: raw.ai_min_confidence,
    similarity_threshold: raw.similarity_threshold,
    spam_max_per_day: raw.spam_max_per_day,
    spam_max_per_hour: raw.spam_max_per_hour,
  };
};

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      setErr("");
      setLoading(true);
      try {
        const meRes = await api.get("/api/v1/auth/me/");
        const me = meRes.data;
        const canManageAi =
          me?.is_superuser || me?.profile?.can_manage_ai_settings;
        if (!canManageAi) {
          setErr(t("systemSettings.errors.onlyAdmins"));
          clearTokens();
          navigate("/");
          return;
        }
        const res = await api.get("/api/v1/settings/");
        setSettings(normalizeSettingsFromApi(res.data));
      } catch (e) {
        console.log(
          "SETTINGS LOAD ERROR:",
          e?.response?.status,
          e?.response?.data
        );
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          setErr(t("systemSettings.errors.onlyAdmins"));
          clearTokens();
          navigate("/");
        } else {
          setErr(t("systemSettings.errors.loadFailed"));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, t]);

  const onChangeBool = (key) => (e) => {
    const checked = e.target.checked;
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const onChangeNumber = (key) => (e) => {
    const raw = e.target.value;
    setSettings((prev) => ({
      ...prev,
      [key]: raw,
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!settings) return;

    setErr("");
    setOk("");
    setSaving(true);

    try {
      const payload = {
        use_ai_summary: settings.use_ai_summary,
        use_ai_routing: settings.use_ai_routing,
        use_duplicate_detection: settings.use_duplicate_detection,
        ai_min_confidence: Number(settings.ai_min_confidence || 0),
        similarity_threshold: Number(settings.similarity_threshold || 0),
        spam_max_per_day: Number(settings.spam_max_per_day || 0),
        spam_max_per_hour: Number(settings.spam_max_per_hour || 0),
        allow_citizen_registration: settings.allow_citizen_registration,
      };

      const res = await api.patch("/api/v1/settings/", payload);
      setSettings(normalizeSettingsFromApi(res.data));
      setOk(t("systemSettings.saveSuccess"));
    } catch (e) {
      console.log(
        "SETTINGS SAVE ERROR:",
        e?.response?.status,
        e?.response?.data
      );
      setErr(t("systemSettings.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <h2 className="page-title">{t("systemSettings.title")}</h2>
          <p>{t("systemSettings.loading")}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <h2 className="page-title">{t("systemSettings.title")}</h2>
          {err && <div className="alert error">{err}</div>}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            {t("systemSettings.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h2 className="page-title">{t("systemSettings.title")}</h2>
            <p className="page-subtitle">{t("systemSettings.subtitle")}</p>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              {t("systemSettings.back")}
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        <form onSubmit={save} className="settings-form">
          {/* AI özellikleri */}
          <section className="settings-section">
            <h3 className="settings-title">
              {t("systemSettings.sections.aiFeatures.title")}
            </h3>
            <p className="settings-help">
              {t("systemSettings.sections.aiFeatures.help")}
            </p>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_ai_summary}
                onChange={onChangeBool("use_ai_summary")}
              />
              {t("systemSettings.fields.use_ai_summary")}
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_ai_routing}
                onChange={onChangeBool("use_ai_routing")}
              />
              {t("systemSettings.fields.use_ai_routing")}
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_duplicate_detection}
                onChange={onChangeBool("use_duplicate_detection")}
              />
              {t("systemSettings.fields.use_duplicate_detection")}
            </label>
          </section>

          {/* Eşik değerleri */}
          <section className="settings-section">
            <h3 className="settings-title">
              {t("systemSettings.sections.thresholds.title")}
            </h3>
            <p className="settings-help">
              {t("systemSettings.sections.thresholds.help")}
            </p>

            <div className="settings-grid-2">
              <div className="field-group">
                <label className="field-label">
                  {t("systemSettings.fields.ai_min_confidence.label")}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  lang="en"
                  className="input"
                  value={settings.ai_min_confidence ?? ""}
                  onChange={onChangeNumber("ai_min_confidence")}
                />
                <p className="field-hint">
                  {t("systemSettings.fields.ai_min_confidence.hint")}
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">
                  {t("systemSettings.fields.similarity_threshold.label")}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  lang="en"
                  className="input"
                  value={settings.similarity_threshold ?? ""}
                  onChange={onChangeNumber("similarity_threshold")}
                />
                <p className="field-hint">
                  {t("systemSettings.fields.similarity_threshold.hint")}
                </p>
              </div>
            </div>
          </section>

          {/* Spam kuralları */}
          <section className="settings-section">
            <h3 className="settings-title">
              {t("systemSettings.sections.spamRules.title")}
            </h3>
            <p className="settings-help">
              {t("systemSettings.sections.spamRules.help")}
            </p>

            <div className="settings-grid-2">
              <div className="field-group">
                <label className="field-label">
                  {t("systemSettings.fields.spam_max_per_day.label")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  lang="en"
                  className="input"
                  value={settings.spam_max_per_day ?? ""}
                  onChange={onChangeNumber("spam_max_per_day")}
                />
                <p className="field-hint">
                  {t("systemSettings.fields.spam_max_per_day.hint")}
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">
                  {t("systemSettings.fields.spam_max_per_hour.label")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  lang="en"
                  className="input"
                  value={settings.spam_max_per_hour ?? ""}
                  onChange={onChangeNumber("spam_max_per_hour")}
                />
                <p className="field-hint">
                  {t("systemSettings.fields.spam_max_per_hour.hint")}
                </p>
              </div>
            </div>
          </section>

          {/* Vatandaş kayıt ayarı */}
          <section className="settings-section">
            <h3 className="settings-title">
              {t("systemSettings.sections.citizenAccounts.title")}
            </h3>
            <p className="settings-help">
              {t("systemSettings.sections.citizenAccounts.help")}
            </p>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.allow_citizen_registration}
                onChange={onChangeBool("allow_citizen_registration")}
              />
              {t("systemSettings.fields.allow_citizen_registration")}
            </label>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? t("systemSettings.buttons.saving")
                : t("systemSettings.buttons.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
