// frontend/src/pages/Departments.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";

const DataTable = DataTableModule.default || DataTableModule;

export default function Departments() {
  const [me, setMe] = useState(null);
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // form states
  const [form, setForm] = useState({ name_tr: "", name_ar: "", code: "" });
  const [editing, setEditing] = useState(null); // dept object or null

  // filter state (search)
  const [filterText, setFilterText] = useState("");

  const navigate = useNavigate();

  const isStaffOrManager = (user) =>
    user?.is_staff ||
    user?.profile?.role === "staff" ||
    user?.profile?.role === "manager";

  const getRoleLabel = () => {
    if (!me) return "";
    const role = me.profile?.role;

    if (role === "manager") return "Yönetici";
    if (role === "staff") return "Personel";
    if (role === "citizen") return "Vatandaş";

    return me.is_staff ? "Yönetici / Personel" : "Vatandaş";
  };

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
      return res.data;
    } catch (e) {
      const status = e?.response?.status;
      console.log("ME ERROR:", status, e?.response?.data);
      if (status === 401) {
        clearTokens();
        navigate("/");
      } else {
        setErr("Kullanıcı bilgileri alınamadı.");
      }
      setLoading(false);
      return null;
    }
  };

  const loadDepartments = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/departments/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setDeps(data);
    } catch (e) {
      const status = e?.response?.status;
      console.log("DEPS ERROR:", status, e?.response?.data);
      if (status === 401) {
        clearTokens();
        navigate("/");
        return;
      }
      if (status === 403) {
        setErr("Bu sayfa için yetkiniz yok.");
      } else {
        setErr("Birimler yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const u = await loadMe();
      if (!u) return;

      if (!isStaffOrManager(u)) {
        // مواطن → نوقف تحميل الأقسام
        setLoading(false);
        return;
      }

      await loadDepartments();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({ name_tr: "", name_ar: "", code: "" });
    setEditing(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.name_tr.trim() || !form.code.trim()) {
      setErr("Türkçe ad ve kod zorunludur.");
      return;
    }

    const payload = {
      name_tr: form.name_tr.trim(),
      code: form.code.trim(),
      name_ar: form.name_ar.trim() || null,
    };

    try {
      if (editing) {
        await api.patch(`/api/v1/departments/${editing.id}/`, payload);
        setOk("Birim başarıyla güncellendi.");
      } else {
        await api.post(`/api/v1/departments/`, payload);
        setOk("Yeni birim oluşturuldu.");
      }
      resetForm();
      await loadDepartments();
    } catch (e2) {
      console.log("SAVE DEP ERROR:", e2?.response?.status, e2?.response?.data);
      if (e2?.response?.data) {
        setErr("Kaydetme hatası: " + JSON.stringify(e2.response.data));
      } else {
        setErr("Birim kaydedilemedi.");
      }
    }
  };

  const startEdit = (d) => {
    setEditing(d);
    setForm({
      name_tr: d.name_tr || "",
      name_ar: d.name_ar || "",
      code: d.code || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (d) => {
    if (!window.confirm(`"${d.name_tr}" birimini silmek istiyor musunuz?`))
      return;
    setErr("");
    setOk("");
    try {
      await api.delete(`/api/v1/departments/${d.id}/`);
      setOk("Birim silindi.");
      await loadDepartments();
    } catch (e) {
      console.log("DELETE ERROR:", e?.response?.status, e?.response?.data);
      setErr("Birim silinemedi.");
    }
  };

  const staffView = me && isStaffOrManager(me); // هل المستخدم مدير/موظف؟

  // مواطن يحاول يفتح صفحة الأقسام
  if (!loading && me && !staffView) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <div className="page-header">
            <div>
              <h2 className="page-title">Birimler</h2>
              <p className="page-subtitle">
                Bu sayfa sadece <strong>yönetici</strong> ve{" "}
                <strong>belediye personeli</strong> için.
              </p>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Geri
              </button>
            </div>
          </div>

          <div className="alert error">
            Yetkiniz olmadığı için birimleri görüntüleyemezsiniz.
          </div>
        </div>
      </div>
    );
  }

  // ====== Filtered departments for DataTable ======
  const filteredDeps = deps.filter((d) => {
    const txt = filterText.trim().toLowerCase();
    if (!txt) return true;

    return (
      (d.name_tr || "").toLowerCase().includes(txt) ||
      (d.code || "").toLowerCase().includes(txt) ||
      (d.name_ar || "").toLowerCase().includes(txt)
    );
  });

  // ====== DataTable columns ======
  const columns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      width: "80px",
    },
    {
      name: "Türkçe ad",
      selector: (row) => row.name_tr,
      sortable: true,
      grow: 1.6,
      wrap: true,
    },
    {
      name: "Kod",
      selector: (row) => row.code,
      sortable: true,
      width: "140px",
      cell: (row) => <strong>{row.code}</strong>,
    },
    {
      name: "Arapça ad",
      selector: (row) => row.name_ar || "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: "İşlemler",
      width: "170px",
      cell: (row) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => startEdit(row)}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Düzenle
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "#f97373", padding: "4px 10px", fontSize: 12 }}
            onClick={() => remove(row)}
          >
            Sil
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* Üst başlık */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Birimler</h2>
            <p className="page-subtitle">
              Belediyede kullanılan hizmet birimlerini ekleyin, güncelleyin ve
              kaldırın.
            </p>
            {me && (
              <p className="page-subtitle small">
                Giriş yapan: <strong>{me.username}</strong> — Rol:{" "}
                <strong>{getRoleLabel()}</strong>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Geri
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={loadDepartments}
            >
              Yenile
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* Form kartı */}
        <div className="departments-form-card">
          <div className="departments-form-header">
            <h3 className="departments-form-title">
              {editing ? `Birim düzenle (#${editing.id})` : "Yeni birim ekle"}
            </h3>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
              >
                İptal et
              </button>
            )}
          </div>

          <form
            onSubmit={submit}
            className="departments-form-grid"
            autoComplete="off"
          >
            <div className="form-field">
              <label>Türkçe ad *</label>
              <input
                className="input"
                value={form.name_tr}
                onChange={(e) => onChange("name_tr", e.target.value)}
                placeholder="Örn. Belediye"
              />
            </div>

            <div className="form-field">
              <label>Kod *</label>
              <input
                className="input"
                value={form.code}
                onChange={(e) => onChange("code", e.target.value)}
                placeholder="Örn. MUNIC, HEALTH"
              />
            </div>

            <div className="form-field">
              <label>Arapça ad (isteğe bağlı)</label>
              <input
                className="input"
                value={form.name_ar}
                onChange={(e) => onChange("name_ar", e.target.value)}
                placeholder="مثال: البلدية"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editing ? "Kaydet" : "Oluştur"}
              </button>
            </div>
          </form>
        </div>

        {/* Tablo + DataTable */}
        {loading ? (
          <p>Yükleniyor...</p>
        ) : deps.length === 0 ? (
          <p style={{ color: "#9ca3af", marginTop: 16 }}>
            Henüz birim tanımlanmamış.
          </p>
        ) : (
          <>
            <div
              style={{
                marginTop: 18,
                marginBottom: 8,
                maxWidth: 360,
              }}
            >
              <input
                className="input"
                placeholder="Ada, koda veya Arapça ada göre ara..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>

            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <DataTable
                columns={columns}
                data={filteredDeps}
                progressPending={loading}
                highlightOnHover
                dense
                pagination
                noDataComponent="Gösterilecek birim bulunamadı."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
