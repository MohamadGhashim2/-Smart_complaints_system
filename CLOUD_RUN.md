# Cloud Run Deployment

This project is prepared for Cloud Run as two services:

- `smart-complaints-api`: Django REST API served by Gunicorn.
- `smart-complaints-frontend`: Vite React app served by Nginx.

The backend image uses `backend/requirements-cloudrun.txt`, which skips the optional local ML packages from `requirements.txt` to keep the Cloud Run image smaller. The app still uses the OpenAI API through `OPENAI_API_KEY`.

## 1. Configure Google Cloud

Set these values for your project:

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="europe-west1"
export REPOSITORY="smart-complaints"
gcloud config set project "$PROJECT_ID"
```

Enable the required APIs:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

Create an Artifact Registry repository:

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION"
```

## 2. Create secrets

Create secrets for values that must not be committed:

```bash
printf "replace-with-a-strong-django-secret" | gcloud secrets create django-secret-key --data-file=-
printf "postgres://USER:PASSWORD@HOST:5432/DBNAME" | gcloud secrets create database-url --data-file=-
printf "replace-with-openai-key" | gcloud secrets create openai-api-key --data-file=-
```

For Cloud SQL, `DATABASE_URL` can also point at the Cloud SQL Unix socket, for example:

```text
postgres://USER:PASSWORD@/DBNAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_ID
```

When using a Cloud SQL Unix socket, add this flag to the backend deploy command and to the migration/admin job commands:

```bash
--add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_ID
```

## 3. Deploy backend

Build and push the backend image:

```bash
gcloud builds submit backend \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/backend:latest"
```

Copy `cloudrun/backend.env.yaml.example` to `cloudrun/backend.env.yaml`, then replace the placeholder hosts with your final Cloud Run domains. The real `cloudrun/*.env.yaml` files are ignored by Git.

Deploy the API:

```bash
gcloud run deploy smart-complaints-api \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/backend:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --env-vars-file cloudrun/backend.env.yaml \
  --set-secrets DJANGO_SECRET_KEY=django-secret-key:latest,DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest
```

After the first backend deploy, run migrations once:

```bash
gcloud run jobs create smart-complaints-migrate \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/backend:latest" \
  --region "$REGION" \
  --set-env-vars DJANGO_DEBUG=false,DJANGO_ALLOWED_HOSTS=.run.app,DJANGO_TRUST_X_FORWARDED_PROTO=true \
  --set-secrets DJANGO_SECRET_KEY=django-secret-key:latest,DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest \
  --command python \
  --args manage.py,migrate,--no-input

gcloud run jobs execute smart-complaints-migrate --region "$REGION" --wait
```

Optional admin creation:

```bash
printf "replace-with-strong-admin-password" | gcloud secrets create admin-password --data-file=-

gcloud run jobs create smart-complaints-ensure-admin \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/backend:latest" \
  --region "$REGION" \
  --set-env-vars DJANGO_DEBUG=false,DJANGO_ALLOWED_HOSTS=.run.app,DJANGO_TRUST_X_FORWARDED_PROTO=true,ADMIN_USERNAME=admin,ADMIN_EMAIL=admin@example.com \
  --set-secrets DJANGO_SECRET_KEY=django-secret-key:latest,DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,ADMIN_PASSWORD=admin-password:latest \
  --command python \
  --args manage.py,ensure_admin
```

## 4. Deploy frontend

Build and push the frontend image:

```bash
gcloud builds submit frontend \
  --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/frontend:latest"
```

Copy `cloudrun/frontend.env.yaml.example` to `cloudrun/frontend.env.yaml`, then set `API_BASE_URL` to the deployed backend URL:

```bash
gcloud run deploy smart-complaints-frontend \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/frontend:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --env-vars-file cloudrun/frontend.env.yaml
```

## 5. Smoke checks

Backend:

```bash
curl https://YOUR_BACKEND_HOST.run.app/api/v1/health/
```

Frontend:

```bash
curl https://YOUR_FRONTEND_HOST.run.app/healthz
```

Then update `cloudrun/backend.env.yaml` with the exact frontend and backend URLs and redeploy the backend:

```bash
gcloud run deploy smart-complaints-api \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/backend:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --env-vars-file cloudrun/backend.env.yaml \
  --set-secrets DJANGO_SECRET_KEY=django-secret-key:latest,DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest
```
