// frontend/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";

const DataTable = DataTableModule.default || DataTableModule;

export default function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);

  // فلاتر الـ DataTable
  const [filterText, setFilterText] = useState("");

  const navigate = useNavigate();

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
    } catch (e) {
      const status = e?.response?.status;
      console.log("ME ERROR:", status, e?.response?.data);
      if (status === 401) {
        clearTokens();
        navigate("/");
      }
    }
  };

  const loadComplaints = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/complaints/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setComplaints(data);
    } catch (error) {
      const status = error?.response?.status;
      console.log("DASHBOARD ERROR:", status, error?.response?.data);

      if (status === 401) {
        clearTokens();
        navigate("/");
        return;
      }
      setErr("Şikâyetler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    clearTokens();
    navigate("/");
  };

  // ====== ROLE / VIEW TYPE ======
  const getRoleLabel = () => {
    if (!me) return "";
    const profileRole = me.profile?.role;

    if (profileRole === "manager") return "Yönetici";
    if (profileRole === "staff") return "Personel";
    if (profileRole === "citizen") return "Vatandaş";

    // fallback
    return me.is_staff ? "Yönetici / Personel" : "Vatandaş";
  };

  const role = me?.profile?.role || (me?.is_staff ? "staff" : "citizen");
  const isStaffView = role === "staff" || role === "manager" || me?.is_staff;

  // ====== Helpers ======
  const statusLabel = (status) => {
    if (status === "new") return "Yeni";
    if (status === "in_review") return "İncelemede";
    if (status === "closed") return "Kapandı";
    return status || "-";
  };

  const statusClass = (status) => {
    if (status === "new") return "badge badge-status-new";
    if (status === "in_review") return "badge badge-status-inreview";
    if (status === "closed") return "badge badge-status-closed";
    return "badge";
  };

  const originLabel = (c) => {
    const dupIndex = c.duplicate_index ?? 0;
    if (dupIndex > 0) return `Mükerrer #${dupIndex}`;
    if (c.used_ai) return "Yapay zekâ";
    return "Manuel";
  };

  const originClass = (c) => {
    const dupIndex = c.duplicate_index ?? 0;
    if (dupIndex > 0) return "badge badge-origin-dup";
    if (c.used_ai) return "badge badge-origin-ai";
    return "badge badge-origin-manual";
  };

  const previewForStaff = (c) => {
    const base = c.summary || c.text || "";
    if (!base) return "—";
    return base.length > 140 ? base.slice(0, 140) + "…" : base;
  };

  const previewForCitizen = (c) => {
    const base = c.text || "";
    if (!base) return "—";
    return base.length > 140 ? base.slice(0, 140) + "…" : base;
  };

  // basit istatistikler
  const total = complaints.length;
  const waiting = complaints.filter(
    (c) => c.status === "new" || c.status === "in_review"
  ).length;
  const aiCount = complaints.filter((c) => c.used_ai).length;
  const dupCount = complaints.filter(
    (c) => (c.duplicate_index ?? 0) > 0
  ).length;

  // ====== FILTERS (client-side) ======
  const filteredComplaints = complaints.filter((c) => {
    const text = filterText.trim().toLowerCase();
    if (!text) return true;

    const fields = [
      c.text || "",
      c.summary || "",
      c.department?.name_tr || "",
      c.department?.code || "",
      c.user_info?.username || "",
    ];

    return fields.some((f) => f.toLowerCase().includes(text));
  });

  // ====== DataTable columns ======
  const staffColumns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: "Vatandaş",
      selector: (row) =>
        row.user_info
          ? `${row.user_info.username} (#${row.user_info.id})`
          : "—",
      sortable: true,
      grow: 1.4,
      wrap: true,
    },
    {
      name: "Tarih",
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "—",
      sortable: true,
      minWidth: "180px",
    },
    {
      name: "Durum",
      selector: (row) => statusLabel(row.status),
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span className={statusClass(row.status)}>
          {statusLabel(row.status)}
        </span>
      ),
    },
    {
      name: "Birim",
      selector: (row) =>
        row.department
          ? `${row.department.name_tr} (${row.department.code})`
          : "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: "Kaynak",
      selector: (row) => originLabel(row),
      sortable: true,
      width: "140px",
      cell: (row) => (
        <span className={originClass(row)}>{originLabel(row)}</span>
      ),
    },
    {
      name: "Güven",
      selector: (row) =>
        typeof row.confidence === "number" ? row.confidence : 0,
      sortable: true,
      width: "90px",
      cell: (row) =>
        typeof row.confidence === "number" ? row.confidence.toFixed(2) : "—",
    },
    {
      name: "Şikâyet",
      selector: (row) => row.summary || row.text || "",
      grow: 2,
      wrap: true,
      cell: (row) => (
        <span style={{ fontSize: 13 }}>{previewForStaff(row)}</span>
      ),
    },
    {
      name: "İşlemler",
      width: "110px",
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => navigate(`/complaints/${row.id}`)}
        >
          Detay
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const citizenColumns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: "Tarih",
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "—",
      sortable: true,
      minWidth: "180px",
    },
    {
      name: "Durum",
      selector: (row) => statusLabel(row.status),
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span className={statusClass(row.status)}>
          {statusLabel(row.status)}
        </span>
      ),
    },
    {
      name: "Birim",
      selector: (row) =>
        row.department
          ? `${row.department.name_tr} (${row.department.code})`
          : "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: "Şikâyet",
      selector: (row) => row.text || "",
      grow: 2,
      wrap: true,
      cell: (row) => (
        <span style={{ fontSize: 13 }}>{previewForCitizen(row)}</span>
      ),
    },
    {
      name: "İşlemler",
      width: "110px",
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => navigate(`/complaints/${row.id}`)}
        >
          Detay
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const columns = isStaffView ? staffColumns : citizenColumns;

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* ==== ÜST BAR ==== */}
        <div className="page-header">
          <div>
            <h2 className="page-title">
              {isStaffView ? "Yönetim Paneli" : "Şikâyetlerim"}
            </h2>
            {me && (
              <p className="page-subtitle">
                Giriş yapan: <strong>{me.username}</strong> — Rol:{" "}
                <strong>{getRoleLabel()}</strong>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/new")}
            >
              Yeni şikâyet
            </button>

            {isStaffView && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/departments")}
                >
                  Birimler
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/users")}
                >
                  Kullanıcılar
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/ai-settings")}
                >
                  Yapay zekâ ayarları
                </button>
              </>
            )}

            <button className="btn btn-ghost" onClick={loadComplaints}>
              Yenile
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              Çıkış
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        {/* ==== İSTATİSTİKLER ==== */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">
              {isStaffView ? "Toplam şikâyet" : "Toplam şikâyetim"}
            </div>
            <div className="stat-value">{total}</div>
            <div className="stat-hint">
              {isStaffView
                ? "Sistemde kayıtlı tüm şikâyet sayısı."
                : "Bu hesapla oluşturduğunuz şikâyet sayısı."}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Bekleyen şikâyet</div>
            <div className="stat-value">{waiting}</div>
            <div className="stat-hint">
              Durumu <strong>Yeni</strong> veya <strong>İncelemede</strong> olan
              şikâyetler.
            </div>
          </div>

          {isStaffView && (
            <>
              <div className="stat-card">
                <div className="stat-label">Yapay zekâ kullanılan</div>
                <div className="stat-value">{aiCount}</div>
                <div className="stat-hint">
                  Otomatik özetleme / yönlendirme yapılan şikâyetler.
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Mükerrer şikâyetler</div>
                <div className="stat-value">{dupCount}</div>
                <div className="stat-hint">
                  Benzer içerikten üretilmiş tekrar şikâyet kayıtları.
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==== FİLTRE + DATATABLE ==== */}
        <div
          style={{
            marginTop: 16,
            marginBottom: 8,
            maxWidth: 420,
          }}
        >
          <input
            className="input"
            placeholder="Metne, vatandaşa veya birime göre ara..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <DataTable
            columns={columns}
            data={filteredComplaints}
            progressPending={loading}
            highlightOnHover
            dense
            pagination
            noDataComponent="Gösterilecek şikâyet bulunamadı."
          />
        </div>
      </div>
    </div>
  );
}
