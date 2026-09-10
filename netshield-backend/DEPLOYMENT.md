# NetShield AI Deployment

## Local validation

Start the databases for local development:

```powershell
docker compose up -d
```

Run backend smoke tests:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest tests -q
```

Build the frontend:

```powershell
cd ..\netshield-frontend
npm ci
npm run build
```

## Production Compose deployment

1. Copy the production environment template and replace every placeholder secret:

```powershell
cd ..\netshield-backend
Copy-Item .env.prod.example .env.prod
notepad .env.prod
```

For local demonstration, the template matches the existing Docker database volume. For production, replace `SECRET_KEY` and `POSTGRES_PASSWORD` with long, unique values. Do not commit `.env.prod`.

2. Build and start the complete stack:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

For an existing local database initialized with the Compose defaults, use `.env` instead:

```powershell
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

This starts PostgreSQL, MongoDB, FastAPI, and the Next.js production server.

3. Verify services:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
Invoke-WebRequest http://localhost:8000/health
```

Open the frontend at `http://localhost:3000` or `http://localhost:3001` when port 3000 is already in use.

The Compose stack includes healthchecks for PostgreSQL, MongoDB, FastAPI, and Next.js. The frontend waits for the backend healthcheck before starting.

The automated tests validate service health, model metrics availability, and the model/scaler feature contract. Run a full latency benchmark on the target host before high-volume production use; model inference time depends on CPU resources and the serialized model.

## Operations

View logs:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend frontend
```

Stop the stack without deleting data:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

Back up database volumes before destructive maintenance. The production Compose file uses persistent named volumes for PostgreSQL and MongoDB.

## VPS deployment from GitHub

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-vps.yml`. It deploys automatically after pushes to `main`, and it can also be started manually from the Actions tab.

Prepare an Ubuntu VPS with Docker Engine, Docker Compose, Git, and an SSH account that can run Docker. Clone the repository on the server, then create `netshield-backend/.env.prod` from `.env.prod.example` and replace the placeholder values. Set `NEXT_PUBLIC_API_URL` to the public backend URL and `FRONTEND_ORIGINS` to the public frontend URL.

Add these GitHub repository secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | VPS hostname or IP address |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_PATH` | Absolute path of the cloned repository, such as `/opt/netshield-ai` |
| `DEPLOY_SSH_KEY` | Private SSH key for the deployment account |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan -H <your-vps-host>` |

The workflow updates the server to `origin/main`, rebuilds the containers, and starts the stack with the server-side `.env.prod`. Open the frontend on the configured `FRONTEND_PORT` after the first successful run.

## Render deployment

The repository also includes `render.yaml` for a Render Blueprint. In the Render dashboard, choose **New > Blueprint**, connect this GitHub repository, and apply the blueprint. It creates the backend, frontend, and PostgreSQL services.

Before the backend service can become healthy, provide a MongoDB Atlas connection string when Render asks for the secret `MONGO_URL`. MongoDB is required for traffic logs and is not created by the Blueprint. After deployment, verify that `NEXT_PUBLIC_API_URL` points to the backend's Render URL and that `FRONTEND_ORIGINS` exactly matches the frontend's Render URL. Free web services may sleep when idle, and database availability depends on the current Render plan.

## Current deployment boundary

The application is containerized for a local or server deployment. HTTPS termination, DNS, firewall rules, managed database backups, and cloud secrets must be configured by the target hosting environment.
