# Frontend (React + Vite)

## Why you were seeing `You're accessing the development server over HTTPS`
Django `runserver` listens on **HTTP** by default. If the frontend calls `https://127.0.0.1:8000` (or any `https://` local backend URL), Django returns `400 Bad Request` with that message.

This frontend is now configured to avoid that by default:
- API calls use relative `/api/...` paths when `VITE_API_BASE_URL` is not set.
- If `VITE_API_BASE_URL` points to local host with `https://`, frontend auto-converts it to `http://` for Django runserver.
- Vite dev server proxies `/api` to `VITE_BACKEND_ORIGIN` (default: `http://127.0.0.1:8000`) and also auto-converts local `https://` to `http://`.

## Local development

### 1) Run backend (HTTP)
```bash
cd backend
python manage.py runserver 127.0.0.1:8000
```

### 2) Run frontend
```bash
cd frontend
npm install
npm run dev
```

Open: `http://127.0.0.1:5173`

## Optional env vars
Create `frontend/.env` if needed:

```env
# Backend target used by Vite dev proxy
VITE_BACKEND_ORIGIN=http://127.0.0.1:8000

# Optional: direct API base URL (leave empty for proxy mode)
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

> Important: use `http://` for local Django dev server unless you explicitly configure HTTPS support.


## If login still fails with HTTPS error
1. Stop frontend and backend.
2. Remove any old `frontend/.env` value that forces `https://127.0.0.1:8000`.
3. Use only:
   - `VITE_BACKEND_ORIGIN=http://127.0.0.1:8000`
4. Restart both servers and hard refresh browser (Ctrl+F5).