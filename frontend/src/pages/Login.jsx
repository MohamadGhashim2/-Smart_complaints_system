import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { getAccess, setTokens } from "../auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (getAccess()) navigate("/dashboard");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/token/", { username, password });
      setTokens(res.data);
      navigate("/dashboard");
    } catch (error) {
      console.log(
        "LOGIN ERROR:",
        error?.response?.status,
        error?.response?.data
      );
      if (error?.response?.status === 401) {
        setErr("Kullanıcı adı veya şifre hatalı.");
      } else {
        setErr("Giriş başarısız. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* küçük üst عنوان */}
        <div className="auth-hero-kicker">Akıllı Belediye</div>

        <h1 className="auth-hero-title">
          Akıllı Şikâyet <span className="auth-hero-highlight">Sistemi</span>
        </h1>

        <p className="auth-hero-text">
          Yapay zekâ destekli yönlendirme, Türkçe &amp; Arapça özetler ve
          yöneticiler, personel ve vatandaşlar için net bir kontrol paneli.
        </p>

        <div className="auth-hero-pills">
          <span className="auth-pill">
            <span className="auth-dot" />
            Yapay zekâ yönlendirme
          </span>
          <span className="auth-pill">
            <span className="auth-dot" />
            Tekrarlanan şikâyet tespiti
          </span>
          <span className="auth-pill">
            <span className="auth-dot" />
            Spam koruması
          </span>
        </div>

        <div className="auth-form-header">
          <div className="auth-form-title">Giriş yap</div>
          <div className="auth-form-caption">
            Yönetici, personel veya vatandaş hesabınızla giriş yapın.
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        <form className="form" onSubmit={handleLogin}>
          <div className="field-group">
            <label className="field-label">Kullanıcı adı</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              autoComplete="username"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Şifre</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p className="auth-meta">
          Vatandaş hesapları belediye personeli tarafından oluşturulur.
          <br />
          Yöneticiler ekstra sayfalar görür: <strong>Kullanıcılar</strong>,{" "}
          <strong>Yapay zekâ ayarları</strong> ve <strong>Birimler</strong>.
        </p>
      </div>
    </div>
  );
}
