// frontend/pages/SystemSettings.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

// نحول كل الأرقام العربية إلى إنجليزية + الفاصلة العشرية
const normalizeDigits = (value) => {
  if (value === null || value === undefined) return "";
  let v = String(value);

  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const latinDigits = "0123456789";

  let out = "";
  for (const ch of v) {
    const idx = arabicDigits.indexOf(ch);
    if (idx !== -1) {
      out += latinDigits[idx]; // رقم عربي → إنجليزي
    } else if (ch === "٫" || ch === "،") {
      out += "."; // الفاصلة العربية → نقطة
    } else {
      out += ch;
    }
  }
  return out;
};

// نطبّق النورمالايز على القيم الرقمية القادمة من الـ API
const normalizeSettingsFromApi = (raw) => {
  if (!raw) return null;
  return {
    ...raw,
    ai_min_confidence: normalizeDigits(raw.ai_min_confidence),
    similarity_threshold: normalizeDigits(raw.similarity_threshold),
    spam_max_per_day: normalizeDigits(raw.spam_max_per_day),
    spam_max_per_hour: normalizeDigits(raw.spam_max_per_hour),
  };
};

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
        setSettings(normalizeSettingsFromApi(res.data));
      } catch (e) {
        console.log(
          "SETTINGS LOAD ERROR:",
          e?.response?.status,
          e?.response?.data
        );
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          setErr("Bu sayfaya sadece yöneticiler erişebilir.");
        } else {
          setErr("Ayarlar yüklenemedi.");
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
    // هنا نحول الدخل فورًا من ٠١٢٣… إلى 0123…
    const raw = e.target.value;
    const normalized = normalizeDigits(raw);
    setSettings((prev) => ({
      ...prev,
      [key]: normalized,
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
        ai_min_confidence: Number(
          normalizeDigits(settings.ai_min_confidence) || 0
        ),
        similarity_threshold: Number(
          normalizeDigits(settings.similarity_threshold) || 0
        ),
        spam_max_per_day: Number(
          normalizeDigits(settings.spam_max_per_day) || 0
        ),
        spam_max_per_hour: Number(
          normalizeDigits(settings.spam_max_per_hour) || 0
        ),
        allow_citizen_registration: settings.allow_citizen_registration,
      };

      const res = await api.patch("/api/v1/settings/", payload);
      // نعيد تحميلها ونطبعها من جديد بنسخة نظيفة
      setSettings(normalizeSettingsFromApi(res.data));
      setOk("Ayarlar başarıyla kaydedildi.");
    } catch (e) {
      console.log(
        "SETTINGS SAVE ERROR:",
        e?.response?.status,
        e?.response?.data
      );
      setErr("Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <h2 className="page-title">Yapay zekâ & sistem ayarları</h2>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page-shell">
        <div className="page-inner">
          <h2 className="page-title">Yapay zekâ & sistem ayarları</h2>
          {err && <div className="alert error">{err}</div>}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Geri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h2 className="page-title">Yapay zekâ &amp; sistem ayarları</h2>
            <p className="page-subtitle">
              Şikâyetlerin yönlendirilmesi, özetlenmesi ve spam filtreleme
              eşiğini buradan ayarlayın.
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Geri
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        <form onSubmit={save} className="settings-form">
          {/* AI özellikleri */}
          <section className="settings-section">
            <h3 className="settings-title">Yapay zekâ özellikleri</h3>
            <p className="settings-help">
              Şikâyet metinlerine göre özet çıkarma ve otomatik birim
              yönlendirmeyi isteğe göre açıp kapatabilirsiniz.
            </p>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_ai_summary}
                onChange={onChangeBool("use_ai_summary")}
              />
              AI özetleme özelliğini kullan
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_ai_routing}
                onChange={onChangeBool("use_ai_routing")}
              />
              Şikâyetleri otomatik olarak ilgili birime yönlendir
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.use_duplicate_detection}
                onChange={onChangeBool("use_duplicate_detection")}
              />
              Benzer şikâyetleri (duplicate) tespit et
            </label>
          </section>

          {/* Eşik değerleri */}
          <section className="settings-section">
            <h3 className="settings-title">Eşik değerleri</h3>
            <p className="settings-help">
              Yapay zekânın kararı ne kadar güçlü olduğunda dikkate alınacağını
              belirleyin.
            </p>

            <div className="settings-grid-2">
              <div className="field-group">
                <label className="field-label">AI güven eşiği (0–1)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  lang="en"
                  className="input"
                  value={settings.ai_min_confidence ?? ""}
                  onChange={onChangeNumber("ai_min_confidence")}
                />
                <p className="field-hint">
                  Örn. 0.6 → güven %60 altında ise AI birim önerisi
                  kullanılmasın.
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">
                  Duplicate benzerlik eşiği (0–1)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  lang="en"
                  className="input"
                  value={settings.similarity_threshold ?? ""}
                  onChange={onChangeNumber("similarity_threshold")}
                />
                <p className="field-hint">
                  Örn. 0.8 → benzerlik %80 üzerindeyse mükerrer kabul edilir.
                </p>
              </div>
            </div>
          </section>

          {/* Spam kuralları */}
          <section className="settings-section">
            <h3 className="settings-title">Spam kuralları</h3>
            <p className="settings-help">
              Aynı kullanıcının kısa sürede çok sayıda şikâyet göndermesini
              sınırlandırın.
            </p>

            <div className="settings-grid-2">
              <div className="field-group">
                <label className="field-label">Günlük maksimum şikâyet</label>
                <input
                  type="text"
                  inputMode="numeric"
                  lang="en"
                  className="input"
                  value={settings.spam_max_per_day ?? ""}
                  onChange={onChangeNumber("spam_max_per_day")}
                />
                <p className="field-hint">
                  Bu sınır aşıldığında kullanıcı geçici olarak spam sayılır.
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">Saatlik maksimum şikâyet</label>
                <input
                  type="text"
                  inputMode="numeric"
                  lang="en"
                  className="input"
                  value={settings.spam_max_per_hour ?? ""}
                  onChange={onChangeNumber("spam_max_per_hour")}
                />
                <p className="field-hint">
                  Çok yoğun arka arkaya şikâyetleri engellemek için.
                </p>
              </div>
            </div>
          </section>

          {/* Vatandaş kayıt ayarı */}
          <section className="settings-section">
            <h3 className="settings-title">Vatandaş hesapları</h3>
            <p className="settings-help">
              Vatandaşların kendilerinin kayıt oluşturup oluşturamayacağını
              belirleyin.
            </p>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={!!settings.allow_citizen_registration}
                onChange={onChangeBool("allow_citizen_registration")}
              />
              Vatandaşların sistem üzerinden kayıt olmasına izin ver
            </label>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Ayarları kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
