from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"]
)


# ---------------------------------------------------------
# GET ALL ALERTS
# ---------------------------------------------------------

@router.get("/")
def get_alerts(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    alerts = (
        db.query(models.Alert)
        .order_by(models.Alert.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "count": len(alerts),
        "results": [
            {
                "id": alert.id,
                "source_ip": alert.source_ip,
                "dest_ip": alert.dest_ip,
                "protocol": alert.protocol,
                "prediction": alert.prediction,
                "risk_score": alert.risk_score,
                "risk_level": alert.risk_level,
                "status": alert.status,
                "message": alert.message,
                "created_at": alert.created_at
            }
            for alert in alerts
        ]
    }


# ---------------------------------------------------------
# GET ALERT STATISTICS
# ---------------------------------------------------------

@router.get("/stats")
def alert_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    total = db.query(
        models.Alert
    ).count()

    open_alerts = db.query(
        models.Alert
    ).filter(
        models.Alert.status == "open"
    ).count()

    investigating = db.query(
        models.Alert
    ).filter(
        models.Alert.status == "investigating"
    ).count()

    resolved = db.query(
        models.Alert
    ).filter(
        models.Alert.status == "resolved"
    ).count()

    critical = db.query(
        models.Alert
    ).filter(
        models.Alert.risk_level == "Critical"
    ).count()

    high = db.query(
        models.Alert
    ).filter(
        models.Alert.risk_level == "High"
    ).count()

    return {
        "total_alerts": total,
        "open": open_alerts,
        "investigating": investigating,
        "resolved": resolved,
        "critical": critical,
        "high": high
    }


# ---------------------------------------------------------
# UPDATE ALERT STATUS
# ---------------------------------------------------------

@router.put("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    allowed_statuses = [
        "open",
        "investigating",
        "resolved"
    ]

    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail="Status must be open, investigating or resolved"
        )

    alert = db.query(
        models.Alert
    ).filter(
        models.Alert.id == alert_id
    ).first()

    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    alert.status = status

    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert status updated",
        "alert_id": alert.id,
        "status": alert.status
    }