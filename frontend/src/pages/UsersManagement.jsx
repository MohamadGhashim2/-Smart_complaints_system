// frontend/pages/UsersManagement.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";
import { useTranslation } from "react-i18next";
import { useToast } from "../components/ToastProvider";

const DataTable = DataTableModule.default || DataTableModule;

export default function UsersManagement() {
  const { t } = useTranslation();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    password2: "",
    role: "citizen", // citizen / staff / manager
    national_id: "",
    is_staff: false,
    // صلاحيات الشكاوي / الإدارة
    can_read_complaints: false,
    can_update_complaints: false,
    can_reply_complaints: false,
    can_manage_departments: false,
    can_manage_users: false,
    can_manage_ai_settings: false,
    // النطاق الجديد
    view_scope: "all", // all / assigned / unassigned
    allowed_departments: [], // [id1, id2, ...]
  });

  const [editing, setEditing] = useState(null); // current user row
  const [editForm, setEditForm] = useState(null);

  const editCardRef = useRef(null);

  // ===== فلاتر البحث =====
  const [filterText, setFilterText] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterBlocked, setFilterBlocked] = useState("all");

  const navigate = useNavigate();
  const showError = (message) => {
    setErr(message);
    toast.error(message);
  };

  const showSuccess = (message) => {
    setOk(message);
    toast.success(message);
  };
  // ===== Helpers =====
  const canManageUsers = (u) => u?.is_superuser || u?.profile?.can_manage_users;

  const roleLabelFromString = (role, isStaff) => {
    const r = (role || "").toString().toLowerCase();
    if (r === "manager") return t("usersManagement.roles.manager");
    if (r === "staff") return t("usersManagement.roles.staff");
    if (r === "citizen") return t("usersManagement.roles.citizen");
    return isStaff
      ? t("usersManagement.roles.staff")
      : t("usersManagement.roles.citizen");
  };

  const roleLabel = (u) =>
    roleLabelFromString(
      u?.role || u?.profile?.role,
      u?.is_staff ?? u?.profile?.is_staff,
    );

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
        showError(t("usersManagement.errors.meLoad"));
      }
      setLoading(false);
      return null;
    }
  };

  const loadUsers = async () => {
    showError("");
    showSuccess("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/users/");
      const arr = Array.isArray(res.data) ? res.data : [];
      setUsers(arr);
    } catch (e) {
      console.log("USERS LOAD ERROR:", e?.response?.status, e?.response?.data);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        clearTokens();
        navigate("/");
        showError(t("usersManagement.errors.noAccess"));
        return;
      } else {
        showError(t("usersManagement.errors.usersLoad"));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await api.get("/api/v1/departments/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setDepartments(data);
    } catch (e) {
      console.log("DEPARTMENTS ERROR:", e?.response?.status, e?.response?.data);
    }
  };

  // تحميل أولي مرة واحدة
  useEffect(() => {
    (async () => {
      const u = await loadMe();
      if (!u) return;

      if (!canManageUsers(u)) {
        setLoading(false);
        clearTokens();
        navigate("/");
        toast.error(t("usersManagement.errors.noAccess"));
        return;
      }

      await loadUsers();
      await loadDepartments();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // سحب الصفحة إلى بطاقة التعديل عند اختيار مستخدم
  useEffect(() => {
    if (editing && editCardRef.current) {
      editCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [editing]);

  // ===== Create form handlers =====
  const updateCreateField = (key, value) => {
    setCreateForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleCreateBool = (key) => {
    setCreateForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleCreateDepartment = (depId) => {
    setCreateForm((prev) => {
      const exists = prev.allowed_departments.includes(depId);
      return {
        ...prev,
        allowed_departments: exists
          ? prev.allowed_departments.filter((id) => id !== depId)
          : [...prev.allowed_departments, depId],
      };
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    showError("");
    showSuccess("");

    if (
      !createForm.username.trim() ||
      !createForm.password ||
      !createForm.password2
    ) {
      showError(t("usersManagement.errors.create.fillUsernameAndPassword"));
      return;
    }

    if (createForm.password !== createForm.password2) {
      showError(t("usersManagement.errors.passwordsDontMatch"));
      return;
    }

    if (createForm.password.length < 6) {
      showError(t("usersManagement.errors.passwordTooShort"));
      return;
    }

    if (
      createForm.role === "citizen" &&
      (createForm.national_id.length !== 11 ||
        !/^\d{11}$/.test(createForm.national_id))
    ) {
      showError(t("usersManagement.errors.nationalIdCitizen11Digits"));
      return;
    }

    const isCitizen = createForm.role === "citizen";

    const payload = {
      username: createForm.username.trim(),
      password: createForm.password,
      password2: createForm.password2,
      role: createForm.role, // citizen / staff / manager
      national_id: createForm.national_id || null,
      is_staff: createForm.is_staff,
      permissions: {
        read_complaints: createForm.can_read_complaints,
        update_complaints: createForm.can_update_complaints,
        reply_complaints: createForm.can_reply_complaints,
        manage_departments: createForm.can_manage_departments,
        manage_users: createForm.can_manage_users,
        manage_ai_settings: createForm.can_manage_ai_settings,
      },
      // الحقول الجديدة
      view_scope: isCitizen ? "all" : createForm.view_scope,
      allowed_department_ids:
        !isCitizen && createForm.view_scope === "assigned"
          ? createForm.allowed_departments.map((id) => Number(id))
          : [],
    };

    try {
      setCreating(true);
      await api.post("/api/v1/users/", payload);
      showSuccess(t("usersManagement.success.userCreated"));
      setCreateForm({
        username: "",
        password: "",
        password2: "",
        role: "citizen",
        national_id: "",
        is_staff: false,
        can_read_complaints: false,
        can_update_complaints: false,
        can_reply_complaints: false,
        can_manage_departments: false,
        can_manage_users: false,
        can_manage_ai_settings: false,
        view_scope: "all",
        allowed_departments: [],
      });
      await loadUsers();
    } catch (e2) {
      console.log(
        "USER CREATE ERROR:",
        e2?.response?.status,
        e2?.response?.data,
      );
      if (e2?.response?.data) {
        const d = e2.response.data;
        if (typeof d === "string") showError(d);
        else if (d.username) showError(String(d.username));
        else if (d.national_id) showError(String(d.national_id));
        else showError(t("usersManagement.errors.userCreateFail"));
      } else {
        showError(t("usersManagement.errors.userCreateFail"));
      }
    } finally {
      setCreating(false);
    }
  };

  // ===== Edit form handlers =====
  const startEdit = (user) => {
    setEditing(user);

    const roleSlug =
      (user.role || user.profile?.role || "").toString().toLowerCase() ||
      "citizen";

    const basePerms = user.permissions || {};
    const prof = user.profile || {};

    const perms = {
      read_complaints:
        basePerms.read_complaints ?? prof.can_read_complaints ?? false,
      update_complaints:
        basePerms.update_complaints ?? prof.can_update_complaints ?? false,
      reply_complaints:
        basePerms.reply_complaints ?? prof.can_reply_complaints ?? false,
      manage_departments:
        basePerms.manage_departments ?? prof.can_manage_departments ?? false,
      manage_users: basePerms.manage_users ?? prof.can_manage_users ?? false,
      manage_ai_settings:
        basePerms.manage_ai_settings ?? prof.can_manage_ai_settings ?? false,
    };

    const viewScope = user.view_scope || prof.view_scope || "all";

    const rawAllowed =
      user.allowed_departments || prof.allowed_departments || [];
    const allowedIds = Array.isArray(rawAllowed)
      ? rawAllowed.map((d) => (typeof d === "number" ? d : Number(d.id ?? d)))
      : [];

    setEditForm({
      username: user.username,
      is_staff: user.is_staff,
      role: roleSlug,
      national_id: user.national_id || prof.national_id || "",
      is_blocked: user.is_blocked ?? prof.is_blocked ?? false,
      is_spammer: user.is_spammer ?? prof.is_spammer ?? false,
      can_read_complaints: perms.read_complaints,
      can_update_complaints: perms.update_complaints,
      can_reply_complaints: perms.reply_complaints,
      can_manage_departments: perms.manage_departments,
      can_manage_users: perms.manage_users,
      can_manage_ai_settings: perms.manage_ai_settings,
      view_scope: viewScope || "all",
      allowed_departments: allowedIds,
      // حقول كلمة السر الجديدة (اختيارية)
      password: "",
      password2: "",
    });
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleEditBool = (key) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleEditDepartment = (depId) => {
    setEditForm((prev) => {
      const exists = prev.allowed_departments.includes(depId);
      return {
        ...prev,
        allowed_departments: exists
          ? prev.allowed_departments.filter((id) => id !== depId)
          : [...prev.allowed_departments, depId],
      };
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || !editForm) return;

    showError("");
    showSuccess("");

    // فاليديشن كلمة السر الجديدة (اختيارية)
    if (editForm.password || editForm.password2) {
      if (!editForm.password || !editForm.password2) {
        showError(t("usersManagement.errors.newPasswordFillBoth"));
        return;
      }
      if (editForm.password !== editForm.password2) {
        showError(t("usersManagement.errors.newPasswordsDontMatch"));
        return;
      }
      if (editForm.password.length < 6) {
        showError(t("usersManagement.errors.newPasswordTooShort"));
        return;
      }
    }

    if (
      editForm.national_id &&
      (editForm.national_id.length !== 11 ||
        !/^\d{11}$/.test(editForm.national_id))
    ) {
      showError(t("usersManagement.errors.nationalId11IfPresent"));
      return;
    }

    const isCitizen = editForm.role === "citizen";

    const payload = {
      username: editForm.username,
      is_staff: editForm.is_staff,
      role: editForm.role,
      national_id: editForm.national_id || null,
      is_blocked: editForm.is_blocked,
      is_spammer: editForm.is_spammer,
      permissions: {
        read_complaints: editForm.can_read_complaints,
        update_complaints: editForm.can_update_complaints,
        reply_complaints: editForm.can_reply_complaints,
        manage_departments: editForm.can_manage_departments,
        manage_users: editForm.can_manage_users,
        manage_ai_settings: editForm.can_manage_ai_settings,
      },
      view_scope: isCitizen ? "all" : editForm.view_scope,
      allowed_department_ids:
        !isCitizen && editForm.view_scope === "assigned"
          ? editForm.allowed_departments.map((id) => Number(id))
          : [],
    };

    // لو تم إدخال كلمة سر جديدة أرسلها للباك إند
    if (editForm.password) {
      payload.password = editForm.password;
      payload.password2 = editForm.password2;
    }

    try {
      await api.patch(`/api/v1/users/${editing.id}/`, payload);
      showSuccess(t("usersManagement.success.userUpdated"));
      setEditing(null);
      setEditForm(null);
      await loadUsers();
    } catch (e2) {
      console.log(
        "USER UPDATE ERROR:",
        e2?.response?.status,
        e2?.response?.data,
      );
      if (e2?.response?.data) {
        const d = e2.response.data;
        if (typeof d === "string") showError(d);
        else if (d.username) showError(String(d.username));
        else if (d.profile && d.profile.national_id)
          showError(String(d.profile.national_id));
        else showError(t("usersManagement.errors.userUpdateFail"));
      } else {
        showError(t("usersManagement.errors.userUpdateFail"));
      }
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  // ===== helper for view scope label in table =====
  const viewScopeLabel = (row) => {
    const prof = row.profile || {};
    const scope = row.view_scope || prof.view_scope || "all";

    if (scope === "unassigned") {
      return t("usersManagement.viewScope.unassigned");
    }

    if (scope === "assigned") {
      const raw = row.allowed_departments || prof.allowed_departments || [];
      const arr = Array.isArray(raw) ? raw : [];
      if (!arr.length) return t("usersManagement.viewScope.assignedNoDeps");
      const labels = arr
        .map((d) => {
          if (typeof d === "number") return `#${d}`;
          if (d.name_tr && d.code) return `${d.name_tr} (${d.code})`;
          if (d.name_tr) return d.name_tr;
          if (d.code) return d.code;
          if (d.id) return `#${d.id}`;
          return "";
        })
        .filter(Boolean)
        .join(", ");
      return t("usersManagement.viewScope.assignedWithDeps", {
        deps: labels,
      });
    }

    return t("usersManagement.viewScope.all");
  };

  // ===== Filtering & search =====
  const filteredUsers = users.filter((u) => {
    const text = filterText.trim().toLowerCase();

    if (text) {
      const uname = (u.username || "").toLowerCase();
      const nid = (u.national_id ?? u.profile?.national_id ?? "")
        .toString()
        .toLowerCase();

      if (!uname.includes(text) && !nid.includes(text)) return false;
    }

    if (filterRole !== "all") {
      const roleSlug =
        (u.role || u.profile?.role || "").toString().toLowerCase() || "citizen";
      if (roleSlug !== filterRole) return false;
    }

    if (filterStaff !== "all") {
      const isStaff = !!(u.is_staff ?? u.profile?.is_staff);
      if (filterStaff === "staff" && !isStaff) return false;
      if (filterStaff === "not_staff" && isStaff) return false;
    }

    if (filterBlocked !== "all") {
      const blocked = !!(u.is_blocked ?? u.profile?.is_blocked);
      if (filterBlocked === "blocked" && !blocked) return false;
      if (filterBlocked === "not_blocked" && blocked) return false;
    }

    return true;
  });

  // ===== DataTable columns =====
  const columns = [
    {
      name: t("usersManagement.columns.id"),
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: t("usersManagement.columns.username"),
      selector: (row) => row.username,
      sortable: true,
      grow: 1.2,
      wrap: true,
    },
    {
      name: t("usersManagement.columns.role"),
      selector: (row) =>
        roleLabelFromString(
          row.role || row.profile?.role,
          row.is_staff ?? row.profile?.is_staff,
        ),
      sortable: true,
      width: "130px",
    },
    {
      name: t("usersManagement.columns.isStaff"),
      selector: (row) => (row.is_staff ? t("common.yes") : t("common.no")),
      sortable: true,
      width: "110px",
    },
    {
      name: t("usersManagement.columns.nationalId"),
      selector: (row) => row.national_id || row.profile?.national_id || "—",
      sortable: true,
      grow: 1.1,
    },
    {
      name: t("usersManagement.columns.isBlocked"),
      selector: (row) =>
        row.is_blocked || row.profile?.is_blocked
          ? t("common.yes")
          : t("common.no"),
      sortable: true,
      width: "110px",
    },
    {
      name: t("usersManagement.columns.isSpammer"),
      selector: (row) =>
        row.is_spammer || row.profile?.is_spammer
          ? t("common.yes")
          : t("common.no"),
      sortable: true,
      width: "110px",
    },
    {
      name: t("usersManagement.columns.viewScope"),
      selector: (row) => viewScopeLabel(row),
      sortable: false,
      grow: 2,
      wrap: true,
    },
    {
      name: t("usersManagement.columns.permissions"),
      cell: (row) => {
        const prof = row.profile || {};
        const p = row.permissions || {};

        const parts = [];
        if (p.read_complaints || prof.can_read_complaints)
          parts.push(t("usersManagement.perms.read"));
        if (p.update_complaints || prof.can_update_complaints)
          parts.push(t("usersManagement.perms.update"));
        if (p.reply_complaints || prof.can_reply_complaints)
          parts.push(t("usersManagement.perms.reply"));
        if (p.manage_departments || prof.can_manage_departments)
          parts.push(t("usersManagement.perms.departments"));
        if (p.manage_users || prof.can_manage_users)
          parts.push(t("usersManagement.perms.users"));
        if (p.manage_ai_settings || prof.can_manage_ai_settings)
          parts.push(t("usersManagement.perms.aiSettings"));

        return (
          <span style={{ fontSize: 12 }}>
            {parts.length ? parts.join(", ") : "—"}
          </span>
        );
      },
      grow: 2,
      wrap: true,
    },
    {
      name: t("usersManagement.columns.actions"),
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => startEdit(row)}
        >
          {t("common.edit")}
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: "120px",
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* Üst başlık */}
        <div className="page-header">
          <div>
            <h2 className="page-title">{t("usersManagement.title")}</h2>
            <p className="page-subtitle">{t("usersManagement.subtitle")}</p>
            {me && (
              <p className="page-subtitle small">
                {t("usersManagement.loggedInAs")} <strong>{me.username}</strong>{" "}
                — {t("usersManagement.roleLabel")}{" "}
                <strong>{roleLabel(me)}</strong>
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
              onClick={loadUsers}
            >
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* ===== Yeni kullanıcı formu ===== */}
        <div className="users-form-card">
          <div className="users-form-header">
            <h3 className="users-form-title">
              {t("usersManagement.newUserTitle")}
            </h3>
          </div>

          <form
            onSubmit={submitCreate}
            className="users-form-grid"
            autoComplete="off"
          >
            <div className="form-field">
              <label>{t("usersManagement.fields.username")} *</label>
              <input
                className="input"
                placeholder={t("usersManagement.placeholders.username")}
                value={createForm.username}
                onChange={(e) => updateCreateField("username", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>{t("usersManagement.fields.role")} *</label>
              <select
                className="input"
                value={createForm.role}
                onChange={(e) => {
                  const role = e.target.value;
                  updateCreateField("role", role);
                  updateCreateField(
                    "is_staff",
                    role === "citizen" ? false : true,
                  );
                }}
              >
                <option value="citizen">
                  {t("usersManagement.roles.citizen")}
                </option>
                <option value="staff">
                  {t("usersManagement.roles.staff")}
                </option>
                <option value="manager">
                  {t("usersManagement.roles.manager")}
                </option>
              </select>
            </div>

            <div className="form-field">
              <label>{t("usersManagement.fields.password")} *</label>
              <input
                className="input"
                type="password"
                placeholder={t("usersManagement.placeholders.password")}
                value={createForm.password}
                onChange={(e) => updateCreateField("password", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>{t("usersManagement.fields.passwordAgain")} *</label>
              <input
                className="input"
                type="password"
                placeholder={t("usersManagement.placeholders.passwordAgain")}
                value={createForm.password2}
                onChange={(e) => updateCreateField("password2", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>{t("usersManagement.fields.nationalId11")}</label>
              <input
                className="input"
                placeholder={t(
                  "usersManagement.placeholders.nationalIdCitizenOnly",
                )}
                value={createForm.national_id}
                maxLength={11}
                onChange={(e) =>
                  updateCreateField("national_id", e.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>{t("usersManagement.fields.isStaff")}</label>
              <label style={{ fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={createForm.is_staff}
                  onChange={() => toggleCreateBool("is_staff")}
                />{" "}
                {t("usersManagement.fields.canAccessAdmin")}
              </label>
            </div>

            {/* نطاق رؤية الشكاوي — فقط للموظفين / المديرين */}
            {createForm.role !== "citizen" && (
              <div
                className="form-field"
                style={{ gridColumn: "1 / -1", marginTop: 8 }}
              >
                <span className="field-label">
                  {t("usersManagement.fields.viewScopeTitle")}
                </span>
                <div className="users-permissions-grid">
                  <label>
                    <input
                      type="radio"
                      name="create_view_scope"
                      value="all"
                      checked={createForm.view_scope === "all"}
                      onChange={(e) =>
                        updateCreateField("view_scope", e.target.value)
                      }
                    />{" "}
                    {t("usersManagement.viewScopeOption.all")}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="create_view_scope"
                      value="assigned"
                      checked={createForm.view_scope === "assigned"}
                      onChange={(e) =>
                        updateCreateField("view_scope", e.target.value)
                      }
                    />{" "}
                    {t("usersManagement.viewScopeOption.assigned")}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="create_view_scope"
                      value="unassigned"
                      checked={createForm.view_scope === "unassigned"}
                      onChange={(e) =>
                        updateCreateField("view_scope", e.target.value)
                      }
                    />{" "}
                    {t("usersManagement.viewScopeOption.unassigned")}
                  </label>
                </div>

                {createForm.view_scope === "assigned" && (
                  <div style={{ marginTop: 8 }}>
                    <span className="field-label small">
                      {t("usersManagement.fields.viewableDepartments")}
                    </span>
                    <div className="users-permissions-grid">
                      {departments.map((d) => (
                        <label key={d.id}>
                          <input
                            type="checkbox"
                            checked={createForm.allowed_departments.includes(
                              d.id,
                            )}
                            onChange={() => toggleCreateDepartment(d.id)}
                          />{" "}
                          {d.name_tr} ({d.code})
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">
                {t("usersManagement.fields.permissionsTitle")}
              </span>
              <div className="users-permissions-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_read_complaints}
                    onChange={() => toggleCreateBool("can_read_complaints")}
                  />{" "}
                  {t("usersManagement.perms.read")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_update_complaints}
                    onChange={() => toggleCreateBool("can_update_complaints")}
                  />{" "}
                  {t("usersManagement.perms.update")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_reply_complaints}
                    onChange={() => toggleCreateBool("can_reply_complaints")}
                  />{" "}
                  {t("usersManagement.perms.reply")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_departments}
                    onChange={() => toggleCreateBool("can_manage_departments")}
                  />{" "}
                  {t("usersManagement.perms.departments")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_users}
                    onChange={() => toggleCreateBool("can_manage_users")}
                  />{" "}
                  {t("usersManagement.perms.users")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_ai_settings}
                    onChange={() => toggleCreateBool("can_manage_ai_settings")}
                  />{" "}
                  {t("usersManagement.perms.aiSettings")}
                </label>
              </div>
            </div>

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? t("common.creating") : t("common.create")}
              </button>
            </div>
          </form>
        </div>

        {/* ===== Liste + فلاتر ===== */}
        {loading ? (
          <p>{t("common.loading")}</p>
        ) : (
          <>
            <div
              style={{
                marginTop: 18,
                marginBottom: 8,
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 2.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr)",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                className="input"
                placeholder={t("usersManagement.filters.searchPlaceholder")}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <select
                className="input"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">
                  {t("usersManagement.filters.roles.all")}
                </option>
                <option value="citizen">
                  {t("usersManagement.roles.citizen")}
                </option>
                <option value="staff">
                  {t("usersManagement.roles.staff")}
                </option>
                <option value="manager">
                  {t("usersManagement.roles.manager")}
                </option>
              </select>
              <select
                className="input"
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
              >
                <option value="all">
                  {t("usersManagement.filters.staff.all")}
                </option>
                <option value="staff">
                  {t("usersManagement.filters.staff.onlyStaff")}
                </option>
                <option value="not_staff">
                  {t("usersManagement.filters.staff.onlyNonStaff")}
                </option>
              </select>
              <select
                className="input"
                value={filterBlocked}
                onChange={(e) => setFilterBlocked(e.target.value)}
              >
                <option value="all">
                  {t("usersManagement.filters.blocked.all")}
                </option>
                <option value="blocked">
                  {t("usersManagement.filters.blocked.onlyBlocked")}
                </option>
                <option value="not_blocked">
                  {t("usersManagement.filters.blocked.onlyNotBlocked")}
                </option>
              </select>
            </div>

            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <DataTable
                columns={columns}
                data={filteredUsers}
                pagination
                highlightOnHover
                dense
                noDataComponent={t("usersManagement.noUsersForFilter")}
              />
            </div>
          </>
        )}

        {/* ===== Edit form ===== */}
        {editing && editForm && (
          <div className="users-edit-card" ref={editCardRef}>
            <h3 className="users-form-title">
              {t("usersManagement.editUserTitle", {
                id: editing.id,
                username: editing.username,
              })}
            </h3>

            <form
              onSubmit={saveEdit}
              className="users-form-grid"
              autoComplete="off"
            >
              <div className="form-field">
                <label>{t("usersManagement.fields.username")}</label>
                <input
                  className="input"
                  value={editForm.username}
                  onChange={(e) => updateEditField("username", e.target.value)}
                  placeholder={t("usersManagement.placeholders.username")}
                />
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.role")}</label>
                <select
                  className="input"
                  value={editForm.role}
                  onChange={(e) => updateEditField("role", e.target.value)}
                >
                  <option value="citizen">
                    {t("usersManagement.roles.citizen")}
                  </option>
                  <option value="staff">
                    {t("usersManagement.roles.staff")}
                  </option>
                  <option value="manager">
                    {t("usersManagement.roles.manager")}
                  </option>
                </select>
              </div>

              {/* تغيير كلمة السر (اختياري) */}
              <div className="form-field">
                <label>{t("usersManagement.fields.newPasswordOptional")}</label>
                <input
                  className="input"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => updateEditField("password", e.target.value)}
                  placeholder={t(
                    "usersManagement.placeholders.newPasswordOptional",
                  )}
                />
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.newPasswordAgain")}</label>
                <input
                  className="input"
                  type="password"
                  value={editForm.password2}
                  onChange={(e) => updateEditField("password2", e.target.value)}
                  placeholder={t(
                    "usersManagement.placeholders.newPasswordAgain",
                  )}
                />
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.nationalIdOptional")}</label>
                <input
                  className="input"
                  value={editForm.national_id}
                  maxLength={11}
                  onChange={(e) =>
                    updateEditField("national_id", e.target.value)
                  }
                  placeholder={t(
                    "usersManagement.placeholders.nationalIdOptional",
                  )}
                />
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.isStaff")}</label>
                <label style={{ fontSize: "0.9rem" }}>
                  <input
                    type="checkbox"
                    checked={editForm.is_staff}
                    onChange={() => toggleEditBool("is_staff")}
                  />{" "}
                  {t("usersManagement.fields.canAccessAdmin")}
                </label>
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.isBlocked")}</label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_blocked}
                    onChange={() => toggleEditBool("is_blocked")}
                  />{" "}
                  {t("usersManagement.fields.blockLogin")}
                </label>
              </div>

              <div className="form-field">
                <label>{t("usersManagement.fields.isSpammer")}</label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_spammer}
                    onChange={() => toggleEditBool("is_spammer")}
                  />{" "}
                  {t("usersManagement.fields.spammerLabel")}
                </label>
              </div>

              {/* نطاق رؤية الشكاوي — فقط للموظفين / المديرين */}
              {editForm.role !== "citizen" && (
                <div
                  className="form-field"
                  style={{ gridColumn: "1 / -1", marginTop: 8 }}
                >
                  <span className="field-label">
                    {t("usersManagement.fields.viewScopeTitle")}
                  </span>
                  <div className="users-permissions-grid">
                    <label>
                      <input
                        type="radio"
                        name="edit_view_scope"
                        value="all"
                        checked={editForm.view_scope === "all"}
                        onChange={(e) =>
                          updateEditField("view_scope", e.target.value)
                        }
                      />{" "}
                      {t("usersManagement.viewScopeOption.all")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="edit_view_scope"
                        value="assigned"
                        checked={editForm.view_scope === "assigned"}
                        onChange={(e) =>
                          updateEditField("view_scope", e.target.value)
                        }
                      />{" "}
                      {t("usersManagement.viewScopeOption.assigned")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="edit_view_scope"
                        value="unassigned"
                        checked={editForm.view_scope === "unassigned"}
                        onChange={(e) =>
                          updateEditField("view_scope", e.target.value)
                        }
                      />{" "}
                      {t("usersManagement.viewScopeOption.unassigned")}
                    </label>
                  </div>

                  {editForm.view_scope === "assigned" && (
                    <div style={{ marginTop: 8 }}>
                      <span className="field-label small">
                        {t("usersManagement.fields.viewableDepartments")}
                      </span>
                      <div className="users-permissions-grid">
                        {departments.map((d) => (
                          <label key={d.id}>
                            <input
                              type="checkbox"
                              checked={editForm.allowed_departments.includes(
                                d.id,
                              )}
                              onChange={() => toggleEditDepartment(d.id)}
                            />{" "}
                            {d.name_tr} ({d.code})
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">
                  {t("usersManagement.fields.permissionsTitle")}
                </span>
                <div className="users-permissions-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_read_complaints}
                      onChange={() => toggleEditBool("can_read_complaints")}
                    />{" "}
                    {t("usersManagement.perms.read")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_update_complaints}
                      onChange={() => toggleEditBool("can_update_complaints")}
                    />{" "}
                    {t("usersManagement.perms.update")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_reply_complaints}
                      onChange={() => toggleEditBool("can_reply_complaints")}
                    />{" "}
                    {t("usersManagement.perms.reply")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_departments}
                      onChange={() => toggleEditBool("can_manage_departments")}
                    />{" "}
                    {t("usersManagement.perms.departments")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_users}
                      onChange={() => toggleEditBool("can_manage_users")}
                    />{" "}
                    {t("usersManagement.perms.users")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_ai_settings}
                      onChange={() => toggleEditBool("can_manage_ai_settings")}
                    />{" "}
                    {t("usersManagement.perms.aiSettings")}
                  </label>
                </div>
              </div>

              <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn btn-primary">
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cancelEdit}
                  style={{ marginLeft: 8 }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
