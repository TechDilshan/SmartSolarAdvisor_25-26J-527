from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

from utills.database import get_db


class Prediction:
    """
    MongoDB-backed prediction helper.
    Documents are stored in the "predictions" collection.
    """

    def __init__(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        year: int,
        month: int,
        tilt_deg: float,
        azimuth_deg: float,
        installed_capacity_kw: float,
        panel_efficiency: float,
        system_loss: float,
        shading_factor: float,
        predicted_energy_kwh: float,
        confidence_score: Optional[float] = None,
        estimated_cost_usd: Optional[float] = None,
        monthly_savings_usd: Optional[float] = None,
        annual_savings_usd: Optional[float] = None,
        roi_percentage: Optional[float] = None,
        payback_period_years: Optional[float] = None,
        scenario_name: Optional[str] = None,
        created_at: Optional[datetime] = None,
        _id: Optional[Any] = None,
    ):
        self.id = _id
        self.user_id = user_id
        self.latitude = latitude
        self.longitude = longitude
        self.year = year
        self.month = month
        self.tilt_deg = tilt_deg
        self.azimuth_deg = azimuth_deg
        self.installed_capacity_kw = installed_capacity_kw
        self.panel_efficiency = panel_efficiency
        self.system_loss = system_loss
        self.shading_factor = shading_factor
        self.predicted_energy_kwh = predicted_energy_kwh
        self.confidence_score = confidence_score
        self.estimated_cost_usd = estimated_cost_usd
        self.monthly_savings_usd = monthly_savings_usd
        self.annual_savings_usd = annual_savings_usd
        self.roi_percentage = roi_percentage
        self.payback_period_years = payback_period_years
        self.scenario_name = scenario_name
        self.created_at = created_at or datetime.utcnow()

    @staticmethod
    def _collection():
        db = get_db()
        return db["predictions"] if db is not None else None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id) if self.id is not None else None,
            "user_id": str(self.user_id),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "year": self.year,
            "month": self.month,
            "tilt_deg": self.tilt_deg,
            "azimuth_deg": self.azimuth_deg,
            "installed_capacity_kw": self.installed_capacity_kw,
            "panel_efficiency": self.panel_efficiency,
            "system_loss": self.system_loss,
            "shading_factor": self.shading_factor,
            "predicted_energy_kwh": self.predicted_energy_kwh,
            "confidence_score": self.confidence_score,
            "estimated_cost_usd": self.estimated_cost_usd,
            "monthly_savings_usd": self.monthly_savings_usd,
            "annual_savings_usd": self.annual_savings_usd,
            "roi_percentage": self.roi_percentage,
            "payback_period_years": self.payback_period_years,
            "scenario_name": self.scenario_name,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_document(cls, doc: Dict[str, Any]) -> "Prediction":
        return cls(
            user_id=str(doc["user_id"]),
            latitude=doc["latitude"],
            longitude=doc["longitude"],
            year=doc["year"],
            month=doc["month"],
            tilt_deg=doc["tilt_deg"],
            azimuth_deg=doc["azimuth_deg"],
            installed_capacity_kw=doc["installed_capacity_kw"],
            panel_efficiency=doc["panel_efficiency"],
            system_loss=doc["system_loss"],
            shading_factor=doc["shading_factor"],
            predicted_energy_kwh=doc["predicted_energy_kwh"],
            confidence_score=doc.get("confidence_score"),
            estimated_cost_usd=doc.get("estimated_cost_usd"),
            monthly_savings_usd=doc.get("monthly_savings_usd"),
            annual_savings_usd=doc.get("annual_savings_usd"),
            roi_percentage=doc.get("roi_percentage"),
            payback_period_years=doc.get("payback_period_years"),
            scenario_name=doc.get("scenario_name"),
            created_at=doc.get("created_at", datetime.utcnow()),
            _id=doc.get("_id"),
        )

    def save(self) -> None:
        col = self._collection()
        if col is None:
            raise RuntimeError("Database not initialized")

        doc = {
            "user_id": ObjectId(self.user_id) if not isinstance(self.user_id, ObjectId) else self.user_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "year": self.year,
            "month": self.month,
            "tilt_deg": self.tilt_deg,
            "azimuth_deg": self.azimuth_deg,
            "installed_capacity_kw": self.installed_capacity_kw,
            "panel_efficiency": self.panel_efficiency,
            "system_loss": self.system_loss,
            "shading_factor": self.shading_factor,
            "predicted_energy_kwh": self.predicted_energy_kwh,
            "confidence_score": self.confidence_score,
            "estimated_cost_usd": self.estimated_cost_usd,
            "monthly_savings_usd": self.monthly_savings_usd,
            "annual_savings_usd": self.annual_savings_usd,
            "roi_percentage": self.roi_percentage,
            "payback_period_years": self.payback_period_years,
            "scenario_name": self.scenario_name,
            "created_at": self.created_at,
        }

        if self.id is None:
            result = col.insert_one(doc)
            self.id = result.inserted_id
        else:
            col.update_one({"_id": self.id}, {"$set": doc})

    def delete(self) -> None:
        col = self._collection()
        if col is None or self.id is None:
            return
        col.delete_one({"_id": self.id})

    @classmethod
    def find_by_id(cls, prediction_id: Any) -> Optional["Prediction"]:
        col = cls._collection()
        if col is None:
            return None
        try:
            oid = ObjectId(prediction_id)
        except Exception:
            return None
        doc = col.find_one({"_id": oid})
        return cls.from_document(doc) if doc else None

    @classmethod
    def find_by_user_id(cls, user_id: Any) -> List["Prediction"]:
        col = cls._collection()
        if col is None:
            return []
        try:
            oid = ObjectId(user_id)
        except Exception:
            return []
        docs = col.find({"user_id": oid}).sort("created_at", -1)
        return [cls.from_document(d) for d in docs]

    @classmethod
    def find_one_by_id_and_user(cls, prediction_id: Any, user_id: Any) -> Optional["Prediction"]:
        col = cls._collection()
        if col is None:
            return None
        try:
            pid = ObjectId(prediction_id)
            uid = ObjectId(user_id)
        except Exception:
            return None
        doc = col.find_one({"_id": pid, "user_id": uid})
        return cls.from_document(doc) if doc else None

    @classmethod
    def find_recent(cls, limit: int = 1000) -> List["Prediction"]:
        col = cls._collection()
        if col is None:
            return []
        docs = col.find().sort("created_at", -1).limit(limit)
        return [cls.from_document(d) for d in docs]

    @classmethod
    def get_statistics(cls) -> Dict[str, Any]:
        """
        Basic aggregated statistics using MongoDB aggregation.
        """
        col = cls._collection()
        if col is None:
            return {
                "users": {"total": 0, "admins": 0, "regular": 0},
                "predictions": {
                    "total": 0,
                    "average_energy_kwh": 0,
                    "average_confidence": 0,
                    "by_month": [],
                },
                "top_users": [],
            }

        total_predictions = col.count_documents({})

        pipeline_avg = [
            {
                "$group": {
                    "_id": None,
                    "avg_energy": {"$avg": "$predicted_energy_kwh"},
                    "avg_confidence": {"$avg": "$confidence_score"},
                }
            }
        ]
        avg_result = list(col.aggregate(pipeline_avg))
        if avg_result:
            avg_energy = avg_result[0].get("avg_energy") or 0
            avg_confidence = avg_result[0].get("avg_confidence") or 0
        else:
            avg_energy = 0
            avg_confidence = 0

        pipeline_month = [
            {
                "$group": {
                    "_id": "$month",
                    "count": {"$count": {}},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        month_results = list(col.aggregate(pipeline_month))
        by_month = [{"month": r["_id"], "count": r["count"]} for r in month_results]

        # For now, we won't compute top_users here to keep things simple.
        return {
            "users": {
                "total": 0,
                "admins": 0,
                "regular": 0,
            },
            "predictions": {
                "total": total_predictions,
                "average_energy_kwh": float(avg_energy),
                "average_confidence": float(avg_confidence),
                "by_month": by_month,
            },
            "top_users": [],
        }

    @classmethod
    def get_user_statistics(cls, user_id: Any) -> Dict[str, Any]:
        col = cls._collection()
        if col is None:
            return {
                "total_predictions": 0,
                "average_energy_kwh": 0.0,
                "average_confidence": 0.0,
                "total_potential_savings_lkr": 0.0,
            }
        try:
            uid = ObjectId(user_id)
        except Exception:
            return {
                "total_predictions": 0,
                "average_energy_kwh": 0.0,
                "average_confidence": 0.0,
                "total_potential_savings_lkr": 0.0,
            }

        pipeline = [
            {"$match": {"user_id": uid}},
            {
                "$group": {
                    "_id": None,
                    "count": {"$count": {}},
                    "avg_energy": {"$avg": "$predicted_energy_kwh"},
                    "avg_confidence": {"$avg": "$confidence_score"},
                    "total_savings": {"$sum": "$annual_savings_usd"},
                }
            },
        ]
        result = list(col.aggregate(pipeline))
        if not result:
            return {
                "total_predictions": 0,
                "average_energy_kwh": 0.0,
                "average_confidence": 0.0,
                "total_potential_savings_lkr": 0.0,
            }

        r = result[0]
        return {
            "total_predictions": int(r.get("count") or 0),
            "average_energy_kwh": float(r.get("avg_energy") or 0.0),
            "average_confidence": float(r.get("avg_confidence") or 0.0),
            "total_potential_savings_lkr": float(r.get("total_savings") or 0.0),
        }