#include "config.h"
#include "sensors/DHT22Pair.h"
#include "sensors/BH1750Pair.h"
#include "sensors/RainSensors.h"
#include "sensors/DustGP2Y1010.h"
#include "utils/TimeKeeper.h"
#include "utils/Diagnostics.h"
#include <ArduinoJson.h>

DHT22Pair     dht;
BH1750Pair    lux;
RainSensors   rain;
DustGP2Y1010  dust;

uint32_t nextTick = 0;

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("=== SMART SOLAR ADVISOR - LOCAL SENSOR TEST ===");

  // Commented out for offline testing
  // Net::connectWiFi();
  // TimeKeeper::beginSNTP();

  dht.begin();
  lux.begin();
  rain.begin();
  dust.begin();

  pinMode(LED_BUILTIN, OUTPUT);
  nextTick = millis(); // start immediately
}

void printSensorData() {
  Serial.println("\n----------------------------------------------");
  Serial.println("📡 Reading all sensors...");

  DhtReading   dr = dht.readAveraged();
  LuxReading   lr = lux.readAveraged();
  RainReading  rr = rain.read();
  DustReading  ds = dust.read();

  Serial.println("💧 DHT22 #1");
  Serial.printf("   Temp: %.2f °C  |  Humidity: %.2f %%\n", dr.t1, dr.h1);
  Serial.println("💧 DHT22 #2");
  Serial.printf("   Temp: %.2f °C  |  Humidity: %.2f %%\n", dr.t2, dr.h2);
  Serial.printf("   Avg Temp: %.2f °C  |  Avg Humidity: %.2f %%\n", dr.t_avg, dr.h_avg);

  Serial.println("\n☀️  BH1750 Light Sensor");
  Serial.printf("   Lux1: %.2f  |  Lux2: %.2f  |  Avg: %.2f\n", lr.lux1, lr.lux2, lr.lux_avg);

  Serial.println("\n🌧 Rain Sensors");
  Serial.printf("   Sensor1: raw=%d (%.1f%% wet)\n", rr.raw1, rr.pct1);
  Serial.printf("   Sensor2: raw=%d (%.1f%% wet)\n", rr.raw2, rr.pct2);

  Serial.println("\n🌫 Dust Sensor (GP2Y1010AU0F)");
  Serial.printf("   Raw: %d  |  Voltage: %.2f V  |  Dust Density: %.2f mg/m³\n",
                ds.raw, ds.voltage, ds.density);

  Serial.println("----------------------------------------------\n");
}

void loop() {
  uint32_t now = millis();
  if ((int32_t)(now - nextTick) >= 0) {
    digitalWrite(LED_BUILTIN, HIGH);

    // Just print data (no Wi-Fi / API)
    printSensorData();

    digitalWrite(LED_BUILTIN, LOW);
    nextTick += LOOP_PERIOD_MS;  // every 5 minutes
    if ((int32_t)(nextTick - now) < 0 || (nextTick - now) > LOOP_PERIOD_MS)
      nextTick = now + LOOP_PERIOD_MS;
  }

  delay(50);
}
