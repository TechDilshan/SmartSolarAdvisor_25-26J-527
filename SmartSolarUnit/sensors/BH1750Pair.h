#pragma once
#include <Wire.h>
#include <BH1750.h>
#include "../config.h"
#include "../utils/Diagnostics.h"

struct LuxReading {
  float lux1 = NAN;
  float lux2 = NAN;
  float lux_avg = NAN;
  bool ok1 = false;
  bool ok2 = false;
};

class BH1750Pair {
  BH1750 s1;
  BH1750 s2;
  TwoWire Wire1 = TwoWire(0);
  TwoWire Wire2 = TwoWire(1);

public:
  void begin() {
    Wire1.begin(I2C1_SDA, I2C1_SCL);
    Wire2.begin(I2C2_SDA, I2C2_SCL);
    Wire1.setClock(50000);
    Wire2.setClock(50000);

    if (s1.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_1, &Wire1)) {
      logInfo("BH1750 #1 OK (bus1 addr 0x%X)", BH1750_ADDR_1);
    } else {
      logWarn("BH1750 #1 init failed");
    }

    if (s2.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_2, &Wire2)) {
      logInfo("BH1750 #2 OK (bus2 addr 0x%X)", BH1750_ADDR_2);
    } else {
      logWarn("BH1750 #2 init failed");
    }
  }

  LuxReading readAveraged(uint8_t samples = SAMPLE_AVG) {
    LuxReading r;
    float t1 = 0, t2 = 0;
    int c1 = 0, c2 = 0;

    for (uint8_t i = 0; i < samples; i++) {
      float l1 = s1.readLightLevel();
      float l2 = s2.readLightLevel();

      if (l1 > 0 && l1 < 65535) { t1 += l1; c1++; r.ok1 = true; }
      if (l2 > 0 && l2 < 65535) { t2 += l2; c2++; r.ok2 = true; }
      delay(40);
    }

    if (c1) r.lux1 = t1 / c1;
    if (c2) r.lux2 = t2 / c2;

    if (r.ok1 && r.ok2)
      r.lux_avg = (r.lux1 + r.lux2) / 2.0;
    else if (r.ok1)
      r.lux_avg = r.lux1;
    else if (r.ok2)
      r.lux_avg = r.lux2;

    return r;
  }
};
