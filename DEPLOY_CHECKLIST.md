# Smart Complaints API - Deploy Checklist

## 1) Security first

- [ ] Rotate `OPENAI_API_KEY` and create a new key (never commit keys).
- [ ] Set `DJANGO_SECRET_KEY` to a strong random value.
- [ ] Set `DJANGO_DEBUG=false` in production.
- [ ] Set strict `DJANGO_ALLOWED_HOSTS`.
- [ ] Set `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to exact frontend domains.

## 2) Database & migrations

- [ ] Provision PostgreSQL.
- [ ] Set `DATABASE_URL`.
- [ ] Run migrations:

```bash
python manage.py migrate
```

## 3) Static files

- [ ] Run collectstatic:

```bash
python manage.py collectstatic --no-input
```

## 4) Smoke checks

- [ ] Health check endpoint:

```bash
GET /api/v1/health/
```

- [ ] Auth endpoint:

```bash
POST /api/auth/token/
```

- [ ] Complaint creation endpoint is rate limited and authenticated:

```bash
POST /api/v1/complaints/
```

## 5) Observability

- [ ] Confirm admin actions are logged in `AuditLog`.
- [ ] Confirm app logs are collected by hosting provider.

## 6) CI / quality gates

- [ ] GitHub Actions pipeline passes:
  - `ruff check .`
  - `bandit -q -r .`
  - `python -m compileall .`
  - `python manage.py check`

## 7) Render deployment

- [ ] Push to GitHub.
- [ ] Create Render Blueprint from `render.yaml`.
- [ ] Verify `build.sh` executed successfully.
- [ ] Open API docs (`/api/docs/`) and health endpoint (`/api/v1/health/`).

## 8) Cloud Run deployment

- [ ] Build and deploy `backend/Dockerfile`.
- [ ] Store `DJANGO_SECRET_KEY`, `DATABASE_URL`, and `OPENAI_API_KEY` in Secret Manager.
- [ ] Run database migrations with a Cloud Run Job.
- [ ] Build and deploy `frontend/Dockerfile`.
- [ ] Set frontend `API_BASE_URL` to the backend Cloud Run URL.
- [ ] Set backend `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and `DJANGO_ALLOWED_HOSTS` to exact Cloud Run domains.
- [ ] Verify `/api/v1/health/` and `/healthz`.
