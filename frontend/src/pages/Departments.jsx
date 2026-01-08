// frontend/src/pages/Departments.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const getRoleLabel = () => {
    if (!me) return "";
    const role = me.profile?.role;

    if (role === "manager") return t("usersManagement.roles.manager");
    if (role === "staff") return t("usersManagement.roles.staff");
    if (role === "citizen") return t("usersManagement.roles.citizen");

    return me.is_staff
      ? t("departments.role.staffOrManager")
      : t("usersManagement.roles.citizen");
  };

  // ✅ فقط من عنده صلاحية manage_departments
  const canManageDepartments = (user) =>
    user?.is_superuser || user?.profile?.can_manage_departments;

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
        setErr(t("departments.errors.meLoad"));
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
      if (status === 401 || status === 403) {
        clearTokens();
        navigate("/");
        setErr(t("departments.errors.noAccess"));
        return;
      } else {
        setErr(t("departments.errors.loadFailed"));
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

      if (!canManageDepartments(u)) {
        alert(t("departments.errors.noAccessAlert"));
        clearTokens();
        navigate("/");
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
      setErr(t("departments.errors.validationNameCodeRequired"));
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
        setOk(t("departments.success.updated"));
      } else {
        await api.post(`/api/v1/departments/`, payload);
        setOk(t("departments.success.created"));
      }
      resetForm();
      await loadDepartments();
    } catch (e2) {
      console.log("SAVE DEP ERROR:", e2?.response?.status, e2?.response?.data);
      if (e2?.response?.data) {
        setErr(
          t("departments.errors.saveFailedWithDetails", {
            details: JSON.stringify(e2.response.data),
          })
        );
      } else {
        setErr(t("departments.errors.saveFailed"));
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
    if (!window.confirm(t("departments.confirm.delete", { name: d.name_tr })))
      return;
    setErr("");
    setOk("");
    try {
      await api.delete(`/api/v1/departments/${d.id}/`);
      setOk(t("departments.success.deleted"));
      await loadDepartments();
    } catch (e) {
      console.log("DELETE ERROR:", e?.response?.status, e?.response?.data);
      setErr(t("departments.errors.deleteFailed"));
    }
  };

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
      name: t("departments.table.columns.id"),
      selector: (row) => row.id,
      sortable: true,
      width: "80px",
    },
    {
      name: t("departments.table.columns.name_tr"),
      selector: (row) => row.name_tr,
      sortable: true,
      grow: 1.6,
      wrap: true,
    },
    {
      name: t("departments.table.columns.code"),
      selector: (row) => row.code,
      sortable: true,
      width: "140px",
      cell: (row) => <strong>{row.code}</strong>,
    },
    {
      name: t("departments.table.columns.name_ar"),
      selector: (row) => row.name_ar || "—",
      sortable: true,
      grow: 1.3,
      wrap: true,
    },
    {
      name: t("departments.table.columns.actions"),
      width: "170px",
      cell: (row) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => startEdit(row)}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "#f97373", padding: "4px 10px", fontSize: 12 }}
            onClick={() => remove(row)}
          >
            {t("common.delete")}
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
            <h2 className="page-title">{t("departments.title")}</h2>
            <p className="page-subtitle">{t("departments.subtitle")}</p>
            {me && (
              <p className="page-subtitle small">
                {t("departments.loggedInAs")} <strong>{me.username}</strong> —{" "}
                {t("departments.roleLabel")} <strong>{getRoleLabel()}</strong>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              {t("common.back")}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={loadDepartments}
            >
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* Form kartı */}
        <div className="departments-form-card">
          <div className="departments-form-header">
            <h3 className="departments-form-title">
              {editing
                ? t("departments.form.titleEdit", { id: editing.id })
                : t("departments.form.titleNew")}
            </h3>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
              >
                {t("common.cancel")}
              </button>
            )}
          </div>

          <form
            onSubmit={submit}
            className="departments-form-grid"
            autoComplete="off"
          >
            <div className="form-field">
              <label>{t("departments.fields.name_tr")} *</label>
              <input
                className="input"
                value={form.name_tr}
                onChange={(e) => onChange("name_tr", e.target.value)}
                placeholder={t("departments.placeholders.name_tr")}
              />
            </div>

            <div className="form-field">
              <label>{t("departments.fields.code")} *</label>
              <input
                className="input"
                value={form.code}
                onChange={(e) => onChange("code", e.target.value)}
                placeholder={t("departments.placeholders.code")}
              />
            </div>

            <div className="form-field">
              <label>{t("departments.fields.name_ar_optional")}</label>
              <input
                className="input"
                value={form.name_ar}
                onChange={(e) => onChange("name_ar", e.target.value)}
                placeholder={t("departments.placeholders.name_ar")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editing ? t("common.save") : t("common.create")}
              </button>
            </div>
          </form>
        </div>

        {/* Tablo + DataTable */}
        {loading ? (
          <p>{t("common.loading")}</p>
        ) : deps.length === 0 ? (
          <p style={{ color: "#9ca3af", marginTop: 16 }}>
            {t("departments.empty")}
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
                placeholder={t("departments.search.placeholder")}
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
                noDataComponent={t("departments.table.noData")}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
