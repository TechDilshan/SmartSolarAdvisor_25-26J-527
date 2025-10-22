#include "config.h"
#include "network/FirebaseSetup.h"  // Firebase with inline WiFi + time
#include "sensors/DHT22Pair.h"
#include "sensors/BH1750Pair.h"
#include "sensors/RainSensors.h"
#include "sensors/DustGP2Y1010.h"
#include "utils/TimeKeeper.h"
#include "utils/Diagnostics.h"
#include <ArduinoJson.h>

// ====== SENSOR OBJECTS ======
DHT22Pair     dht;
BH1750Pair    lux;
RainSensors   rain;
DustGP2Y1010  dust;

uint32_t nextTick = 0;

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("\n=== SMART SOLAR ADVISOR - FIREBASE UPLOAD MODE ===");

  // Connect Wi-Fi + Time + Firebase (all inline like friend's setup)
  connectFirebase();

  // Initialize sensors (after time/Firebase like friend)
  dht.begin();
  lux.begin();
  rain.begin();
  dust.begin();

  pinMode(LED_BUILTIN, OUTPUT);
  nextTick = millis(); // start immediately
}

// ====== BUILD JSON PAYLOAD ======
StaticJsonDocument<1024> buildPayload() {
  DhtReading   dr  = dht.readAveraged();
  LuxReading   lr  = lux.readAveraged();
  RainReading  rr  = rain.read();
  DustReading  ds  = dust.read();

  StaticJsonDocument<1024> doc;
  doc["device_id"] = DEVICE_ID;
  doc["site_id"]   = SITE_ID;
  doc["timestamp"] = TimeKeeper::iso8601();

  JsonObject dht1 = doc.createNestedObject("dht1");
  dht1["temp_c"] = dr.t1;
  dht1["hum_%"]  = dr.h1;

  JsonObject dht2 = doc.createNestedObject("dht2");
  dht2["temp_c"] = dr.t2;
  dht2["hum_%"]  = dr.h2;

  JsonObject dhta = doc.createNestedObject("dht_avg");
  dhta["temp_c"] = dr.t_avg;
  dhta["hum_%"]  = dr.h_avg;

  JsonObject bh = doc.createNestedObject("bh1750");
  bh["lux1"]    = lr.lux1;
  bh["lux2"]    = lr.lux2;
  bh["lux_avg"] = lr.lux_avg;

  JsonObject rainj = doc.createNestedObject("rain");
  rainj["raw1"]  = rr.raw1;
  rainj["raw2"]  = rr.raw2;
  rainj["pct1"]  = rr.pct1;
  rainj["pct2"]  = rr.pct2;

  JsonObject dustj = doc.createNestedObject("dust");
  dustj["raw"]      = ds.raw;
  dustj["voltage"]  = ds.voltage;
  dustj["mg_m3"]    = ds.density;

  // extra info
  doc["rssi"]    = WiFi.RSSI();
  doc["uptime_s"]= millis() / 1000;

  return doc;
}

// ====== PRINT + UPLOAD ======
void uploadAndDisplay() {
  StaticJsonDocument<1024> doc = buildPayload();

  // Print to Serial
  Serial.println("\n----------------------------------------------");
  Serial.println("📡 SENSOR DATA");
  serializeJsonPretty(doc, Serial);
  Serial.println();
  Serial.println("----------------------------------------------\n");

  // Firebase path (organized by device & timestamp)
  String fbPath = "/devices/" + String(DEVICE_ID) + "/" + TimeKeeper::iso8601();

  // Upload to Firebase (with checks like friend's updateFirebase)
  sendToFirebase(fbPath, doc);
}

// ====== LOOP ======
void loop() {
  uint32_t now = millis();
  if ((int32_t)(now - nextTick) >= 0) {
    digitalWrite(LED_BUILTIN, HIGH);

    uploadAndDisplay();   // Read + show + upload to Firebase

    digitalWrite(LED_BUILTIN, LOW);

    nextTick += LOOP_PERIOD_MS;   // schedule next cycle (5 min)
    if ((int32_t)(nextTick - now) < 0 || (nextTick - now) > LOOP_PERIOD_MS)
      nextTick = now + LOOP_PERIOD_MS;
  }

  delay(50);
}