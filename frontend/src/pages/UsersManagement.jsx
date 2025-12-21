// frontend/pages/UsersManagement.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
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
  });

  const [editing, setEditing] = useState(null); // user object
  const [editForm, setEditForm] = useState(null);

  const navigate = useNavigate();

  const loadUsers = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/users/");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("USERS LOAD ERROR:", e?.response?.status, e?.response?.data);
      if (e?.response?.status === 403) {
        setErr("Access denied. You do not have permission to manage users.");
      } else {
        setErr("Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const submitCreate = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (
      !createForm.username.trim() ||
      !createForm.password ||
      !createForm.password2
    ) {
      setErr("Please fill in username and password.");
      return;
    }

    if (createForm.password !== createForm.password2) {
      setErr("Passwords do not match.");
      return;
    }

    if (
      createForm.role === "citizen" &&
      (createForm.national_id.length !== 11 ||
        !/^\d{11}$/.test(createForm.national_id))
    ) {
      setErr("National ID for citizen must be exactly 11 digits.");
      return;
    }

    const payload = {
      username: createForm.username.trim(),
      password: createForm.password,
      role: createForm.role,
      national_id: createForm.national_id || null,
      is_staff: createForm.is_staff,
      can_read_complaints: createForm.can_read_complaints,
      can_update_complaints: createForm.can_update_complaints,
      can_reply_complaints: createForm.can_reply_complaints,
      can_manage_departments: createForm.can_manage_departments,
      can_manage_users: createForm.can_manage_users,
      can_manage_ai_settings: createForm.can_manage_ai_settings,
    };

    try {
      setCreating(true);
      await api.post("/api/v1/users/", payload);
      setOk("User created successfully.");
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
      });
      await loadUsers();
    } catch (e2) {
      console.log(
        "USER CREATE ERROR:",
        e2?.response?.status,
        e2?.response?.data
      );
      if (e2?.response?.data) {
        const d = e2.response.data;
        if (typeof d === "string") setErr(d);
        else if (d.username) setErr(String(d.username));
        else if (d.national_id) setErr(String(d.national_id));
        else setErr("Failed to create user.");
      } else {
        setErr("Failed to create user.");
      }
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (user) => {
    setEditing(user);
    setEditForm({
      username: user.username,
      is_staff: user.is_staff,
      role: user.profile?.role || "citizen",
      national_id: user.profile?.national_id || "",
      is_blocked: user.profile?.is_blocked || false,
      is_spammer: user.profile?.is_spammer || false,
      can_read_complaints: user.profile?.can_read_complaints || false,
      can_update_complaints: user.profile?.can_update_complaints || false,
      can_reply_complaints: user.profile?.can_reply_complaints || false,
      can_manage_departments: user.profile?.can_manage_departments || false,
      can_manage_users: user.profile?.can_manage_users || false,
      can_manage_ai_settings: user.profile?.can_manage_ai_settings || false,
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

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || !editForm) return;
    setErr("");
    setOk("");

    if (
      editForm.national_id &&
      (editForm.national_id.length !== 11 ||
        !/^\d{11}$/.test(editForm.national_id))
    ) {
      setErr("National ID must be 11 digits if provided.");
      return;
    }

    // ⚠️ مهم: نرسل role والحقول الأخرى في المستوى الأعلى (بدون profile{})
    const payload = {
      username: editForm.username,
      is_staff: editForm.is_staff,
      role: editForm.role,
      national_id: editForm.national_id || null,
      is_blocked: editForm.is_blocked,
      is_spammer: editForm.is_spammer,
      can_read_complaints: editForm.can_read_complaints,
      can_update_complaints: editForm.can_update_complaints,
      can_reply_complaints: editForm.can_reply_complaints,
      can_manage_departments: editForm.can_manage_departments,
      can_manage_users: editForm.can_manage_users,
      can_manage_ai_settings: editForm.can_manage_ai_settings,
    };

    try {
      await api.patch(`/api/v1/users/${editing.id}/`, payload);
      setOk("User updated successfully.");
      setEditing(null);
      setEditForm(null);
      await loadUsers();
    } catch (e2) {
      console.log(
        "USER UPDATE ERROR:",
        e2?.response?.status,
        e2?.response?.data
      );
      if (e2?.response?.data) {
        const d = e2.response.data;
        if (typeof d === "string") setErr(d);
        else if (d.username) setErr(String(d.username));
        else if (d.profile && d.profile.national_id)
          setErr(String(d.profile.national_id));
        else setErr("Failed to update user.");
      } else {
        setErr("Failed to update user.");
      }
    }
  };

  return (
    <div
      style={{ maxWidth: 1100, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Users Management</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/dashboard")}>Back</button>
          <button onClick={loadUsers}>Refresh</button>
        </div>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {ok && <p style={{ color: "green" }}>{ok}</p>}

      {/* إنشاء مستخدم جديد */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create New User</h3>
        <form
          onSubmit={submitCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <input
            placeholder="username"
            value={createForm.username}
            onChange={(e) => updateCreateField("username", e.target.value)}
          />
          <select
            value={createForm.role}
            onChange={(e) => {
              const role = e.target.value;
              updateCreateField("role", role);
              // بشكل افتراضي: citizen ليس staff، والباقي staff
              updateCreateField("is_staff", role === "citizen" ? false : true);
            }}
          >
            <option value="citizen">Citizen</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>

          <input
            type="password"
            placeholder="password"
            value={createForm.password}
            onChange={(e) => updateCreateField("password", e.target.value)}
          />
          <input
            type="password"
            placeholder="repeat password"
            value={createForm.password2}
            onChange={(e) => updateCreateField("password2", e.target.value)}
          />

          <input
            placeholder="National ID (11 digits for citizen)"
            value={createForm.national_id}
            maxLength={11}
            onChange={(e) => updateCreateField("national_id", e.target.value)}
          />

          <label>
            <input
              type="checkbox"
              checked={createForm.is_staff}
              onChange={() => toggleCreateBool("is_staff")}
            />{" "}
            Staff status
          </label>

          {/* صلاحيات */}
          <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Permissions (for staff/manager)
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 6,
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_read_complaints}
                  onChange={() => toggleCreateBool("can_read_complaints")}
                />{" "}
                Read complaints
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_update_complaints}
                  onChange={() => toggleCreateBool("can_update_complaints")}
                />{" "}
                Update complaints
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_reply_complaints}
                  onChange={() => toggleCreateBool("can_reply_complaints")}
                />{" "}
                Reply to complaints
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_manage_departments}
                  onChange={() => toggleCreateBool("can_manage_departments")}
                />{" "}
                Manage departments
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_manage_users}
                  onChange={() => toggleCreateBool("can_manage_users")}
                />{" "}
                Manage users
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.can_manage_ai_settings}
                  onChange={() => toggleCreateBool("can_manage_ai_settings")}
                />{" "}
                Manage AI settings
              </label>
            </div>
          </div>

          <button type="submit" disabled={creating} style={{ marginTop: 4 }}>
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      {/* جدول المستخدمين */}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table
            width="100%"
            cellPadding="8"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#111", color: "#fff" }}>
                <th align="left">ID</th>
                <th align="left">Username</th>
                <th align="left">Role</th>
                <th align="left">Staff</th>
                <th align="left">National ID</th>
                <th align="left">Blocked</th>
                <th align="left">Spammer</th>
                <th align="left">Permissions</th>
                <th align="left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.profile?.role || "—"}</td>
                  <td>{u.is_staff ? "Yes" : "No"}</td>
                  <td>{u.profile?.national_id || "—"}</td>
                  <td>{u.profile?.is_blocked ? "Yes" : "No"}</td>
                  <td>{u.profile?.is_spammer ? "Yes" : "No"}</td>
                  <td style={{ fontSize: 12 }}>
                    {u.profile?.can_read_complaints && "Read, "}
                    {u.profile?.can_update_complaints && "Update, "}
                    {u.profile?.can_reply_complaints && "Reply, "}
                    {u.profile?.can_manage_departments && "Departments, "}
                    {u.profile?.can_manage_users && "Users, "}
                    {u.profile?.can_manage_ai_settings && "AI"}
                  </td>
                  <td>
                    <button onClick={() => startEdit(u)}>Edit</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ color: "#666" }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* نموذج تعديل المستخدم */}
      {editing && editForm && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 14,
            marginTop: 16,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Edit User #{editing.id} ({editing.username})
          </h3>

          <form
            onSubmit={saveEdit}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <input
              value={editForm.username}
              onChange={(e) => updateEditField("username", e.target.value)}
              placeholder="username"
            />

            <select
              value={editForm.role}
              onChange={(e) => updateEditField("role", e.target.value)}
            >
              <option value="citizen">Citizen</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>

            <input
              value={editForm.national_id}
              maxLength={11}
              onChange={(e) => updateEditField("national_id", e.target.value)}
              placeholder="National ID (optional)"
            />

            <label>
              <input
                type="checkbox"
                checked={editForm.is_staff}
                onChange={() => toggleEditBool("is_staff")}
              />{" "}
              Staff status
            </label>

            <label>
              <input
                type="checkbox"
                checked={editForm.is_blocked}
                onChange={() => toggleEditBool("is_blocked")}
              />{" "}
              Blocked
            </label>

            <label>
              <input
                type="checkbox"
                checked={editForm.is_spammer}
                onChange={() => toggleEditBool("is_spammer")}
              />{" "}
              Mark as spammer
            </label>

            <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Permissions</span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_read_complaints}
                    onChange={() => toggleEditBool("can_read_complaints")}
                  />{" "}
                  Read complaints
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_update_complaints}
                    onChange={() => toggleEditBool("can_update_complaints")}
                  />{" "}
                  Update complaints
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_reply_complaints}
                    onChange={() => toggleEditBool("can_reply_complaints")}
                  />{" "}
                  Reply to complaints
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_manage_departments}
                    onChange={() => toggleEditBool("can_manage_departments")}
                  />{" "}
                  Manage departments
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_manage_users}
                    onChange={() => toggleEditBool("can_manage_users")}
                  />{" "}
                  Manage users
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.can_manage_ai_settings}
                    onChange={() => toggleEditBool("can_manage_ai_settings")}
                  />{" "}
                  Manage AI settings
                </label>
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
              <button type="submit">Save</button>{" "}
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
