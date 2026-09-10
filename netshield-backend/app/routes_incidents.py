from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/incidents", tags=["Incident Management"])


class IncidentCreate(BaseModel):
    notes: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[str] = None  # open | investigating | resolved
    notes: Optional[str] = None


# ---------------------------------------------------------
# CREATE INCIDENT FROM AN ALERT
# ---------------------------------------------------------

@router.post("/from-alert/{alert_id}")
def create_incident(
    alert_id: int,
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    existing = db.query(models.Incident).filter(models.Incident.alert_id == alert_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="An incident already exists for this alert")

    incident = models.Incident(
        alert_id=alert_id,
        assigned_to=current_user.id,
        status="open",
        notes=payload.notes,
    )
    db.add(incident)

    # Move the alert itself into "investigating" now that someone owns it
    alert.status = "investigating"

    db.commit()
    db.refresh(incident)

    auth.log_action(
        db, current_user.id, "incident_created",
        f"Incident #{incident.id} opened for alert #{alert_id}",
    )

    return _serialize(incident, db)


# ---------------------------------------------------------
# LIST INCIDENTS
# ---------------------------------------------------------

@router.get("")
def list_incidents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    incidents = db.query(models.Incident).order_by(models.Incident.id.desc()).all()
    return {"count": len(incidents), "results": [_serialize(i, db) for i in incidents]}


# ---------------------------------------------------------
# UPDATE INCIDENT (status / notes)
# ---------------------------------------------------------

@router.put("/{incident_id}")
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if payload.status:
        if payload.status not in ["open", "investigating", "resolved"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        incident.status = payload.status
        if payload.status == "resolved":
            incident.resolved_at = datetime.now(timezone.utc)
            # Resolving the incident also resolves the underlying alert
            alert = db.query(models.Alert).filter(models.Alert.id == incident.alert_id).first()
            if alert:
                alert.status = "resolved"

    if payload.notes is not None:
        incident.notes = payload.notes

    db.commit()
    db.refresh(incident)

    auth.log_action(
        db, current_user.id, "incident_updated",
        f"Incident #{incident.id} -> {incident.status}",
    )

    return _serialize(incident, db)


def _serialize(incident: models.Incident, db: Session) -> dict:
    assignee = db.query(models.User).filter(models.User.id == incident.assigned_to).first()
    return {
        "id": incident.id,
        "alert_id": incident.alert_id,
        "assigned_to": assignee.name if assignee else None,
        "status": incident.status,
        "notes": incident.notes,
        "resolved_at": incident.resolved_at,
    }
