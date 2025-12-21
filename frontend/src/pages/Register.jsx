// frontend/pages/Register.jsx
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!username.trim() || !password || !password2 || !nationalId) {
      setErr("Lütfen tüm alanları doldurun.");
      return;
    }

    if (password !== password2) {
      setErr("Şifreler eşleşmiyor.");
      return;
    }

    if (nationalId.length !== 11 || !/^\d{11}$/.test(nationalId)) {
      setErr("TC kimlik numarası 11 haneli olmalıdır.");
      return;
    }

    const payload = {
      username: username.trim(),
      password,
      password2,
      national_id: nationalId,
    };

    try {
      setLoading(true);
      const res = await api.post("/api/v1/auth/register/", payload);
      console.log("REGISTER RESPONSE:", res.data);
      setOk("Kayıt başarılı. Şimdi giriş yapabilirsiniz.");
      // بعد ثانية تقريباً نرجّع المستخدم لصفحة الدخول
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      console.log(
        "REGISTER ERROR:",
        error?.response?.status,
        error?.response?.data
      );
      if (error?.response?.data) {
        const d = error.response.data;
        if (typeof d === "string") setErr(d);
        else if (d.detail) setErr(String(d.detail));
        else if (d.non_field_errors) setErr(String(d.non_field_errors));
        else if (d.username) setErr(String(d.username));
        else if (d.national_id) setErr(String(d.national_id));
        else setErr("Kayıt başarısız. Lütfen tekrar deneyin.");
      } else {
        setErr("Kayıt başarısız. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero-kicker">Akıllı Belediye</div>

        <h1 className="auth-hero-title">
          Vatandaş <span className="auth-hero-highlight">Kaydı</span>
        </h1>

        <p className="auth-hero-text">
          Türk vatandaşları için çevrim içi şikâyet başvurusu. Lütfen geçerli
          bir kullanıcı adı ve 11 haneli TC kimlik numarası girin.
        </p>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Kullanıcı adı</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <div className="field-group">
            <label className="field-label">TC kimlik numarası</label>
            <input
              className="input"
              maxLength={11}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="11 haneli kimlik numarası"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Şifre</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre belirleyin"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Şifre (tekrar)</label>
            <input
              className="input"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Şifreyi tekrar yazın"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Kayıt yapılıyor..." : "Kayıt ol"}
          </button>
        </form>

        <p className="auth-meta-small">
          Zaten hesabınız var mı?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/")}
          >
            Giriş yap
          </button>
        </p>
      </div>
    </div>
  );
}
