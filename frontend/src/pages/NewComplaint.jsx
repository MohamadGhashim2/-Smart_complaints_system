// frontend/src/pages/NewComplaint.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { clearTokens } from "../auth";
import { useTranslation } from "react-i18next";

export default function NewComplaint() {
  const [text, setText] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [me, setMe] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
    } catch (e) {
      console.log("ME ERROR:", e?.response?.status, e?.response?.data);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await api.get("/api/v1/departments/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setDepartments(data);
    } catch (e) {
      console.log("DEPTS ERROR:", e?.response?.status, e?.response?.data);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/v1/system-settings/");
      setSettings(res.data);
    } catch (e) {
      console.log("SETTINGS ERROR:", e?.response?.status, e?.response?.data);
    }
  };

  useEffect(() => {
    loadMe();
    loadDepartments();
    loadSettings();
  }, []);

  const useAiRouting = settings?.use_ai_routing ?? true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    const cleanText = text.trim();
    if (!cleanText) {
      setErr(t("newComplaint.errors.emptyText"));
      return;
    }

    if (!useAiRouting && !departmentId) {
      setErr(t("newComplaint.errors.departmentRequiredWhenAiOff"));
      return;
    }

    const payload = { text: cleanText };

    if (departmentId) {
      payload.department = Number(departmentId);
    }

    try {
      setSubmitting(true);
      await api.post("/api/v1/complaints/", payload);
      setOk(t("newComplaint.success.created"));
      setText("");
      if (!useAiRouting) setDepartmentId("");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error) {
      const status = error?.response?.status;
      console.log("NEW COMPLAINT ERROR:", status, error?.response?.data);

      if (status === 401) {
        clearTokens();
        navigate("/");
        return;
      }

      if (status === 400 && error?.response?.data?.detail) {
        setErr(String(error.response.data.detail));
      } else {
        setErr(t("newComplaint.errors.genericFail"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = () => {
    if (!me) return "";
    const r = me.profile?.role;
    if (r === "manager") return t("usersManagement.roles.manager");
    if (r === "staff") return t("usersManagement.roles.staff");
    if (r === "citizen") return t("usersManagement.roles.citizen");
    return "";
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* HEADER */}
        <div className="page-header">
          <div>
            <h2 className="page-title">{t("nav.newComplaint")}</h2>
            {me && (
              <p className="page-subtitle">
                {t("newComplaint.loggedInAs")} <strong>{me.username}</strong>
                {roleLabel() && (
                  <>
                    {" "}
                    — {t("newComplaint.roleLabel")}{" "}
                    <strong>{roleLabel()}</strong>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate("/dashboard")}
            >
              {t("common.back")}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="new-complaint-layout">
          {/* MAIN FORM CARD */}
          <div className="card new-complaint-card">
            <div className="card-header">
              <h3>{t("newComplaint.form.title")}</h3>
              <p>{t("newComplaint.form.help")}</p>
            </div>

            <div className="card-body">
              {err && <div className="alert error">{err}</div>}
              {ok && <div className="alert success">{ok}</div>}

              <form onSubmit={handleSubmit} className="form-grid">
                {/* TEXT */}
                <div className="field">
                  <label className="field-label">
                    {t("newComplaint.fields.text")}{" "}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    className="field-control textarea"
                    rows={8}
                    placeholder={t("newComplaint.placeholders.text")}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="field-hint">
                    {t("newComplaint.hints.noAbuse")}
                  </div>
                </div>

                {/* DEPARTMENT */}
                <div className="field">
                  <label className="field-label">
                    {t("newComplaint.fields.department")}{" "}
                    {!useAiRouting && <span className="required">*</span>}
                  </label>

                  <select
                    className="field-control"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    {useAiRouting ? (
                      <>
                        <option value="">
                          {t("newComplaint.department.auto")}
                        </option>
                        <option disabled>──────────────</option>
                      </>
                    ) : (
                      <option value="">
                        {t("newComplaint.department.choose")}
                      </option>
                    )}

                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_tr} ({d.code})
                      </option>
                    ))}
                  </select>

                  <div className="field-hint">
                    {useAiRouting
                      ? t("newComplaint.hints.departmentWithAi")
                      : t("newComplaint.hints.departmentWithoutAi")}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate("/dashboard")}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? t("newComplaint.buttons.submitting")
                      : t("newComplaint.buttons.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SIDE PANEL */}
          <aside className="card new-complaint-side">
            <div className="card-header">
              <h3>{t("newComplaint.side.title")}</h3>
            </div>
            <div className="card-body small">
              <ul className="bullet-list">
                <li>
                  {t("newComplaint.side.items.trackStatus", {
                    page: t("nav.title"),
                  })}
                </li>
                <li>
                  {t("newComplaint.side.items.statusFlow", {
                    new: t("complaints.status.new"),
                    inReview: t("complaints.status.inReview"),
                    closed: t("complaints.status.closed"),
                  })}
                </li>
                <li>{t("newComplaint.side.items.adminCanRoute")}</li>
                <li>{t("newComplaint.side.items.aiDuplicates")}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
