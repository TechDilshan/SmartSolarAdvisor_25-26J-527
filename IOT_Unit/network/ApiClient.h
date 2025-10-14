#pragma once
#include <HTTPClient.h>
#include <ArduinoJson.h>


namespace Net {

inline bool postJson(const String& path, const JsonDocument& doc) {
  String url = String(API_BASE_URL) + path;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(url);

  http.addHeader("Content-Type", "application/json");

  String payload;
  serializeJson(doc, payload);

  for (int attempt = 1; attempt <= HTTP_RETRY_MAX; ++attempt) {
    int code = http.POST(payload);
    if (code > 0) {
      if (code >= 200 && code < 300) {
        logInfo("POST %s -> %d", url.c_str(), code);
        http.end();
        return true;
      } else {
        logWarn("POST %s -> %d : %s", url.c_str(), code, http.getString().c_str());
      }
    } else {
      logWarn("HTTP error: %s", http.errorToString(code).c_str());
    }
    delay(600 * attempt); // backoff
  }
  http.end();
  return false;
}

} // namespace Net
