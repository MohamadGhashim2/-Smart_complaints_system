FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-cloudrun.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SECRET_KEY=build-only-secret \
    DJANGO_DEBUG=false \
    DJANGO_ALLOWED_HOSTS=.run.app,localhost,127.0.0.1

RUN python manage.py collectstatic --no-input \
    && chmod +x ./cloudrun-start.sh

EXPOSE 8080

CMD ["./cloudrun-start.sh"]
