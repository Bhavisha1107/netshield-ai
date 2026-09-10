from fastapi import APIRouter, Depends
from app.database import traffic_collection
from app import models, auth

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("/recent")
def recent_traffic(
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return the most recent traffic records."""

    docs = list(
        traffic_collection.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(limit)
    )

    return {
        "count": len(docs),
        "results": docs
    }


@router.get("/stats")
def traffic_stats(
    current_user: models.User = Depends(auth.get_current_user)
):
    """Return live traffic and AI threat statistics."""

    # ---------------------------------------------------------
    # 1. TOTAL TRAFFIC
    # ---------------------------------------------------------

    total = traffic_collection.count_documents({})

    # ---------------------------------------------------------
    # 2. AI PREDICTIONS
    # ---------------------------------------------------------

    attacks = traffic_collection.count_documents({
        "prediction": "Attack"
    })

    normal = traffic_collection.count_documents({
        "prediction": "Normal"
    })

    # ---------------------------------------------------------
    # 3. ATTACK PERCENTAGE
    # ---------------------------------------------------------

    attack_percent = round(
        (attacks / total) * 100,
        2
    ) if total else 0

    normal_percent = round(
        (normal / total) * 100,
        2
    ) if total else 0

    # ---------------------------------------------------------
    # 4. HIGH + CRITICAL ALERTS
    # ---------------------------------------------------------

    high_critical = traffic_collection.count_documents({
        "severity": {
            "$in": ["High", "Critical"]
        }
    })

    # ---------------------------------------------------------
    # 5. RISK SCORE STATISTICS
    # ---------------------------------------------------------

    risk_pipeline = [
        {
            "$match": {
                "risk_score": {
                    "$exists": True,
                    "$ne": None
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "average_risk": {
                    "$avg": "$risk_score"
                },
                "maximum_risk": {
                    "$max": "$risk_score"
                }
            }
        }
    ]

    risk_result = list(
        traffic_collection.aggregate(risk_pipeline)
    )

    average_risk = 0
    maximum_risk = 0

    if risk_result:
        average_risk = round(
            risk_result[0].get("average_risk", 0) or 0,
            2
        )

        maximum_risk = round(
            risk_result[0].get("maximum_risk", 0) or 0,
            2
        )

    # ---------------------------------------------------------
    # 6. PROTOCOL BREAKDOWN
    # ---------------------------------------------------------

    protocol_pipeline = [
        {
            "$match": {
                "protocol": {
                    "$exists": True,
                    "$ne": None
                }
            }
        },
        {
            "$group": {
                "_id": "$protocol",
                "count": {
                    "$sum": 1
                }
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ]

    by_protocol_raw = list(
        traffic_collection.aggregate(
            protocol_pipeline
        )
    )

    by_protocol = [
        {
            "protocol": item["_id"],
            "count": item["count"]
        }
        for item in by_protocol_raw
    ]

    # ---------------------------------------------------------
    # 7. SEVERITY BREAKDOWN
    # ---------------------------------------------------------

    severity_pipeline = [
        {
            "$match": {
                "severity": {
                    "$in": [
                        "Low",
                        "Medium",
                        "High",
                        "Critical"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": "$severity",
                "count": {
                    "$sum": 1
                }
            }
        }
    ]

    severity_raw = list(
        traffic_collection.aggregate(
            severity_pipeline
        )
    )

    severity = {
        "Low": 0,
        "Medium": 0,
        "High": 0,
        "Critical": 0
    }

    for item in severity_raw:
        severity_name = item["_id"]

        if severity_name in severity:
            severity[severity_name] = item["count"]

    # ---------------------------------------------------------
    # 8. RETURN DASHBOARD STATISTICS
    # ---------------------------------------------------------

    return {
        "total_packets": total,

        "normal_packets": normal,

        "attack_packets": attacks,

        "attack_percent": attack_percent,

        "normal_percent": normal_percent,

        "high_critical_alerts": high_critical,

        "average_risk_score": average_risk,

        "maximum_risk_score": maximum_risk,

        "severity": severity,

        "by_protocol": by_protocol
    }