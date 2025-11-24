#pragma once

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// --------- DEVICE & PIN MAP ----------
#define PIN_DHT1          4
#define PIN_DHT2          5
#define PIN_RAIN1         32
#define PIN_RAIN2         33
#define PIN_DUST_LED_CTRL 23
#define PIN_DUST_ANALOG   34

// I²C for BH1750 #1
#define I2C1_SDA 21
#define I2C1_SCL 22
#define BH1750_ADDR_1 0x23

// I²C for BH1750 #2
#define I2C2_SDA 25
#define I2C2_SCL 26
#define BH1750_ADDR_2 0x23   // or 0x5C if ADDR → 3.3V

// --------- BACKEND ---------
#define API_BASE_URL      "http://192.168.1.5:5001"
#define API_ENDPOINT      "/api/create-solar-data"

// --------- APP SETTINGS ----------
#define DEVICE_ID         "SSA_ESP32_01"
#define SITE_ID           "SITE_COLOMBO_01"

#define LOOP_PERIOD_MS    (5UL * 60UL * 1000UL)
#define SAMPLE_AVG        5
#define HTTP_TIMEOUT_MS   8000
#define HTTP_RETRY_MAX    3
#define ADC_SAMPLES       8
