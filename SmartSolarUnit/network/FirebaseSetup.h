#pragma once
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>  // For any JsonDocument if needed, but using FirebaseJson now
#include "../secrets.h"
#include "../utils/Diagnostics.h"
#include "../utils/TimeKeeper.h"
#include "../config.h"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig configFB;

bool signupOK = false;  // Global flag like friend's signupOK

// Connect to WiFi + Firebase (anonymous mode) - Exact flow from friend's setup()
inline void connectFirebase() {
  // WiFi connection (inline like friend's setup)
  logInfo("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    logDot();
  }
  logInfo("\nWiFi connected, IP=%s", WiFi.localIP().toString().c_str());

  // Time sync before Firebase (like friend's configTime + wait)
  TimeKeeper::beginSNTP();  // Your IST-configured NTP

  // Configure Firebase
  configFB.api_key = API_KEY;
  configFB.database_url = DATABASE_URL;
  configFB.timeout.serverResponse = 10 * 1000;  // 10s timeout like friend

  logInfo("Attempting Firebase anonymous signup...");
  if (Firebase.signUp(&configFB, &auth, "", "")) {  // Empty for anonymous
    logInfo("✓ Firebase signup successful");
    signupOK = true;
  } else {
    logWarn("✗ Firebase signup failed: %s", configFB.signer.signupError.message.c_str());
  }

  // Token callback for status (like friend)
  configFB.token_status_callback = tokenStatusCallback;

  Firebase.reconnectWiFi(true);
  Firebase.begin(&configFB, &auth);
  Firebase.setDoubleDigits(5);
  Firebase.RTDB.setwriteSizeLimit(&fbdo, "medium");  // Medium for JSON like friend

  logInfo("Firebase connected.");
}

// Upload to Firebase (adapted from friend's updateFirebase() - checks + FirebaseJson)
inline bool sendToFirebase(const String& path, const JsonDocument& doc) {
  if (WiFi.status() != WL_CONNECTED) {
    logWarn("WiFi not connected, skipping Firebase update");
    return false;
  }

  time_t now = time(nullptr);
  if (now < 1700000000) {  // Wait for 2023+ like your NTP
    logWarn("Time not synchronized, skipping Firebase update");
    return false;
  }

  if (!Firebase.ready() || !signupOK) {
    logWarn("Firebase not ready or signup failed, skipping");
    return false;
  }

  // Build FirebaseJson from doc (like friend's sensorData.set())
  FirebaseJson fbJson;
  String payload;
  serializeJson(doc, payload);  // Convert ArduinoJson to string
  fbJson.setJsonData(payload);  // Set into FirebaseJson

  logInfo("Uploading data to Firebase path: %s", path.c_str());
  bool ok = Firebase.RTDB.setJSON(&fbdo, path.c_str(), &fbJson);

  if (ok) {
    logInfo("✅ Firebase update successful!");
    // Optional: Update "latest" like friend
    Firebase.RTDB.setJSON(&fbdo, "latest_readings", &fbJson);
  } else {
    logWarn("❌ Firebase update failed: %s (HTTP: %d)", fbdo.errorReason().c_str(), fbdo.httpCode());
  }
  return ok;
}