#pragma once
#include <Wire.h>
#include <BH1750.h>
#include "../config.h"

struct LuxReading {
  float lux1=NAN, lux2=NAN, lux_avg=NAN;
};

class BH1750Pair {
  BH1750 s1, s2;
public:
  BH1750Pair(): s1(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_1),
                s2(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_2) {}

  void begin(){
    Wire.begin(I2C_SDA, I2C_SCL);
    s1.begin(BH1750_ADDR_1); 
    s2.begin(BH1750_ADDR_2);
  }

  LuxReading readAveraged(uint8_t samples=SAMPLE_AVG){
    LuxReading r;
    float a=0,b=0; int c1=0,c2=0;
    for(uint8_t i=0;i<samples;i++){
      float x=s1.readLightLevel(); if(x>0){ a+=x;c1++; }
      x=s2.readLightLevel(); if(x>0){ b+=x;c2++; }
      delay(20);
    }
    if(c1) r.lux1=a/c1;
    if(c2) r.lux2=b/c2;
    if(c1||c2) r.lux_avg = ( (c1? r.lux1:0)+(c2? r.lux2:0) ) / float((c1?1:0)+(c2?1:0));
    return r;
  }
};
