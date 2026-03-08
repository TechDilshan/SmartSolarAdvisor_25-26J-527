# firebase_config.py

import os

import firebase_admin
from firebase_admin import credentials, db


def _init_firebase():
    """
    Initialize Firebase Admin SDK once.

    Configuration:
    - FIREBASE_SERVICE_ACCOUNT_KEY_PATH: path to the service account json
      (defaults to ./serviceAccountKey.json for local dev)
    - FIREBASE_DB_URL: realtime database URL (required for non-default projects)
    """
    if firebase_admin._apps:
        return

    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "serviceAccountKey.json")
    database_url = os.getenv(
        "FIREBASE_DB_URL",
        "https://project12-f6813-default-rtdb.firebaseio.com/",
    )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"databaseURL": database_url})


_init_firebase()

ref = db.reference("predicted_units")