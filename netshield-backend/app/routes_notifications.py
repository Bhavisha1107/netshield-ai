from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import auth, models


router = APIRouter(prefix="/notifications", tags=["Notifications"])


def serialize(notification: models.Notification) -> dict:
    return {
        "id": notification.id,
        "alert_id": notification.alert_id,
        "title": notification.title,
        "message": notification.message,
        "severity": notification.severity,
        "is_read": bool(notification.is_read),
        "created_at": notification.created_at,
    }


@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )
    if unread_only:
        query = query.filter(models.Notification.is_read.is_(False))

    notifications = (
        query.order_by(models.Notification.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return {
        "count": len(notifications),
        "unread_count": db.query(models.Notification).filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        ).count(),
        "results": [serialize(notification) for notification in notifications],
    }


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return serialize(notification)


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    updated = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read.is_(False),
    ).update({models.Notification.is_read: True})
    db.commit()
    return {"updated": updated}