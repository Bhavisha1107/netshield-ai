
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, auth


router = APIRouter(
    prefix="/reports",
    tags=["Threat Intelligence Reports"]
)


# =========================================================
# THREAT INTELLIGENCE SUMMARY REPORT
# =========================================================

@router.get("/threat-intelligence")
def get_threat_intelligence(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    # -----------------------------------------------------
    # ALERT COUNTS
    # -----------------------------------------------------

    total_alerts = db.query(models.Alert).count()

    critical_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.risk_level == "Critical")
        .count()
    )

    high_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.risk_level == "High")
        .count()
    )

    resolved_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.status == "resolved")
        .count()
    )


    # -----------------------------------------------------
    # 1. SEVERITY DISTRIBUTION
    # -----------------------------------------------------

    severity_distribution = []

    severity_levels = [
        "Critical",
        "High",
        "Medium",
        "Low"
    ]

    for level in severity_levels:

        count = (
            db.query(models.Alert)
            .filter(models.Alert.risk_level == level)
            .count()
        )

        severity_distribution.append({
            "severity": level,
            "count": count
        })


    # -----------------------------------------------------
    # 2. TOP ATTACKING IPs
    # -----------------------------------------------------

    top_attacking_ips = (
        db.query(
            models.Alert.source_ip,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.source_ip)
        .order_by(func.count(models.Alert.id).desc())
        .limit(5)
        .all()
    )

    top_ips = [
        {
            "source_ip": ip,
            "count": count
        }
        for ip, count in top_attacking_ips
    ]


    # -----------------------------------------------------
    # 3. ALERT STATUS DISTRIBUTION
    # -----------------------------------------------------

    status_distribution = []

    status_levels = [
        "open",
        "investigating",
        "resolved"
    ]

    for status in status_levels:

        count = (
            db.query(models.Alert)
            .filter(models.Alert.status == status)
            .count()
        )

        status_distribution.append({
            "status": status.capitalize(),
            "count": count
        })


    # -----------------------------------------------------
    # 4. RISK SCORE DISTRIBUTION
    # -----------------------------------------------------

    alerts = db.query(models.Alert).all()

    risk_scores = [
        alert.risk_score
        for alert in alerts
        if alert.risk_score is not None
    ]

    average_risk_score = (
        round(sum(risk_scores) / len(risk_scores), 2)
        if risk_scores
        else 0
    )

    maximum_risk_score = (
        max(risk_scores)
        if risk_scores
        else 0
    )

    risk_score_distribution = [
        {
            "range": "0-25",
            "count": len([
                score for score in risk_scores
                if 0 <= score <= 25
            ])
        },
        {
            "range": "26-50",
            "count": len([
                score for score in risk_scores
                if 26 <= score <= 50
            ])
        },
        {
            "range": "51-75",
            "count": len([
                score for score in risk_scores
                if 51 <= score <= 75
            ])
        },
        {
            "range": "76-100",
            "count": len([
                score for score in risk_scores
                if 76 <= score <= 100
            ])
        }
    ]


    # -----------------------------------------------------
    # 5. ATTACK / PREDICTION DISTRIBUTION
    # -----------------------------------------------------

    prediction_data = (
        db.query(
            models.Alert.prediction,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.prediction)
        .all()
    )

    attack_distribution = [
        {
            "category": prediction or "Unknown",
            "count": count
        }
        for prediction, count in prediction_data
    ]


    # -----------------------------------------------------
    # 6. PROTOCOL-WISE ATTACK ANALYSIS
    # -----------------------------------------------------

    protocol_data = (
        db.query(
            models.Alert.protocol,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.protocol)
        .order_by(func.count(models.Alert.id).desc())
        .all()
    )

    protocol_distribution = [
        {
            "protocol": protocol or "Unknown",
            "count": count
        }
        for protocol, count in protocol_data
    ]


    # -----------------------------------------------------
    # SECURITY RECOMMENDATION
    # -----------------------------------------------------

    if critical_alerts > 0:

        recommendation = (
            "Critical threats detected. Immediately investigate "
            "high-risk source IP addresses and isolate affected systems."
        )

    elif high_alerts > 0:

        recommendation = (
            "High-risk threats detected. Review suspicious traffic "
            "and investigate affected network systems."
        )

    elif total_alerts > 0:

        recommendation = (
            "Continue monitoring network traffic and review "
            "unresolved security alerts."
        )

    else:

        recommendation = (
            "No major threats detected. Continue regular "
            "network monitoring."
        )


    # -----------------------------------------------------
    # FINAL REPORT
    # -----------------------------------------------------

    return {
        "report_title": "NetShield AI Threat Intelligence Report",

        "summary": {
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "high_alerts": high_alerts,
            "resolved_alerts": resolved_alerts
        },

        "risk_analysis": {
            "average_risk_score": average_risk_score,
            "maximum_risk_score": maximum_risk_score
        },

        # Visualization 1
        "severity_distribution": severity_distribution,

        # Visualization 2
        "top_attacking_ips": top_ips,

        # Visualization 3
        "status_distribution": status_distribution,

        # Visualization 4
        "risk_score_distribution": risk_score_distribution,

        # Visualization 5
        "attack_distribution": attack_distribution,

        # Visualization 6
        "protocol_distribution": protocol_distribution,

        "recommendation": recommendation
    }

