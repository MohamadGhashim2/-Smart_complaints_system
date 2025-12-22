// frontend/pages/UsersManagement.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth";
import DataTableModule from "react-data-table-component";

const DataTable = DataTableModule.default || DataTableModule;

export default function UsersManagement() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    password2: "",
    role: "citizen", // citizen / staff / manager
    national_id: "",
    is_staff: false,
    can_read_complaints: false,
    can_update_complaints: false,
    can_reply_complaints: false,
    can_manage_departments: false,
    can_manage_users: false,
    can_manage_ai_settings: false,
  });

  const [editing, setEditing] = useState(null); // current user row
  const [editForm, setEditForm] = useState(null);

  // ===== فلاتر البحث =====
  const [filterText, setFilterText] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterBlocked, setFilterBlocked] = useState("all");

  const navigate = useNavigate();

  // ===== Helpers =====
  const canManageUsers = (u) =>
    u?.is_superuser ||
    u?.permissions?.manage_users ||
    u?.profile?.can_manage_users ||
    u?.profile?.permissions?.manage_users;

  const roleLabelFromString = (role, isStaff) => {
    const r = (role || "").toString().toLowerCase();
    if (r === "manager") return "Yönetici";
    if (r === "staff") return "Personel";
    if (r === "citizen") return "Vatandaş";
    return isStaff ? "Personel" : "Vatandaş";
  };

  const roleLabel = (u) =>
    roleLabelFromString(
      u?.role || u?.profile?.role,
      u?.is_staff ?? u?.profile?.is_staff
    );

  const loadMe = async () => {
    try {
      const res = await api.get("/api/v1/auth/me/");
      setMe(res.data);
      return res.data;
    } catch (e) {
      const status = e?.response?.status;
      console.log("ME ERROR:", status, e?.response?.data);
      if (status === 401) {
        clearTokens();
        navigate("/");
      } else {
        setErr("Kullanıcı bilgileri alınamadı.");
      }
      setLoading(false);
      return null;
    }
  };

  const loadUsers = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const res = await api.get("/api/v1/users/");
      const arr = Array.isArray(res.data) ? res.data : [];
      setUsers(arr);
    } catch (e) {
      console.log("USERS LOAD ERROR:", e?.response?.status, e?.response?.data);
      const status = e?.response?.status;
      if (status === 401) {
        clearTokens();
        navigate("/");
        return;
      }
      if (status === 403) {
        setErr("Bu sayfaya erişim yetkiniz yok.");
      } else {
        setErr("Kullanıcılar yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await loadMe();
      if (!u) return;

      if (!canManageUsers(u)) {
        setErr("Bu sayfaya erişim yetkiniz yok.");
        setLoading(false);
        return;
      }

      await loadUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Create form handlers =====
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
      setErr("Lütfen kullanıcı adı ve şifre alanlarını doldurun.");
      return;
    }

    if (createForm.password !== createForm.password2) {
      setErr("Şifreler eşleşmiyor.");
      return;
    }

    if (
      createForm.role === "citizen" &&
      (createForm.national_id.length !== 11 ||
        !/^\d{11}$/.test(createForm.national_id))
    ) {
      setErr("Vatandaş için kimlik numarası 11 haneli olmalıdır.");
      return;
    }

    const payload = {
      username: createForm.username.trim(),
      password: createForm.password,
      role: createForm.role, // citizen / staff / manager
      national_id: createForm.national_id || null,
      is_staff: createForm.is_staff,
      permissions: {
        read_complaints: createForm.can_read_complaints,
        update_complaints: createForm.can_update_complaints,
        reply_complaints: createForm.can_reply_complaints,
        manage_departments: createForm.can_manage_departments,
        manage_users: createForm.can_manage_users,
        manage_ai_settings: createForm.can_manage_ai_settings,
      },
    };

    try {
      setCreating(true);
      await api.post("/api/v1/users/", payload);
      setOk("Kullanıcı başarıyla oluşturuldu.");
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
        else setErr("Kullanıcı oluşturulamadı.");
      } else {
        setErr("Kullanıcı oluşturulamadı.");
      }
    } finally {
      setCreating(false);
    }
  };

  // ===== Edit form handlers =====
  const startEdit = (user) => {
    setEditing(user);

    const roleSlug =
      (user.role || user.profile?.role || "").toString().toLowerCase() ||
      "citizen";

    // permissions قد تكون في user.permissions أو في user.profile بشكل booleans
    const basePerms = user.permissions || {};
    const prof = user.profile || {};

    const perms = {
      read_complaints:
        basePerms.read_complaints ?? prof.can_read_complaints ?? false,
      update_complaints:
        basePerms.update_complaints ?? prof.can_update_complaints ?? false,
      reply_complaints:
        basePerms.reply_complaints ?? prof.can_reply_complaints ?? false,
      manage_departments:
        basePerms.manage_departments ?? prof.can_manage_departments ?? false,
      manage_users: basePerms.manage_users ?? prof.can_manage_users ?? false,
      manage_ai_settings:
        basePerms.manage_ai_settings ?? prof.can_manage_ai_settings ?? false,
    };

    setEditForm({
      username: user.username,
      is_staff: user.is_staff,
      role: roleSlug,
      national_id: user.national_id || prof.national_id || "",
      is_blocked: user.is_blocked ?? prof.is_blocked ?? false,
      is_spammer: user.is_spammer ?? prof.is_spammer ?? false,
      can_read_complaints: perms.read_complaints,
      can_update_complaints: perms.update_complaints,
      can_reply_complaints: perms.reply_complaints,
      can_manage_departments: perms.manage_departments,
      can_manage_users: perms.manage_users,
      can_manage_ai_settings: perms.manage_ai_settings,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setErr("Kimlik numarası girildiyse 11 haneli olmalıdır.");
      return;
    }

    const payload = {
      username: editForm.username,
      is_staff: editForm.is_staff,
      role: editForm.role,
      national_id: editForm.national_id || null,
      is_blocked: editForm.is_blocked,
      is_spammer: editForm.is_spammer,
      permissions: {
        read_complaints: editForm.can_read_complaints,
        update_complaints: editForm.can_update_complaints,
        reply_complaints: editForm.can_reply_complaints,
        manage_departments: editForm.can_manage_departments,
        manage_users: editForm.can_manage_users,
        manage_ai_settings: editForm.can_manage_ai_settings,
      },
    };

    try {
      await api.patch(`/api/v1/users/${editing.id}/`, payload);
      setOk("Kullanıcı başarıyla güncellendi.");
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
        else setErr("Kullanıcı güncellenemedi.");
      } else {
        setErr("Kullanıcı güncellenemedi.");
      }
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  // ===== Filtering & search =====
  const filteredUsers = users.filter((u) => {
    const text = filterText.trim().toLowerCase();

    if (text) {
      const uname = (u.username || "").toLowerCase();
      const nid = (u.national_id ?? u.profile?.national_id ?? "")
        .toString()
        .toLowerCase();

      if (!uname.includes(text) && !nid.includes(text)) return false;
    }

    if (filterRole !== "all") {
      const roleSlug =
        (u.role || u.profile?.role || "").toString().toLowerCase() || "citizen";
      if (roleSlug !== filterRole) return false;
    }

    if (filterStaff !== "all") {
      const isStaff = !!(u.is_staff ?? u.profile?.is_staff);
      if (filterStaff === "staff" && !isStaff) return false;
      if (filterStaff === "not_staff" && isStaff) return false;
    }

    if (filterBlocked !== "all") {
      const blocked = !!(u.is_blocked ?? u.profile?.is_blocked);
      if (filterBlocked === "blocked" && !blocked) return false;
      if (filterBlocked === "not_blocked" && blocked) return false;
    }

    return true;
  });

  // ===== DataTable columns =====
  const columns = [
    { name: "ID", selector: (row) => row.id, sortable: true, width: "70px" },
    {
      name: "Kullanıcı adı",
      selector: (row) => row.username,
      sortable: true,
      grow: 1.2,
      wrap: true,
    },
    {
      name: "Rol",
      selector: (row) =>
        roleLabelFromString(
          row.role || row.profile?.role,
          row.is_staff ?? row.profile?.is_staff
        ),
      sortable: true,
      width: "130px",
    },
    {
      name: "Personel",
      selector: (row) => (row.is_staff ? "Evet" : "Hayır"),
      sortable: true,
      width: "110px",
    },
    {
      name: "Kimlik No",
      selector: (row) => row.national_id || row.profile?.national_id || "—",
      sortable: true,
      grow: 1.1,
    },
    {
      name: "Engelli",
      selector: (row) =>
        row.is_blocked || row.profile?.is_blocked ? "Evet" : "Hayır",
      sortable: true,
      width: "110px",
    },
    {
      name: "Spamcı",
      selector: (row) =>
        row.is_spammer || row.profile?.is_spammer ? "Evet" : "Hayır",
      sortable: true,
      width: "110px",
    },
    {
      name: "Yetkiler",
      cell: (row) => {
        const prof = row.profile || {};
        const p = row.permissions || {};

        const parts = [];
        if (p.read_complaints || prof.can_read_complaints) parts.push("Oku");
        if (p.update_complaints || prof.can_update_complaints)
          parts.push("Güncelle");
        if (p.reply_complaints || prof.can_reply_complaints)
          parts.push("Cevapla");
        if (p.manage_departments || prof.can_manage_departments)
          parts.push("Birimler");
        if (p.manage_users || prof.can_manage_users) parts.push("Kullanıcılar");
        if (p.manage_ai_settings || prof.can_manage_ai_settings)
          parts.push("Yapay zekâ");

        return (
          <span style={{ fontSize: 12 }}>
            {parts.length ? parts.join(", ") : "—"}
          </span>
        );
      },
      grow: 2,
      wrap: true,
    },
    {
      name: "İşlemler",
      cell: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          onClick={() => startEdit(row)}
        >
          Düzenle
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: "120px",
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-inner">
        {/* Üst başlık */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Kullanıcı Yönetimi</h2>
            <p className="page-subtitle">
              Yönetici ve belediye personeli hesaplarını, rollerini ve
              yetkilerini buradan kontrol edin.
            </p>
            {me && (
              <p className="page-subtitle small">
                Giriş yapan: <strong>{me.username}</strong> — Rol:{" "}
                <strong>{roleLabel(me)}</strong>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Geri
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={loadUsers}
            >
              Yenile
            </button>
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok && <div className="alert success">{ok}</div>}

        {/* ===== Yeni kullanıcı formu ===== */}
        <div className="users-form-card">
          <div className="users-form-header">
            <h3 className="users-form-title">Yeni kullanıcı oluştur</h3>
          </div>

          <form
            onSubmit={submitCreate}
            className="users-form-grid"
            autoComplete="off"
          >
            <div className="form-field">
              <label>Kullanıcı adı *</label>
              <input
                className="input"
                placeholder="kullanıcı adı"
                value={createForm.username}
                onChange={(e) => updateCreateField("username", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Rol *</label>
              <select
                className="input"
                value={createForm.role}
                onChange={(e) => {
                  const role = e.target.value;
                  updateCreateField("role", role);
                  updateCreateField(
                    "is_staff",
                    role === "citizen" ? false : true
                  );
                }}
              >
                <option value="citizen">Vatandaş</option>
                <option value="staff">Personel</option>
                <option value="manager">Yönetici</option>
              </select>
            </div>

            <div className="form-field">
              <label>Şifre *</label>
              <input
                className="input"
                type="password"
                placeholder="şifre"
                value={createForm.password}
                onChange={(e) => updateCreateField("password", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Şifre (tekrar) *</label>
              <input
                className="input"
                type="password"
                placeholder="şifre tekrar"
                value={createForm.password2}
                onChange={(e) => updateCreateField("password2", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Kimlik numarası (11 hane)</label>
              <input
                className="input"
                placeholder="Sadece vatandaş için zorunlu"
                value={createForm.national_id}
                maxLength={11}
                onChange={(e) =>
                  updateCreateField("national_id", e.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>Personel durumu</label>
              <label style={{ fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={createForm.is_staff}
                  onChange={() => toggleCreateBool("is_staff")}
                />{" "}
                Bu kullanıcı yönetim paneline erişebilsin
              </label>
            </div>

            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">
                Yetkiler (personel / yönetici için)
              </span>
              <div className="users-permissions-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_read_complaints}
                    onChange={() => toggleCreateBool("can_read_complaints")}
                  />{" "}
                  Şikâyetleri görüntüle
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_update_complaints}
                    onChange={() => toggleCreateBool("can_update_complaints")}
                  />{" "}
                  Şikâyetleri güncelle
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_reply_complaints}
                    onChange={() => toggleCreateBool("can_reply_complaints")}
                  />{" "}
                  Şikâyetlere cevap ver
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_departments}
                    onChange={() => toggleCreateBool("can_manage_departments")}
                  />{" "}
                  Birimleri yönet
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_users}
                    onChange={() => toggleCreateBool("can_manage_users")}
                  />{" "}
                  Kullanıcıları yönet
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.can_manage_ai_settings}
                    onChange={() => toggleCreateBool("can_manage_ai_settings")}
                  />{" "}
                  Yapay zekâ ayarlarını yönet
                </label>
              </div>
            </div>

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </div>

        {/* ===== Liste + فلاتر ===== */}
        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <>
            <div
              style={{
                marginTop: 18,
                marginBottom: 8,
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 2.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr)",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                className="input"
                placeholder="Kullanıcı adı veya kimlik no ara..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <select
                className="input"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Tüm roller</option>
                <option value="citizen">Vatandaş</option>
                <option value="staff">Personel</option>
                <option value="manager">Yönetici</option>
              </select>
              <select
                className="input"
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
              >
                <option value="all">Tümü (personel / değil)</option>
                <option value="staff">Sadece is_staff = Evet</option>
                <option value="not_staff">Sadece is_staff = Hayır</option>
              </select>
              <select
                className="input"
                value={filterBlocked}
                onChange={(e) => setFilterBlocked(e.target.value)}
              >
                <option value="all">Engel durumu: hepsi</option>
                <option value="blocked">Sadece engelli</option>
                <option value="not_blocked">Engelli olmayanlar</option>
              </select>
            </div>

            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <DataTable
                columns={columns}
                data={filteredUsers}
                pagination
                highlightOnHover
                dense
                noDataComponent="Filtrelere uyan kullanıcı bulunamadı."
              />
            </div>
          </>
        )}

        {/* ===== Edit form ===== */}
        {editing && editForm && (
          <div className="users-edit-card">
            <h3 className="users-form-title">
              Kullanıcı düzenle #{editing.id} ({editing.username})
            </h3>

            <form
              onSubmit={saveEdit}
              className="users-form-grid"
              autoComplete="off"
            >
              <div className="form-field">
                <label>Kullanıcı adı</label>
                <input
                  className="input"
                  value={editForm.username}
                  onChange={(e) => updateEditField("username", e.target.value)}
                  placeholder="kullanıcı adı"
                />
              </div>

              <div className="form-field">
                <label>Rol</label>
                <select
                  className="input"
                  value={editForm.role}
                  onChange={(e) => updateEditField("role", e.target.value)}
                >
                  <option value="citizen">Vatandaş</option>
                  <option value="staff">Personel</option>
                  <option value="manager">Yönetici</option>
                </select>
              </div>

              <div className="form-field">
                <label>Kimlik numarası (opsiyonel)</label>
                <input
                  className="input"
                  value={editForm.national_id}
                  maxLength={11}
                  onChange={(e) =>
                    updateEditField("national_id", e.target.value)
                  }
                  placeholder="11 haneli kimlik no"
                />
              </div>

              <div className="form-field">
                <label>Personel durumu</label>
                <label style={{ fontSize: "0.9rem" }}>
                  <input
                    type="checkbox"
                    checked={editForm.is_staff}
                    onChange={() => toggleEditBool("is_staff")}
                  />{" "}
                  Yönetim paneline erişebilsin
                </label>
              </div>

              <div className="form-field">
                <label>Engelli</label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_blocked}
                    onChange={() => toggleEditBool("is_blocked")}
                  />{" "}
                  Bu kullanıcının girişini engelle
                </label>
              </div>

              <div className="form-field">
                <label>Spamcı</label>
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_spammer}
                    onChange={() => toggleEditBool("is_spammer")}
                  />{" "}
                  Aşırı şikâyet / spam
                </label>
              </div>

              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Yetkiler</span>
                <div className="users-permissions-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_read_complaints}
                      onChange={() => toggleEditBool("can_read_complaints")}
                    />{" "}
                    Şikâyetleri görüntüle
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_update_complaints}
                      onChange={() => toggleEditBool("can_update_complaints")}
                    />{" "}
                    Şikâyetleri güncelle
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_reply_complaints}
                      onChange={() => toggleEditBool("can_reply_complaints")}
                    />{" "}
                    Şikâyetlere cevap ver
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_departments}
                      onChange={() => toggleEditBool("can_manage_departments")}
                    />{" "}
                    Birimleri yönet
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_users}
                      onChange={() => toggleEditBool("can_manage_users")}
                    />{" "}
                    Kullanıcıları yönet
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.can_manage_ai_settings}
                      onChange={() => toggleEditBool("can_manage_ai_settings")}
                    />{" "}
                    Yapay zekâ ayarlarını yönet
                  </label>
                </div>
              </div>

              <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn btn-primary">
                  Kaydet
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cancelEdit}
                  style={{ marginLeft: 8 }}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
