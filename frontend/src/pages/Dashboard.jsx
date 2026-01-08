// frontend/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";
import { useTranslation } from "react-i18next";

const DataTable = DataTableModule.default || DataTableModule;

export default function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);

  // فلاتر الـ DataTable
  const [filterText, setFilterText] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();

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
      setErr(t("dashboard.errors.loadFailed"));
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

    if (profileRole === "manager") return t("usersManagement.roles.manager");
    if (profileRole === "staff") return t("usersManagement.roles.staff");
    if (profileRole === "citizen") return t("usersManagement.roles.citizen");

    // fallback
    return me.is_staff
      ? t("departments.role.staffOrManager")
      : t("usersManagement.roles.citizen");
  };

  const role = me?.profile?.role || (me?.is_staff ? "staff" : "citizen");
  const isStaffView = role === "staff" || role === "manager" || me?.is_staff;

  // ✅ صلاحيات تفصيلية من البروفايل
  const profilePerms = me?.profile || {};
  const canManageDepartments =
    me?.is_superuser || profilePerms.can_manage_departments;
  const canManageUsers = me?.is_superuser || profilePerms.can_manage_users;
  const canManageAiSettings =
    me?.is_superuser || profilePerms.can_manage_ai_settings;

  // ====== Helpers ======
  const statusLabel = (status) => {
    if (status === "new") return t("dashboard.status.new");
    if (status === "in_review") return t("dashboard.status.in_review");
    if (status === "closed") return t("dashboard.status.closed");
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
    if (dupIndex > 0)
      return t("dashboard.source.duplicate", { index: dupIndex });
    if (c.used_ai) return t("dashboard.source.ai");
    return t("dashboard.source.manual");
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
      name: t("dashboard.table.columns.id"),
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: t("dashboard.table.columns.citizen"),
      selector: (row) =>
        row.user_info
          ? `${row.user_info.username} (#${row.user_info.id})`
          : "—",
      sortable: true,
      grow: 1.4,
      wrap: true,
    },
    {
      name: t("dashboard.table.columns.date"),
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "—",
      sortable: true,
      minWidth: "180px",
    },
    {
      name: t("dashboard.table.columns.status"),
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
      name: t("dashboard.table.columns.department"),
      selector: (row) =>
        row.department
          ? `${row.department.name_tr} (${row.department.code})`
          : "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: t("dashboard.table.columns.source"),
      selector: (row) => originLabel(row),
      sortable: true,
      width: "140px",
      cell: (row) => (
        <span className={originClass(row)}>{originLabel(row)}</span>
      ),
    },
    {
      name: t("dashboard.table.columns.confidence"),
      selector: (row) =>
        typeof row.confidence === "number" ? row.confidence : 0,
      sortable: true,
      width: "90px",
      cell: (row) =>
        typeof row.confidence === "number" ? row.confidence.toFixed(2) : "—",
    },
    {
      name: t("dashboard.table.columns.complaint"),
      selector: (row) => row.summary || row.text || "",
      grow: 2,
      wrap: true,
      cell: (row) => (
        <span style={{ fontSize: 13 }}>{previewForStaff(row)}</span>
      ),
    },
    {
      name: t("dashboard.table.columns.actions"),
      width: "110px",
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => navigate(`/complaints/${row.id}`)}
        >
          {t("dashboard.table.actions.details")}
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const citizenColumns = [
    {
      name: t("dashboard.table.columns.id"),
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: t("dashboard.table.columns.date"),
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString("tr-TR") : "—",
      sortable: true,
      minWidth: "180px",
    },
    {
      name: t("dashboard.table.columns.status"),
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
      name: t("dashboard.table.columns.department"),
      selector: (row) =>
        row.department
          ? `${row.department.name_tr} (${row.department.code})`
          : "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: t("dashboard.table.columns.complaint"),
      selector: (row) => row.text || "",
      grow: 2,
      wrap: true,
      cell: (row) => (
        <span style={{ fontSize: 13 }}>{previewForCitizen(row)}</span>
      ),
    },
    {
      name: t("dashboard.table.columns.actions"),
      width: "110px",
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => navigate(`/complaints/${row.id}`)}
        >
          {t("dashboard.table.actions.details")}
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
              {isStaffView
                ? t("dashboard.title.staff")
                : t("dashboard.title.citizen")}
            </h2>
            {me && (
              <p className="page-subtitle">
                {t("dashboard.header.loggedInAs")}{" "}
                <strong>{me.username}</strong> — {t("dashboard.header.role")}{" "}
                <strong>{getRoleLabel()}</strong>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/new")}
            >
              {t("nav.newComplaint")}
            </button>

            {isStaffView && (
              <>
                {canManageDepartments && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/departments")}
                  >
                    {t("nav.departments")}
                  </button>
                )}
                {canManageUsers && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/users")}
                  >
                    {t("nav.users")}
                  </button>
                )}

                {canManageAiSettings && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/ai-settings")}
                  >
                    {t("nav.aiSettings")}
                  </button>
                )}
              </>
            )}

            <button className="btn btn-ghost" onClick={loadComplaints}>
              {t("common.refresh")}
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              {t("nav.logout")}
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        {/* ==== İSTATİSTİKLER ==== */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">
              {isStaffView
                ? t("dashboard.stats.total.staffLabel")
                : t("dashboard.stats.total.citizenLabel")}
            </div>
            <div className="stat-value">{total}</div>
            <div className="stat-hint">
              {isStaffView
                ? t("dashboard.stats.total.staffHint")
                : t("dashboard.stats.total.citizenHint")}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              {t("dashboard.stats.waiting.label")}
            </div>
            <div className="stat-value">{waiting}</div>
            <div className="stat-hint">{t("dashboard.stats.waiting.hint")}</div>
          </div>

          {isStaffView && (
            <>
              <div className="stat-card">
                <div className="stat-label">
                  {t("dashboard.stats.aiUsed.label")}
                </div>
                <div className="stat-value">{aiCount}</div>
                <div className="stat-hint">
                  {t("dashboard.stats.aiUsed.hint")}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  {t("dashboard.stats.duplicates.label")}
                </div>
                <div className="stat-value">{dupCount}</div>
                <div className="stat-hint">
                  {t("dashboard.stats.duplicates.hint")}
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
            placeholder={t("dashboard.table.searchPlaceholder")}
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
            noDataComponent={t("dashboard.table.noData")}
          />
        </div>
      </div>
    </div>
  );
}
