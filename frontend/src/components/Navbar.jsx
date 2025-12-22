// frontend/src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { clearTokens, getAccess } from "../auth";
import { useTheme } from "../hooks/useTheme";

export default function Navbar() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = getAccess();
    if (!token) {
      setLoadingMe(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await api.get("/api/v1/auth/me/");
        setMe(res.data);
      } catch (e) {
        console.log("NAVBAR ME ERROR:", e?.response?.status);
        if (e?.response?.status === 401) {
          clearTokens();
          setMe(null);
        }
      } finally {
        setLoadingMe(false);
      }
    };

    fetchMe();
  }, []);

  const handleLogout = () => {
    clearTokens();
    setMe(null);
    navigate("/");
  };

  const isStaffOrManager =
    me?.is_staff ||
    me?.profile?.role === "staff" ||
    me?.profile?.role === "manager";

  const activeClass = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <header className="top-nav">
      <div className="nav-inner">
        {/* Logo + Brand */}
        <div
          className="nav-left"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <img
            src="src/img/logo.png"
            alt="Logo"
            width="80"
            height="80"
            className="nav-logo-image"
          />
          <div className="nav-brand">
            <div className="nav-subtitle">Şikâyetlerim</div>
          </div>
        </div>

        {/* Links */}
        <nav className="nav-links">
          {me && (
            <>
              <Link to="/dashboard" className={activeClass("/dashboard")}>
                {isStaffOrManager ? "Yönetim" : "Şikâyetlerim"}
              </Link>

              <Link to="/new" className={activeClass("/new")}>
                Yeni şikâyet
              </Link>

              {isStaffOrManager && (
                <>
                  <Link
                    to="/departments"
                    className={activeClass("/departments")}
                  >
                    Birimler
                  </Link>
                  <Link to="/users" className={activeClass("/users")}>
                    Kullanıcılar
                  </Link>
                  <Link
                    to="/ai-settings"
                    className={activeClass("/ai-settings")}
                  >
                    Yapay zekâ
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="nav-right">
          {/* 🔘 سويتش الثيم يظهر دايمًا حتى لو ما في me (اختياري) */}
          <button
            type="button"
            className="btn btn-ghost nav-theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Açık tema" : "Koyu tema"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {!loadingMe && me && (
            <span className="nav-username">@{me.username}</span>
          )}

          {me && (
            <button
              type="button"
              className="btn btn-ghost nav-logout"
              onClick={handleLogout}
            >
              Çıkış
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
