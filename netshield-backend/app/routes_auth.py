from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


@router.post("/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # First-ever user is always forced to admin (safety net so the system
    # never ends up with zero admins). Everyone after that gets their chosen role.
    is_first_user = db.query(models.User).count() == 0
    chosen_role = "admin" if is_first_user else payload.role

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        role=chosen_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    auth.log_action(db, user.id, "signup", f"New user registered: {user.email}")
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    auth.log_action(db, user.id, "login", f"User logged in: {user.email}")
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ---------- Admin-only user management ----------

@users_router.get("", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    return db.query(models.User).all()


@users_router.post("/{user_id}/role", response_model=schemas.UserOut)
def update_role(
    user_id: int,
    payload: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target.role
    target.role = payload.role
    db.commit()
    db.refresh(target)
    auth.log_action(
        db, current_user.id, "role_change",
        f"Changed {target.email} role from {old_role} to {target.role}",
    )
    return target


# ---------- Admin-only audit log access ----------

audit_router = APIRouter(prefix="/audit-logs", tags=["audit"])


@audit_router.get("", response_model=list[schemas.AuditLogOut])
def list_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    results = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        results.append(
            schemas.AuditLogOut(
                id=log.id,
                user_id=log.user_id,
                user_email=user.email if user else None,
                action=log.action,
                details=log.details,
                timestamp=log.timestamp,
            )
        )
    return results
