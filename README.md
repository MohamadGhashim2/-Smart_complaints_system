# Bulut Tabanlı Akıllı Şikâyet Yönetim Sistemi

Kullanıcılar şikâyetlerini metin olarak yazar; sistem otomatik olarak şikâyeti analiz eder, ilgili kurumu belirler, özet çıkarır ve tekrarları tespit eder.

## Production Readiness Checklist

- Secrets/DB bilgileri artık environment variable üzerinden yönetilmelidir.
- `DEBUG=false` ile çalıştırılmalıdır.
- `DATABASE_URL` (Render PostgreSQL) kullanılması önerilir.
- Static dosyalar `collectstatic` + WhiteNoise ile servis edilir.
- API contract: versioned routes (`/api/v1/...`) + unified error schema.
- Sensitive endpoints use throttling (login/register/complaint-create).
- Administrative changes are tracked in `AuditLog`.
- CI pipeline runs lint + security scan + Django checks on push/PR.

## Live Demo (Render) - Quick Start

Bu repo, `render.yaml` ve `backend/build.sh` ile Render için hazır hale getirilmiştir:

1. Repoyu GitHub'a push edin.
2. Render'da **Blueprint** ile `render.yaml` import edin.
3. Environment Variables değerlerini (özellikle frontend domain) güncelleyin:
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
4. Deploy tamamlandıktan sonra API canlı olur.
5. `DEPLOY_CHECKLIST.md` dosyasını adım adım uygulayın.

Backend servis komutu:

```bash
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

## Local Run (Windows) - Quick Fix

`manage.py` dosyası `backend/` klasöründedir. Bu yüzden komutlar backend içinden çalıştırılmalıdır:

```powershell
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Eğer `ModuleNotFoundError: No module named 'dj_database_url'` hatası alırsanız:

```powershell
python -m pip install dj-database-url
```

Önerilen Python sürümü: **3.11** (3.14 ile bazı paketlerde uyumsuzluk çıkabilir).

> Note: For local development, set `DJANGO_DEBUG=true` in your `.env` to disable production HTTPS redirects on `runserver`.