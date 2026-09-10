from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import auth, models


router = APIRouter(prefix="/teams", tags=["Teams"])


class TeamCreate(BaseModel):
    name: str
    description: str | None = None


class TeamMemberCreate(BaseModel):
    user_id: int


def serialize(team: models.Team, db: Session) -> dict:
    members = (
        db.query(models.User)
        .join(models.TeamMember, models.TeamMember.user_id == models.User.id)
        .filter(models.TeamMember.team_id == team.id)
        .all()
    )
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "created_at": team.created_at,
        "members": [
            {"id": member.id, "name": member.name, "email": member.email, "role": member.role}
            for member in members
        ],
    }


@router.get("")
def list_teams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    teams = db.query(models.Team).order_by(models.Team.name).all()
    return {"count": len(teams), "results": [serialize(team, db) for team in teams]}


@router.post("")
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    if db.query(models.Team).filter(models.Team.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")
    team = models.Team(name=payload.name.strip(), description=payload.description)
    db.add(team)
    db.commit()
    db.refresh(team)
    auth.log_action(db, current_user.id, "team_created", f"Created team: {team.name}")
    return serialize(team, db)


@router.post("/{team_id}/members")
def add_team_member(
    team_id: int,
    payload: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"])),
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not team or not user:
        raise HTTPException(status_code=404, detail="Team or user not found")
    existing = db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == payload.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already in this team")
    db.add(models.TeamMember(team_id=team_id, user_id=payload.user_id))
    db.commit()
    auth.log_action(db, current_user.id, "team_member_added", f"Added {user.email} to {team.name}")
    return serialize(team, db)