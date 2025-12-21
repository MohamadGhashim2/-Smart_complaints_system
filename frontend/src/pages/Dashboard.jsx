import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";

export default function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
    } catch (e) {
      console.log("ME ERROR:", e?.response?.status, e?.response?.data);
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
      setErr("Failed to load complaints.");
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

  const roleLabel = me?.profile?.role
    ? me.profile.role.charAt(0).toUpperCase() + me.profile.role.slice(1)
    : me?.is_superuser
    ? "Superuser"
    : me?.is_staff
    ? "Staff"
    : "Citizen";

  const canManageDepartments =
    me?.is_superuser || me?.profile?.can_manage_departments;
  const canManageUsers = me?.is_superuser || me?.profile?.can_manage_users;
  const canManageAISettings =
    me?.is_superuser || me?.profile?.can_manage_ai_settings;

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
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          {me && (
            <p style={{ color: "#666", marginTop: 6 }}>
              Logged in as: <b>{me.username}</b> — Role: <b>{roleLabel}</b>
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {canManageDepartments && (
              <button onClick={() => navigate("/departments")}>
                Manage Departments
              </button>
            )}
            {canManageAISettings && (
              <button onClick={() => navigate("/settings")}>
                System Settings
              </button>
            )}
            {canManageUsers && (
              <button onClick={() => navigate("/users")}>Manage Users</button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/new")}>New Complaint</button>
          <button onClick={loadComplaints}>Refresh</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!loading && !err && complaints.length === 0 && (
        <p style={{ color: "#666" }}>No complaints to show.</p>
      )}

      {complaints.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table
            width="100%"
            cellPadding="10"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#111", color: "#fff" }}>
                <th align="left">ID</th>
                <th align="left">Created</th>
                <th align="left">Status</th>
                <th align="left">Department</th>
                <th align="left">Confidence</th>
                <th align="left">Source</th>
                <th align="left">Summary</th>
                <th align="left">Text</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td>{c.id}</td>
                  <td>
                    {c.created_at
                      ? new Date(c.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td>{c.status ?? "-"}</td>
                  <td>
                    {c.department
                      ? `${c.department.name_tr} (${c.department.code})`
                      : "—"}
                  </td>
                  <td>
                    {typeof c.confidence === "number"
                      ? c.confidence.toFixed(3)
                      : "—"}
                  </td>
                  <td>
                    {c.duplicate_index > 0
                      ? `مكرر ${c.duplicate_index}`
                      : c.used_ai
                      ? "AI"
                      : "Manual"}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {c.summary
                      ? c.summary.length > 120
                        ? c.summary.slice(0, 120) + "…"
                        : c.summary
                      : "—"}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    {c.text?.length > 120 ? c.text.slice(0, 120) + "…" : c.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
