#pragma once
#include "../config.h"
#include "../utils/Diagnostics.h"

// ---- Tunable parameters ----
static float DUST_V0_DEFAULT = 0.60f;    // default clean-air voltage (V)
static float DUST_K          = 0.005f;   // V per mg/m3 from Sharp datasheet
static float DUST_GAIN       = 1.8f;     // sensitivity multiplier (1.0–3.0 typical)
static uint16_t DUST_BASELINE_MS = 3000; // time to learn baseline on startup (ms)

struct DustReading {
  int   raw = 0;          // 0..4095
  float voltage = 0.0f;   // ~0..3.0 V
  float density = 0.0f;   // mg/m3 estimate
};

class DustGP2Y1010 {
  float v0 = DUST_V0_DEFAULT;   // learned clean-air offset
  bool  ready = false;

  int sampleADCOnce() {
    // LED ON (active low through 1k)
    digitalWrite(PIN_DUST_LED_CTRL, LOW);
    delayMicroseconds(280);
    int v = analogRead(PIN_DUST_ANALOG);
    delayMicroseconds(40);
    digitalWrite(PIN_DUST_LED_CTRL, HIGH);  // LED OFF
    delayMicroseconds(9680);
    return v;
  }

public:
  void begin() {
    pinMode(PIN_DUST_LED_CTRL, OUTPUT);
    digitalWrite(PIN_DUST_LED_CTRL, HIGH);  // LED off (active low)
    analogReadResolution(12);

    // ---- Auto-baseline in current air ----
    uint32_t t0 = millis();
    uint32_t n = 0;
    double sumV = 0.0;
    while (millis() - t0 < DUST_BASELINE_MS) {
      int raw = sampleADCOnce();
      float volt = raw * (3.3f / 4095.0f);
      sumV += volt;
      n++;
      delay(5);
    }
    if (n > 0) {
      v0 = sumV / double(n);
      if (v0 < 0.3f) v0 = 0.3f;  // sanity clamp
      if (v0 > 0.9f) v0 = 0.9f;
    }
    logInfo("Dust baseline learned: %.3f V  (gain=%.1f)", v0, DUST_GAIN);
    ready = true;
  }

  DustReading read(uint8_t samples = SAMPLE_AVG) {
    DustReading r;
    if (!ready) return r;

    uint32_t acc = 0;
    for (uint8_t i = 0; i < samples; i++) acc += sampleADCOnce();
    r.raw = acc / samples;
    r.voltage = r.raw * (3.3f / 4095.0f);

    // Calculate dust density (more sensitive with gain)
    float deltaV = (r.voltage - v0);
    float mgm3 = deltaV / DUST_K;   // mg/m3 from Sharp curve
    mgm3 *= DUST_GAIN;              // amplify sensitivity
    if (mgm3 < 0) mgm3 = 0;
    r.density = mgm3;

    return r;
  }

  // Optional: re-calibrate baseline when air is clean
  void recalibrateBaseline(uint16_t ms = 3000) {
    uint32_t t0 = millis(); uint32_t n=0; double s=0;
    while (millis()-t0 < ms) { s += sampleADCOnce()*(3.3/4095.0); n++; delay(5); }
    if (n>0) { v0 = s/double(n); logInfo("Dust baseline re-set: %.3f V", v0); }
  }
};
