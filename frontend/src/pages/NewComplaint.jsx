import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function NewComplaint() {
  const [text, setText] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // جلب الجهات + إعدادات النظام
    (async () => {
      try {
        const [depsRes, settingsRes] = await Promise.all([
          api.get("/api/v1/departments/"),
          api.get("/api/v1/settings/"),
        ]);

        const deps = Array.isArray(depsRes.data)
          ? depsRes.data
          : depsRes.data?.results || [];
        setDepartments(deps);
        setSettings(settingsRes.data);
      } catch (error) {
        console.log(
          "INIT ERROR:",
          error?.response?.status,
          error?.response?.data
        );
        setErr("Failed to load data.");
      }
    })();
  }, []);

  const aiRoutingEnabled =
    settings && typeof settings.use_ai_routing === "boolean"
      ? settings.use_ai_routing
      : true; // الافتراضي: شغّال لو ما قدر يجيب الإعدادات

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const clean = text.trim();
    if (!clean) {
      setErr("Please write the complaint text.");
      return;
    }

    // لو AI routing مطفي → لازم يختار قسم
    if (!aiRoutingEnabled && !departmentId) {
      setErr("Please select a department (AI routing is disabled).");
      return;
    }

    const payload = { text: clean };
    if (departmentId) payload.department_id = Number(departmentId);

    try {
      setLoading(true);
      const res = await api.post("/api/v1/complaints/", payload);
      console.log("Created:", res.data);
      navigate("/dashboard");
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      console.log("CREATE COMPLAINT ERROR:", status, data);

      if (status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/");
        return;
      }

      if (data && typeof data === "object") {
        // لو رجع ValidationError من الباك
        if (data.detail) setErr(String(data.detail));
        else if (data.department_id) setErr(String(data.department_id));
        else setErr("Failed to create complaint.");
      } else {
        setErr("Failed to create complaint.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <h2>New Complaint</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label>Complaint Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write your complaint..."
          style={{ width: "100%", padding: 10 }}
        />

        <label>
          Department {aiRoutingEnabled ? "(optional)" : "(required)"}
        </label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        >
          {aiRoutingEnabled ? (
            <option value="">— Auto (AI will assign) —</option>
          ) : (
            <option value="">— Select department —</option>
          )}
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_tr} ({d.code})
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 14px" }}
          >
            {loading ? "Sending..." : "Submit"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{ padding: "10px 14px" }}
          >
            Back
          </button>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </form>

      <p style={{ color: "#666", marginTop: 10 }}>
        {aiRoutingEnabled
          ? "If you don’t pick a department, AI will try to classify it automatically."
          : "AI routing is disabled. You must choose the department manually."}
      </p>
    </div>
  );
}
