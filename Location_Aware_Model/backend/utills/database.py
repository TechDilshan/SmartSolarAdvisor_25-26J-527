from typing import Optional

from flask import current_app
from pymongo import MongoClient
from pymongo.errors import PyMongoError

_mongo_client: Optional[MongoClient] = None
_db_initialized: bool = False


def init_db(app) -> bool:
    """
    Initialize the MongoDB connection.

    Returns True if the database is reachable and initialized, False otherwise.
    """
    global _mongo_client, _db_initialized

    try:
        mongo_uri = app.config.get("MONGO_URI")
        mongo_db_name = app.config.get("MONGO_DB_NAME")

        _mongo_client = MongoClient(mongo_uri)
        # Force a ping to ensure the server is reachable
        _mongo_client.admin.command("ping")

        # Touch the DB once so that get_db() will succeed
        _ = _mongo_client[mongo_db_name]

        # Simple debug print to confirm which Mongo instance we are using
        masked_uri = mongo_uri
        if "@" in masked_uri:
            # Hide password part for safety
            try:
                prefix, rest = masked_uri.split("://", 1)
                creds, host = rest.split("@", 1)
                user = creds.split(":", 1)[0]
                masked_uri = f"{prefix}://{user}:***@{host}"
            except Exception:
                pass
        print(f"[MongoDB] Connected to {masked_uri}, DB={mongo_db_name}")

        _db_initialized = True
        return True
    except PyMongoError:
        _mongo_client = None
        _db_initialized = False
        return False


def get_db() -> Optional[object]:
    """
    Return the MongoDB database handle when initialized, else None.
    """
    global _mongo_client

    if not _db_initialized or _mongo_client is None:
        return None

    app = current_app
    mongo_db_name = app.config.get("MONGO_DB_NAME")
    return _mongo_client[mongo_db_name]


def close_db(exception=None) -> None:
    """
    Close the MongoDB client if it exists.
    """
    global _mongo_client

    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
