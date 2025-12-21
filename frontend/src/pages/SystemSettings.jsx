// frontend/pages/SystemSettings.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setErr("");
      try {
        const res = await api.get("/api/v1/settings/");
        setSettings(res.data);
      } catch (e) {
        console.log(
          "SETTINGS LOAD ERROR:",
          e?.response?.status,
          e?.response?.data
        );
        if (e?.response?.status === 403 || e?.response?.status === 401) {
          setErr("Access denied. Only admins can view settings.");
        } else {
          setErr("Failed to load settings.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChangeBool = (key) => (e) => {
    const checked = e.target.checked;
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const onChangeNumber = (key) => (e) => {
    const val = e.target.value;
    setSettings((prev) => ({
      ...prev,
      [key]: val === "" ? "" : Number(val),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!settings) return;

    setErr("");
    setOk("");
    setSaving(true);

    try {
      const payload = {
        use_ai_summary: settings.use_ai_summary,
        use_ai_routing: settings.use_ai_routing,
        use_duplicate_detection: settings.use_duplicate_detection,
        ai_min_confidence: settings.ai_min_confidence,
        similarity_threshold: settings.similarity_threshold,
        spam_max_per_day: settings.spam_max_per_day,
        spam_max_per_hour: settings.spam_max_per_hour,
        allow_citizen_registration: settings.allow_citizen_registration,
      };

      const res = await api.patch("/api/v1/settings/", payload);
      setSettings(res.data);
      setOk("Settings saved successfully.");
    } catch (e) {
      console.log(
        "SETTINGS SAVE ERROR:",
        e?.response?.status,
        e?.response?.data
      );
      setErr("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}
      >
        <h2>System Settings</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div
        style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}
      >
        <h2>System Settings</h2>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );
  }

  return (
    <div
      style={{ maxWidth: 800, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>System Settings</h2>
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {ok && <p style={{ color: "green" }}>{ok}</p>}

      <form
        onSubmit={save}
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* AI toggles */}
        <div>
          <h3 style={{ marginTop: 0 }}>AI Features</h3>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!settings.use_ai_summary}
              onChange={onChangeBool("use_ai_summary")}
            />{" "}
            Enable AI Summary
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!settings.use_ai_routing}
              onChange={onChangeBool("use_ai_routing")}
            />{" "}
            Enable AI Department Routing
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!settings.use_duplicate_detection}
              onChange={onChangeBool("use_duplicate_detection")}
            />{" "}
            Enable Duplicate Detection
          </label>
        </div>

        {/* Thresholds */}
        <div>
          <h3 style={{ marginBottom: 8 }}>Thresholds</h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label>
                AI Min Confidence (0–1)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.ai_min_confidence}
                  onChange={onChangeNumber("ai_min_confidence")}
                  style={{ width: "100%", padding: 6, marginTop: 4 }}
                />
              </label>
            </div>
            <div>
              <label>
                Duplicate Similarity Threshold (0–1)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.similarity_threshold}
                  onChange={onChangeNumber("similarity_threshold")}
                  style={{ width: "100%", padding: 6, marginTop: 4 }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Spam rules */}
        <div>
          <h3 style={{ marginBottom: 8 }}>Spam Rules</h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label>
                Max Complaints per Day
                <input
                  type="number"
                  min="1"
                  value={settings.spam_max_per_day}
                  onChange={onChangeNumber("spam_max_per_day")}
                  style={{ width: "100%", padding: 6, marginTop: 4 }}
                />
              </label>
            </div>
            <div>
              <label>
                Max Complaints per Hour
                <input
                  type="number"
                  min="1"
                  value={settings.spam_max_per_hour}
                  onChange={onChangeNumber("spam_max_per_hour")}
                  style={{ width: "100%", padding: 6, marginTop: 4 }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Citizen registration */}
        <div>
          <h3 style={{ marginBottom: 8 }}>Citizens</h3>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!settings.allow_citizen_registration}
              onChange={onChangeBool("allow_citizen_registration")}
            />{" "}
            Allow Citizen Registration
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ padding: "10px 16px", alignSelf: "flex-start" }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
