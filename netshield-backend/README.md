# NetShield AI — Backend (FastAPI)

Covers Milestone 1, Days 4–8: project setup, auth + RBAC, audit logging, and traffic ingestion.

## 1. Prerequisites
- Python 3.10+
- Docker Desktop (for Postgres + MongoDB)

## 2. Start the databases
```bash
docker compose up -d
```
This starts Postgres on `localhost:5432` and MongoDB on `localhost:27017`.

## 3. Set up the Python environment
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` if you changed any Docker Compose credentials. The `POSTGRES_URL` should match:
```
postgresql://netshield_user:netshield_pass@localhost:5432/netshield
```

## 5. Run the API
```bash
uvicorn main:app --reload
```
Visit **http://localhost:8000/docs** — this is FastAPI's auto-generated Swagger UI. You can test every endpoint here without Postman.

## 6. Test the auth flow
1. `POST /auth/signup` — create your first user (this one auto-becomes `admin`)
2. `POST /auth/login` — get back a JWT `access_token`
3. Click "Authorize" in `/docs`, paste the token, then call `GET /auth/me` — should return your user

## 7. Load dataset traffic (Day 7–8)
1. Download CICIDS2017 or UNSW-NB15, place a cleaned CSV in `data/`
2. Run:
```bash
python scripts/ingest_traffic.py --file data/cicids2017_clean.csv --batch-size 50 --delay 1 --max-rows 2000
```
3. Call `GET /traffic/recent` and `GET /traffic/stats` in `/docs` (needs your auth token) to confirm data landed.

## Project structure
```
netshield-backend/
├── main.py                 # App entrypoint, mounts routers, CORS
├── app/
│   ├── database.py         # Postgres + Mongo connections
│   ├── models.py           # SQLAlchemy tables: users, audit_logs, alerts, incidents
│   ├── schemas.py          # Pydantic request/response models
│   ├── auth.py             # Password hashing, JWT, role-based dependency
│   ├── routes_auth.py      # /auth/* and /users/* endpoints
│   └── routes_traffic.py   # /traffic/* endpoints
├── scripts/
│   └── ingest_traffic.py   # Loads dataset CSV into MongoDB as simulated traffic
├── docker-compose.yml       # Postgres + MongoDB for local dev
├── requirements.txt
└── .env.example
```

## What this satisfies (Milestone 1 evaluation criteria)
- ✅ Project initialization and architecture setup
- ✅ Authentication and network monitoring workflows (JWT + RBAC + audit log)
- ✅ Dataset integration and preprocessing (ingestion script)
- ✅ Traffic data available via API for the frontend dashboard (`/traffic/recent`, `/traffic/stats`)

## Milestone 4 validation and deployment

Run the backend smoke tests with the development dependencies:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest tests -q
```

Build the frontend production bundle:

```powershell
cd ..\netshield-frontend
npm ci
npm run build
```

For a complete container deployment, copy `.env.prod.example` to `.env.prod`, replace the placeholder secrets, and run:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for health checks, logs, and shutdown commands.
