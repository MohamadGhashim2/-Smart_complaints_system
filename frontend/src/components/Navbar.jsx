// frontend/src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { clearTokens, getAccess } from "../auth";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLabel = (i18n.language || "tr").slice(0, 2).toUpperCase();

  const applyDirAndLang = (lng) => {
    const dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    applyDirAndLang(lng);
    setOpen(false);
  };

  return (
    <div className="nav-lang-wrapper">
      <button
        type="button"
        className="btn btn-ghost nav-lang-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {currentLabel} ▾
      </button>

      {open && (
        <div className="nav-lang-menu">
          <button
            type="button"
            className="nav-lang-option"
            onClick={() => changeLang("tr")}
          >
            TR
          </button>
          <button
            type="button"
            className="nav-lang-option"
            onClick={() => changeLang("ar")}
          >
            AR
          </button>
          <button
            type="button"
            className="nav-lang-option"
            onClick={() => changeLang("en")}
          >
            EN
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const token = getAccess();
    if (!token) {
      setMe(null);
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
  }, [location.pathname]);

  const handleLogout = () => {
    clearTokens();
    setMe(null);
    navigate("/");
  };

  const isStaffOrManager =
    me?.is_staff ||
    me?.profile?.role === "staff" ||
    me?.profile?.role === "manager";

  const profilePerms = me?.profile || {};

  const canManageDepartments =
    me?.is_superuser || profilePerms.can_manage_departments;

  const canManageUsers = me?.is_superuser || profilePerms.can_manage_users;

  const canManageAiSettings =
    me?.is_superuser || profilePerms.can_manage_ai_settings;

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
            width="48"
            height="48"
            className="nav-logo-image"
          />
          <div className="nav-brand">
            <div className="nav-subtitle">{t("nav.title")}</div>
          </div>
        </div>

        {/* Links */}
        <nav className="nav-links">
          {me && (
            <>
              <Link to="/dashboard" className={activeClass("/dashboard")}>
                {isStaffOrManager ? t("nav.dashboard") : t("nav.title")}
              </Link>

              <Link to="/new" className={activeClass("/new")}>
                {t("nav.newComplaint")}
              </Link>

              {isStaffOrManager && (
                <>
                  {canManageDepartments && (
                    <Link
                      to="/departments"
                      className={activeClass("/departments")}
                    >
                      {t("nav.departments")}
                    </Link>
                  )}
                  {canManageUsers && (
                    <Link to="/users" className={activeClass("/users")}>
                      {t("nav.users")}
                    </Link>
                  )}
                  {canManageAiSettings && (
                    <Link
                      to="/ai-settings"
                      className={activeClass("/ai-settings")}
                    >
                      {t("nav.aiSettings")}
                    </Link>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="nav-right">
          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Theme switch */}
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
              {t("nav.logout")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
