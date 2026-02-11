from datetime import datetime
from typing import Optional, Dict, Any

from flask_bcrypt import Bcrypt

from utills.database import get_db


bcrypt = Bcrypt()


class User:
    """
    MongoDB-backed user helper.
    Documents are stored in the "users" collection.
    """

    def __init__(
        self,
        username: str,
        email: str,
        password: str,
        is_admin: bool = False,
        created_at: Optional[datetime] = None,
        _id: Optional[Any] = None,
    ):
        self.id = _id
        self.username = username
        self.email = email
        self.password = password
        self.is_admin = is_admin
        self.created_at = created_at or datetime.utcnow()

    @staticmethod
    def _collection():
        db = get_db()
        return db["users"] if db is not None else None

    def set_password(self, password: str) -> None:
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id) if self.id is not None else None,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_document(cls, doc: Dict[str, Any]) -> "User":
        return cls(
            username=doc["username"],
            email=doc["email"],
            password=doc["password"],
            is_admin=doc.get("is_admin", False),
            created_at=doc.get("created_at", datetime.utcnow()),
            _id=doc.get("_id"),
        )

    @classmethod
    def find_by_username(cls, username: str) -> Optional["User"]:
        col = cls._collection()
        if col is None:
            return None
        doc = col.find_one({"username": username})
        return cls.from_document(doc) if doc else None

    @classmethod
    def find_by_email(cls, email: str) -> Optional["User"]:
        col = cls._collection()
        if col is None:
            return None
        doc = col.find_one({"email": email})
        return cls.from_document(doc) if doc else None

    @classmethod
    def find_by_id(cls, user_id) -> Optional["User"]:
        from bson import ObjectId

        col = cls._collection()
        if col is None:
            return None
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = col.find_one({"_id": oid})
        return cls.from_document(doc) if doc else None

    @classmethod
    def find_all(cls) -> list["User"]:
        """
        Return all users in the collection.
        """
        col = cls._collection()
        if col is None:
            return []
        docs = col.find()
        return [cls.from_document(doc) for doc in docs]

    def save(self) -> None:
        col = self._collection()
        if col is None:
            raise RuntimeError("Database not initialized")

        doc = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "is_admin": self.is_admin,
            "created_at": self.created_at,
        }

        if self.id is None:
            result = col.insert_one(doc)
            self.id = result.inserted_id
        else:
            col.update_one({"_id": self.id}, {"$set": doc})

    def delete(self) -> None:
        """
        Delete this user document from MongoDB.
        """
        col = self._collection()
        if col is None or self.id is None:
            return
        col.delete_one({"_id": self.id})