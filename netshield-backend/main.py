from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.database import Base, engine, ensure_compatibility_columns
from app import models
from app.routes_auth import router as auth_router, users_router, audit_router
from app.routes_traffic import router as traffic_router
from app.routes_prediction import router as prediction_router
from app.routes_alerts import router as alerts_router
from app.routes_reports import router as reports_router
from app.routes_incidents import router as incidents_router
from app.routes_notifications import router as notifications_router
from app.routes_teams import router as teams_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_compatibility_columns()
    yield


app = FastAPI(title="NetShield AI API", version="0.1.0", lifespan=lifespan)

# Allow the Next.js frontend (localhost:3000) to call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://localhost:3001",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(audit_router)
app.include_router(traffic_router)
app.include_router(prediction_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(incidents_router)
app.include_router(notifications_router)
app.include_router(teams_router)
@app.get("/health")
def health():
    return {"status": "ok"}
