**IoT-Based Prepaid Sub-Metering System for Shared Residential Hostels**



An automated, room-level IoT prepaid sub-metering system designed to eliminate billing inequities, reduce interpersonal friction, and encourage energy conservation in shared residential hostel environments.



**Overview**

In shared accommodation facilities particularly student hostels in Ghana relying on a single utility meter for multiple independent rooms often leads to unfair cost-sharing, disputes over high electricity bills, and energy waste. This project replaces the traditional "agreed contribution" flat-rate model with an automated, transparent, prepaid sub-metering architecture. 

The system provides granular energy tracking, automated real-time credit deduction, local web-based monitoring, and instant power disconnection/restoration via electromechanical relays.



**Key Features**

Dual-Room Independent Monitoring: Simultaneously tracks energy consumption across separate rooms without data cross-talk using dedicated hardware serial communication.

Real-Time Credit Tracking \& Tariffs: Continuously converts live power draw ($kWh$) into monetary deductions based on configurable utility tariff rates denominated in Ghanaian Cedis (GH₵).

Automated Power Enforcement: Instantly disconnects 230V AC mains power upon credit exhaustion (GH₵ 0.00) and automatically restores supply upon a verified top-up transaction.

Cloud-Independent Local Resilience: Operates entirely on a local network via a Flask backend and SQLite database, eliminating external subscription fees and internet connectivity vulnerabilities.

Transparent Web Dashboard: Gives both tenants and administrators clear visibility into voltage, current, active power, cumulative energy, and active credit balances.

System Connections \& Architecture

The schematic below outlines how power, hardware sensors, microcontrollers, and the local server are interconnected:

&#x20;

**Hardware Connection Breakdown**

1\.	Mains Supply: Power is drawn directly from the 230V AC mains utility grid to supply the shared residential hostel rooms. 

2\.	Relay Modules: High-current electromechanical relays connected to Digital Pin 4 (RELAY1\_PIN) and Digital Pin 7 (RELAY2\_PIN) provide galvanic isolation between low-voltage control circuits and high-voltage AC loads. 

3\.	Energy Sensors: Two independent PZEM-004T v3.0 modules handle on-chip RMS parameter extraction (voltage, current, active power, and cumulative energy) for each room. 

4\.	Serial Communication: The Arduino Mega master controller utilizes independent hardware serial ports (Serial1 and Serial2) operating at 9,600 baud to ensure simultaneous, cross-talk-free data acquisition.



**Tech Stack**

1\.	Hardware \& Microcontrollers: Arduino Mega, PZEM-004T v3.0 energy measurement modules, electromechanical relay modules.

2\.	Backend \& Server: Python, Flask, SQLite.

3\.	Frontend: HTML, CSS, JavaScript (Local Web Dashboard).



**How It Works**

1\.	Power Flow: Electricity flows from the 230V AC mains through the controlled relay switches to each respective room's load.

2\.	Data Acquisition: The PZEM-004T modules measure electrical parameters locally and transmit them over dedicated hardware serial lines to the Arduino Mega.

3\.	Credit Processing \& Logic: A backend algorithm running locally tracks remaining user credits against live energy consumption metrics, translating power draw into precise monetary deductions.

4\.	Enforcement: If a room's credit balance depletes to GH₵ 0.00, the system instantaneously deactivates the corresponding relay channel to disconnect power, and successfully restores supply upon a verified top-up.



**Getting Started**

1\. Clone the Repository

git clone \[https://github.com/EddyKay1 /iot-prepaid-submeter.git] 

cd iot-prepaid-submeter

2\. Flash the Firmware

•	Open the Arduino sketch in the Arduino IDE.

•	Verify pin mappings (RELAY1\_PIN on pin 4, RELAY2\_PIN on pin 7) and serial configurations (Serial1 and Serial2 at 9,600 baud).

•	Compile and upload the code to your Arduino Mega.

3\. Run the Web Server

pip install flask pysqlite3

node server.js

python app.py

4\. Access the Dashboard

Open your web browser and navigate to http://localhost:5000 to view real-time metrics, monitor energy parameters, and manage room credit balances.





