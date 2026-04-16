#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_STARTUP:-false}" = "true" ]; then
  python manage.py migrate --no-input
  python manage.py ensure_admin
fi

exec gunicorn core.wsgi:application \
  --bind "0.0.0.0:${PORT:-8080}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"
