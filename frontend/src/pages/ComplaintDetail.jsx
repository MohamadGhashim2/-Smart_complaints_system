// frontend/pages/ComplaintDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useTranslation } from "react-i18next";

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editForm, setEditForm] = useState({
    text: "",
    status: "new",
    summary: "",
    departmentId: "",
  });

  const { t } = useTranslation();

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
      return res.data;
    } catch (e) {
      console.log("ME ERROR:", e?.response?.status, e?.response?.data);
      return null;
    }
  };

  const loadComplaint = async () => {
    const res = await api.get(`/api/v1/complaints/${id}/`);
    const c = res.data;
    setComplaint(c);

    setEditForm({
      text: c.text || "",
      status: c.status || "new",
      summary: c.summary || "",
      departmentId: c.department ? String(c.department.id) : "",
    });
  };

  const loadDepartments = async () => {
    const res = await api.get("/api/v1/departments/");
    const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
    setDepartments(data);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const user = await loadMe();
        await loadComplaint();

        const role =
          user?.profile?.role || (user?.is_staff ? "staff" : "citizen");
        const isStaffView =
          role === "staff" || role === "manager" || user?.is_staff;
        if (isStaffView) {
          await loadDepartments();
        }
      } catch (e) {
        console.log(
          "DETAIL LOAD ERROR:",
          e?.response?.status,
          e?.response?.data,
        );
        if (e?.response?.status === 404) {
          setErr(t("complaintDetail.errors.notFound"));
        } else {
          setErr(t("complaintDetail.errors.loadFailed"));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, t]);

  const role = me?.profile?.role || (me?.is_staff ? "staff" : "citizen");
  const isStaffView = role === "staff" || role === "manager" || me?.is_staff;

  const statusLabel = (status) => {
    if (status === "submitted") return t("dashboard.status.submitted");
    if (status === "new") return t("dashboard.status.new");
    if (status === "in_review") return t("dashboard.status.in_review");
    if (status === "closed") return t("dashboard.status.closed");
    return status || "-";
  };

  const statusOptions = [
    { value: "submitted", label: t("dashboard.status.submitted") },
    { value: "new", label: t("dashboard.status.new") },
    { value: "in_review", label: t("dashboard.status.in_review") },
    { value: "closed", label: t("dashboard.status.closed") },
  ];

  const originLabel = (c) => {
    if (!c) return "";
    const dupIndex = c.duplicate_index ?? 0;
    if (dupIndex > 0)
      return t("dashboard.source.duplicate", { index: dupIndex });
    if (c.used_ai) return t("dashboard.source.ai");
    return t("dashboard.source.manual");
  };

  const originClass = (c) => {
    if (!c) return "badge badge-origin-manual";
    const dupIndex = c.duplicate_index ?? 0;
    if (dupIndex > 0) return "badge badge-origin-dup";
    if (c.used_ai) return "badge badge-origin-ai";
    return "badge badge-origin-manual";
  };

  const handleChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isStaffView) return;

    setErr("");
    setOk("");
    setSaving(true);

    const payload = {
      text: editForm.text,
      status: editForm.status,
      summary: editForm.summary,
    };

    if (editForm.departmentId) {
      payload.department_id = Number(editForm.departmentId);
    } else {
      payload.department_id = null;
    }

    try {
      const res = await api.patch(`/api/v1/complaints/${id}/`, payload);
      setComplaint(res.data);
      setOk(t("complaintDetail.messages.updateSuccess"));
    } catch (error) {
      console.log(
        "DETAIL SAVE ERROR:",
        error?.response?.status,
        error?.response?.data,
      );
      setErr(t("complaintDetail.messages.updateError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <p>{t("complaintDetail.loading")}</p>
        </div>
      </div>
    );
  }

  if (err && !complaint) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <div className="page-header">
            <div>
              <h2 className="page-title">{t("complaintDetail.title.staff")}</h2>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-ghost"
                onClick={() => navigate("/dashboard")}
              >
                {t("common.back")}
              </button>
            </div>
          </div>
          <div className="alert error">{err}</div>
        </div>
      </div>
    );
  }

  const c = complaint;

  return (
    <div className="page-shell">
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h2 className="page-title">
              {isStaffView
                ? t("complaintDetail.title.staff")
                : t("complaintDetail.title.citizen")}
            </h2>
            {c && (
              <p className="page-subtitle">
                {t("complaintDetail.header.idLabel")} <strong>{c.id}</strong>
                {" — "}
                {c.created_at
                  ? new Date(c.created_at).toLocaleString("tr-TR")
                  : t("complaintDetail.header.dateMissing")}
                {c.user_info && (
                  <>
                    {" — "}
                    {t("complaintDetail.header.citizenLabel")}{" "}
                    <strong>{c.user_info.username}</strong> (#
                    {c.user_info.id})
                  </>
                )}
              </p>
            )}
          </div>
          <div className="page-actions">
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/dashboard")}
            >
              {t("common.back")}
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* Kart özetleri */}
        {c && (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">
                {t("complaintDetail.cards.status.label")}
              </div>
              <div className="stat-value">{statusLabel(c.status)}</div>
              <div className="stat-hint">
                {t("complaintDetail.cards.status.hint")}
                <br />
                {t("complaintDetail.cards.status.createdAt")}{" "}
                {c.created_at
                  ? new Date(c.created_at).toLocaleString("tr-TR")
                  : "-"}
                {c.in_review_at && (
                  <>
                    <br />
                    {t("complaintDetail.cards.status.inReviewAt")}{" "}
                    {new Date(c.in_review_at).toLocaleString("tr-TR")}
                  </>
                )}
                {c.closed_at && (
                  <>
                    <br />
                    {t("complaintDetail.cards.status.closedAt")}{" "}
                    {new Date(c.closed_at).toLocaleString("tr-TR")}
                  </>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                {t("complaintDetail.cards.department.label")}
              </div>
              <div className="stat-value">
                {c.department
                  ? `${c.department.name_tr} (${c.department.code})`
                  : c.status === "submitted" ||
                      c.status === "new" ||
                      c.status === "in_review"
                    ? t("dashboard.department.pendingReview")
                    : t("complaintDetail.cards.department.unassigned")}
              </div>
              <div className="stat-hint">
                {t("complaintDetail.cards.department.hint")}
              </div>
            </div>

            {isStaffView && (
              <>
                <div className="stat-card">
                  <div className="stat-label">
                    {t("complaintDetail.cards.source.label")}
                  </div>
                  <div className="stat-value">
                    <span className={originClass(c)}>{originLabel(c)}</span>
                  </div>
                  <div className="stat-hint">
                    {t("complaintDetail.cards.source.hint")}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">
                    {t("complaintDetail.cards.confidence.label")}
                  </div>
                  <div className="stat-value">
                    {typeof c.confidence === "number"
                      ? c.confidence.toFixed(2)
                      : "—"}
                  </div>
                  <div className="stat-hint">
                    {t("complaintDetail.cards.confidence.hint")}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Vatandaş için فقط قراءة */}
        {!isStaffView && c && (
          <div className="complaint-card complaint-card--read">
            <h3 className="complaint-card-title">
              {t("complaintDetail.readOnly.title")}
            </h3>
            <p className="complaint-text">{c.text}</p>
          </div>
        )}

        {/* Personel / yönetici için düzenleme formu */}
        {isStaffView && c && (
          <div className="complaint-card complaint-card--edit">
            <h3 className="complaint-card-title">
              {t("complaintDetail.edit.title")}
            </h3>

            <form
              className="form complaint-edit-form"
              onSubmit={handleSave}
              autoComplete="off"
            >
              <div className="field-group">
                <label className="field-label">
                  {t("complaintDetail.edit.fields.status")}
                </label>
                <select
                  className="input"
                  value={editForm.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">
                  {t("complaintDetail.edit.fields.department")}
                </label>
                <select
                  className="input"
                  value={editForm.departmentId}
                  onChange={(e) => handleChange("departmentId", e.target.value)}
                >
                  <option value="">
                    ({t("complaintDetail.cards.department.unassigned")})
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_tr} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">
                  {t("complaintDetail.edit.fields.text")}
                </label>
                <textarea
                  className="input complaint-textarea"
                  value={editForm.text}
                  onChange={(e) => handleChange("text", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  {t("complaintDetail.edit.fields.summary")}
                </label>
                <textarea
                  className="input complaint-summary-input"
                  value={editForm.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  placeholder={t(
                    "complaintDetail.edit.fields.summaryPlaceholder",
                  )}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? t("complaintDetail.edit.buttons.saving")
                    : t("complaintDetail.edit.buttons.save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate("/dashboard")}
                >
                  {t("complaintDetail.edit.buttons.cancel")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
