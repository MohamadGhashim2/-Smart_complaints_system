import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Departments() {
  const [me, setMe] = useState(null);
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form states
  const [form, setForm] = useState({ name_tr: "", name_ar: "", code: "" });
  const [editing, setEditing] = useState(null); // dept object or null

  const navigate = useNavigate();

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

  const loadDepartments = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/departments/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setDeps(data);
    } catch (e) {
      const status = e?.response?.status;
      console.log("DEPS ERROR:", status, e?.response?.data);
      if (status === 401) navigate("/");
      else setErr("Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await loadMe();
      // إذا مو admin، ممنوع
      if (!u?.is_staff) {
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

    if (!form.name_tr.trim() || !form.code.trim()) {
      setErr("name_tr and code are required.");
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
      } else {
        await api.post(`/api/v1/departments/`, payload);
      }
      resetForm();
      await loadDepartments();
    } catch (e2) {
      console.log("SAVE DEP ERROR:", e2?.response?.status, e2?.response?.data);
      setErr(
        e2?.response?.data
          ? JSON.stringify(e2.response.data)
          : "Failed to save department."
      );
    }
  };

  const startEdit = (d) => {
    setEditing(d);
    setForm({
      name_tr: d.name_tr || "",
      name_ar: d.name_ar || "",
      code: d.code || "",
    });
  };

  const remove = async (d) => {
    if (!confirm(`Delete "${d.name_tr}" ?`)) return;
    try {
      await api.delete(`/api/v1/departments/${d.id}/`);
      await loadDepartments();
    } catch (e) {
      console.log("DELETE ERROR:", e?.response?.status, e?.response?.data);
      setErr("Failed to delete.");
    }
  };

  // إذا مو admin
  if (!loading && me && me.role === "user") {
    return (
      <div
        style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}
      >
        <h2>Departments</h2>
        <p style={{ color: "crimson" }}>
          Access denied. This page is for Admins only.
        </p>
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );
  }

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
        <h2>Departments</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/dashboard")}>Back</button>
          <button onClick={loadDepartments}>Refresh</button>
        </div>
      </div>

      {me && (
        <p style={{ color: "#666", marginTop: -6 }}>
          Logged in as: <b>{me.username}</b> — Role:{" "}
          <b>
            {me.role === "superuser"
              ? "Superuser"
              : me.role === "admin"
              ? "Admin"
              : "Citizen"}
          </b>
        </p>
      )}

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {editing ? `Edit Department #${editing.id}` : "Add Department"}
        </h3>

        <form
          onSubmit={submit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 10,
          }}
        >
          <input
            value={form.name_tr}
            onChange={(e) => onChange("name_tr", e.target.value)}
            placeholder="name_tr (required)"
          />
          <input
            value={form.code}
            onChange={(e) => onChange("code", e.target.value)}
            placeholder="code (required) e.g. HEALTH"
          />
          <input
            value={form.name_ar}
            onChange={(e) => onChange("name_ar", e.target.value)}
            placeholder="name_ar (optional)"
          />

          <button type="submit">{editing ? "Save" : "Create"}</button>
        </form>

        {editing && (
          <button onClick={resetForm} style={{ marginTop: 10 }}>
            Cancel Edit
          </button>
        )}

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </div>

      {loading && <p>Loading...</p>}

      {!loading && deps.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table
            width="100%"
            cellPadding="10"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#111", color: "#fff" }}>
                <th align="left">ID</th>
                <th align="left">name_tr</th>
                <th align="left">code</th>
                <th align="left">name_ar</th>
                <th align="left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deps.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td>{d.id}</td>
                  <td>{d.name_tr}</td>
                  <td>
                    <b>{d.code}</b>
                  </td>
                  <td>{d.name_ar || "—"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEdit(d)}>Edit</button>
                    <button
                      onClick={() => remove(d)}
                      style={{ color: "crimson" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && deps.length === 0 && (
        <p style={{ color: "#666" }}>No departments.</p>
      )}
    </div>
  );
}
