// frontend/src/pages/NewComplaint.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { clearTokens } from "../auth";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useAiRouting = settings?.use_ai_routing ?? true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    const cleanText = text.trim();
    if (!cleanText) {
      setErr("Lütfen şikâyet metnini yazın.");
      return;
    }

    if (!useAiRouting && !departmentId) {
      setErr("Yapay zekâ kapalıyken birim seçmek zorunludur.");
      return;
    }

    const payload = { text: cleanText };

    if (departmentId) {
      payload.department = Number(departmentId);
    }

    try {
      setSubmitting(true);
      await api.post("/api/v1/complaints/", payload);
      setOk("Şikâyetiniz başarıyla kaydedildi.");
      setText("");
      if (!useAiRouting) setDepartmentId("");
      // بعد ثانيتين نرجع للداشبورد
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
        setErr("Şikâyet oluşturulurken bir hata oluştu.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = () => {
    if (!me) return "";
    const r = me.profile?.role;
    if (r === "manager") return "Yönetici";
    if (r === "staff") return "Personel";
    if (r === "citizen") return "Vatandaş";
    return "";
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* HEADER */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Yeni şikâyet</h2>
            {me && (
              <p className="page-subtitle">
                Giriş yapan: <strong>{me.username}</strong>
                {roleLabel() && (
                  <>
                    {" "}
                    — Rol: <strong>{roleLabel()}</strong>
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
              Geri dön
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="new-complaint-layout">
          {/* MAIN FORM CARD */}
          <div className="card new-complaint-card">
            <div className="card-header">
              <h3>Şikâyet formu</h3>
              <p>
                Lütfen problemi mümkün olduğunca açık bir şekilde Türkçe veya
                Arapça olarak yazınız.
              </p>
            </div>

            <div className="card-body">
              {err && <div className="alert error">{err}</div>}
              {ok && <div className="alert success">{ok}</div>}

              <form onSubmit={handleSubmit} className="form-grid">
                {/* TEXT */}
                <div className="field">
                  <label className="field-label">
                    Şikâyet metni <span className="required">*</span>
                  </label>
                  <textarea
                    className="field-control textarea"
                    rows={8}
                    placeholder="Örnek: Mahallemizdeki sokak lambaları çalışmıyor, akşamları çok karanlık oluyor..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="field-hint">
                    Hakaret içeren mesajlar, küfür veya kişisel bilgiler
                    paylaşmayınız.
                  </div>
                </div>

                {/* DEPARTMENT */}
                <div className="field">
                  <label className="field-label">
                    Birim seçimi{" "}
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
                          — Otomatik (yapay zekâ yönlendirsin) —
                        </option>
                        <option disabled>──────────────</option>
                      </>
                    ) : (
                      <option value="">— Birim seçin —</option>
                    )}

                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_tr} ({d.code})
                      </option>
                    ))}
                  </select>

                  <div className="field-hint">
                    {useAiRouting
                      ? "İsterseniz birim seçmeden bırakabilirsiniz, sistem en uygun kuruma yönlendirmeye çalışır."
                      : "Yapay zekâ yönlendirmesi kapalı olduğu için birim seçmek zorunludur."}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate("/dashboard")}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Gönderiliyor..." : "Şikâyeti gönder"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SIDE PANEL */}
          <aside className="card new-complaint-side">
            <div className="card-header">
              <h3>Sistem hakkında</h3>
            </div>
            <div className="card-body small">
              <ul className="bullet-list">
                <li>
                  Şikâyetiniz sisteme kaydedildikten sonra durumunu{" "}
                  <strong>Şikâyetlerim</strong> sayfasından takip edebilirsiniz.
                </li>
                <li>
                  Durumlar: <strong>Yeni</strong> → <strong>İncelemede</strong>{" "}
                  → <strong>Kapandı</strong>.
                </li>
                <li>
                  Yönetici, şikâyetinizi ilgili birime yönlendirebilir ve
                  gerekirse sizinle iletişime geçebilir.
                </li>
                <li>
                  Yapay zekâ açıksa benzer şikâyetler tespit edilip{" "}
                  <strong>mükerrer</strong> olarak işaretlenebilir.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
