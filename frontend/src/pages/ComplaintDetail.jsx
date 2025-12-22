// frontend/pages/ComplaintDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";

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
          e?.response?.data
        );
        if (e?.response?.status === 404) {
          setErr("Şikâyet bulunamadı.");
        } else {
          setErr("Şikâyet detayı yüklenemedi.");
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const role = me?.profile?.role || (me?.is_staff ? "staff" : "citizen");
  const isStaffView = role === "staff" || role === "manager" || me?.is_staff;

  const statusLabel = (status) => {
    if (status === "new") return "Yeni";
    if (status === "in_review") return "İncelemede";
    if (status === "closed") return "Kapandı";
    return status || "-";
  };

  const statusOptions = [
    { value: "new", label: "Yeni" },
    { value: "in_review", label: "İncelemede" },
    { value: "closed", label: "Kapandı" },
  ];

  const originLabel = (c) => {
    if (!c) return "";
    const dupIndex = c.duplicate_index ?? 0;
    if (dupIndex > 0) return `Mükerrer #${dupIndex}`;
    if (c.used_ai) return "Yapay zekâ";
    return "Manuel";
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
      setOk("Şikâyet güncellendi.");
    } catch (error) {
      console.log(
        "DETAIL SAVE ERROR:",
        error?.response?.status,
        error?.response?.data
      );
      setErr("Güncelleme başarısız. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <p>Yükleniyor...</p>
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
              <h2 className="page-title">Şikâyet Detayı</h2>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-ghost"
                onClick={() => navigate("/dashboard")}
              >
                Geri dön
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
              {isStaffView ? "Şikâyet Detayı" : "Şikâyetim"}
            </h2>
            {c && (
              <p className="page-subtitle">
                ID: <strong>{c.id}</strong>
                {" — "}
                {c.created_at
                  ? new Date(c.created_at).toLocaleString("tr-TR")
                  : "Tarih yok"}
                {c.user_info && (
                  <>
                    {" — Vatandaş: "}
                    <strong>{c.user_info.username}</strong> (#{c.user_info.id})
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
              Geri dön
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* Kart özetleri */}
        {c && (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Durum</div>
              <div className="stat-value">{statusLabel(c.status)}</div>
              <div className="stat-hint">
                Şikâyetin işlenme durumu (Yeni / İncelemede / Kapandı).
                <br />
                Oluşturuldu:{" "}
                {c.created_at
                  ? new Date(c.created_at).toLocaleString("tr-TR")
                  : "-"}
                {c.in_review_at && (
                  <>
                    <br />
                    İncelemeye alındı:{" "}
                    {new Date(c.in_review_at).toLocaleString("tr-TR")}
                  </>
                )}
                {c.closed_at && (
                  <>
                    <br />
                    Kapatılma tarihi:{" "}
                    {new Date(c.closed_at).toLocaleString("tr-TR")}
                  </>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Birim</div>
              <div className="stat-value">
                {c.department
                  ? `${c.department.name_tr} (${c.department.code})`
                  : "Atanmamış"}
              </div>
              <div className="stat-hint">
                Şikâyetin yönlendirildiği belediye birimi / bakanlık.
              </div>
            </div>

            {isStaffView && (
              <>
                <div className="stat-card">
                  <div className="stat-label">Kaynak</div>
                  <div className="stat-value">
                    <span className={originClass(c)}>{originLabel(c)}</span>
                  </div>
                  <div className="stat-hint">
                    Mükerrer / yapay zekâ / manuel sınıflandırma bilgisi.
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Model güveni</div>
                  <div className="stat-value">
                    {typeof c.confidence === "number"
                      ? c.confidence.toFixed(2)
                      : "—"}
                  </div>
                  <div className="stat-hint">
                    Yapay zekâ modelinin ilgili birime yönlendirme güven oranı.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Vatandaş için فقط قراءة */}
        {!isStaffView && c && (
          <div className="complaint-card complaint-card--read">
            <h3 className="complaint-card-title">Şikâyet metni</h3>
            <p className="complaint-text">{c.text}</p>
          </div>
        )}

        {/* Personel / yönetici için düzenleme formu */}
        {isStaffView && c && (
          <div className="complaint-card complaint-card--edit">
            <h3 className="complaint-card-title">Şikâyeti düzenle</h3>

            <form
              className="form complaint-edit-form"
              onSubmit={handleSave}
              autoComplete="off"
            >
              <div className="field-group">
                <label className="field-label">Durum</label>
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
                <label className="field-label">Birim</label>
                <select
                  className="input"
                  value={editForm.departmentId}
                  onChange={(e) => handleChange("departmentId", e.target.value)}
                >
                  <option value="">(Atanmamış)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_tr} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Şikâyet metni</label>
                <textarea
                  className="input complaint-textarea"
                  value={editForm.text}
                  onChange={(e) => handleChange("text", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Özet (yapay zekâ)</label>
                <textarea
                  className="input complaint-summary-input"
                  value={editForm.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  placeholder="Gerekirse özeti manuel olarak düzeltebilirsiniz."
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate("/dashboard")}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
