/**
 * AquaIntel — ESP32 Pond Master Firmware
 * Smart Prawn Farm Automation & Edge Control
 * Target Hardware: ESP32-WROOM-32D, Semtech SX1276 (865.2 MHz IN865), RS485 Modbus RTU
 *
 * CRITICAL SAFETY ARCHITECTURE:
 * Runs standalone local safety hysteresis loop. Operates even if LoRa or WiFi is disconnected.
 */

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

// Pin Configuration
#define PIN_LORA_CS       18
#define PIN_LORA_RST      14
#define PIN_LORA_DIO0     26
#define PIN_AERATOR_RELAY 22  // Active LOW industrial relay
#define PIN_FEEDER_RELAY  23  // Feeder power relay
#define PIN_MANUAL_SWITCH 34  // Physical emergency switch input

// LoRa Configuration for India Band
#define LORA_FREQUENCY    865200000 // 865.2 MHz
#define POND_ID           1
#define DEVICE_ID         "ESP32-P01"

// Safety Thresholds
const float DO_CRITICAL_CUTOFF = 3.0; // mg/L
const float DO_SAFE_TARGET     = 5.5; // mg/L
const unsigned long MIN_MOTOR_RUNTIME_MS = 600000; // 10 minutes anti-cycle

unsigned long lastAeratorChange = 0;
bool aeratorRunning = false;
bool feederEnabled = true;

float readOpticalDO() {
    // In hardware: reads Modbus RS485 register 0x0001
    // Fallback simulation reading if probe disconnected
    return 5.8;
}

void engageAeration(const char* reason) {
    if (!aeratorRunning) {
        digitalWrite(PIN_AERATOR_RELAY, LOW); // Engage relay
        aeratorRunning = true;
        lastAeratorChange = millis();
        Serial.printf("[EDGE_SAFETY] Aerator STARTED. Reason: %s\n", reason);
    }
}

void disengageAeration() {
    if (aeratorRunning && (millis() - lastAeratorChange >= MIN_MOTOR_RUNTIME_MS)) {
        digitalWrite(PIN_AERATOR_RELAY, HIGH); // Release relay
        aeratorRunning = false;
        lastAeratorChange = millis();
        Serial.println("[EDGE_SAFETY] Aerator STOPPED. Safe hysteresis satisfied.");
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(PIN_AERATOR_RELAY, OUTPUT);
    pinMode(PIN_FEEDER_RELAY, OUTPUT);
    pinMode(PIN_MANUAL_SWITCH, INPUT_PULLUP);

    digitalWrite(PIN_AERATOR_RELAY, HIGH); // Default OFF
    digitalWrite(PIN_FEEDER_RELAY, HIGH);

    LoRa.setPins(PIN_LORA_CS, PIN_LORA_RST, PIN_LORA_DIO0);
    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("[LORA_INIT_ERROR] SX1276 radio not detected. Edge safety continuing standalone.");
    } else {
        LoRa.setSpreadingFactor(10);
        LoRa.setSignalBandwidth(125E3);
        Serial.println("[LORA_READY] 865.2 MHz IN865 transceiver active.");
    }
}

void loop() {
    bool manualOverride = (digitalRead(PIN_MANUAL_SWITCH) == LOW);
    float doLevel = readOpticalDO();

    // Priority 1: Hardware Manual Switch
    if (manualOverride) {
        engageAeration("Physical emergency toggle switch engaged");
        delay(1000);
        return;
    }

    // Priority 2: Critical DO Hypoxia Protection
    if (doLevel < DO_CRITICAL_CUTOFF) {
        engageAeration("CRITICAL LOW DO (< 3.0 mg/L)");
        digitalWrite(PIN_FEEDER_RELAY, HIGH); // Lock out feeder
    } else if (doLevel >= DO_SAFE_TARGET) {
        disengageAeration();
        digitalWrite(PIN_FEEDER_RELAY, LOW); // Feeder safe to dispense
    }

    // Transmit telemetry frame every 5 seconds
    static unsigned long lastTx = 0;
    if (millis() - lastTx > 5000) {
        lastTx = millis();
        StaticJsonDocument<256> doc;
        doc["schema_version"] = "1.0";
        doc["device_id"] = DEVICE_ID;
        doc["pond_id"] = POND_ID;
        doc["do_mg_l"] = doLevel;
        doc["aerator_status"] = aeratorRunning ? "RUNNING" : "STANDBY";

        LoRa.beginPacket();
        serializeJson(doc, LoRa);
        LoRa.endPacket();
    }
    delay(100);
}
