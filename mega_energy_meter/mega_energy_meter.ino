#include <PZEM004Tv30.h>

const int RELAY1_PIN = 4;
const int RELAY2_PIN = 7;

// Arduino Mega hardware serial ports (Serial1 and Serial2)
PZEM004Tv30 pzem1(Serial1); 
PZEM004Tv30 pzem2(Serial2); 

void setup() {
  // Main USB Serial connection to PC
  Serial.begin(115200);
  
  // Initialize Mega's hardware serial ports (Fixed pins: Serial1 is 19/18, Serial2 is 17/16)
  Serial1.begin(9600); 
  Serial2.begin(9600); 

  delay(1000);

  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, HIGH); // Default ON (Assuming active LOW or HIGH based on your relay module)
  digitalWrite(RELAY2_PIN, HIGH);
}

void loop() {
  // 1. Read and process incoming commands from Node.js (e.g., "RELAY1:OFF" or "RELAY1:ON")
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "RELAY1:OFF") {
      digitalWrite(RELAY1_PIN, LOW); // Change to HIGH if your relay is active-low
    } else if (command == "RELAY1:ON") {
      digitalWrite(RELAY1_PIN, HIGH); // Change to LOW if your relay is active-low
    } else if (command == "RELAY2:OFF") {
      digitalWrite(RELAY2_PIN, LOW); // Change to HIGH if your relay is active-low
    } else if (command == "RELAY2:ON") {
      digitalWrite(RELAY2_PIN, HIGH); // Change to LOW if your relay is active-low
    }
  }

  // 2. Read PZEM Sensors
  float v1 = pzem1.voltage();
  float c1 = pzem1.current();
  float p1 = pzem1.power();
  float e1 = pzem1.energy();

  float v2 = pzem2.voltage();
  float c2 = pzem2.current();
  float p2 = pzem2.power();
  float e2 = pzem2.energy();

  // 3. Send Sensor 1 Data to Node.js
  Serial.print("{\"sensor\":1, \"voltage\":");
  Serial.print(isnan(v1) ? 0.0 : v1);
  Serial.print(", \"current\":");
  Serial.print(isnan(c1) ? 0.0 : c1);
  Serial.print(", \"power\":");
  Serial.print(isnan(p1) ? 0.0 : p1);
  Serial.print(", \"energy\":");
  Serial.print(isnan(e1) ? 0.0 : e1);
  Serial.println("}");

  delay(100);

  // 4. Send Sensor 2 Data to Node.js
  Serial.print("{\"sensor\":2, \"voltage\":");
  Serial.print(isnan(v2) ? 0.0 : v2);
  Serial.print(", \"current\":");
  Serial.print(isnan(c2) ? 0.0 : c2);
  Serial.print(", \"power\":");
  Serial.print(isnan(p2) ? 0.0 : p2);
  Serial.print(", \"energy\":");
  Serial.print(isnan(e2) ? 0.0 : e2);
  Serial.println("}");

  delay(2000);
}