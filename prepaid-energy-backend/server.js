const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');
const db = require('./database.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = "1234";

// --- PRESENTATION SPEED MULTIPLIER ---
// Set to 1000 to drain balances fast for live demos. Change to 1 for real-world usage.
const DEMO_MULTIPLIER = 1000; 
const TIME_BETWEEN_READINGS_SEC = 2.1; // Approx delay between Arduino Serial prints

// Serial Port Setup for Arduino Mega on COM11
const port = new SerialPort({ path: 'COM11', baudRate: 115200 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Active power readings cache for live total wattage calculation
const livePower = { 1: 0, 2: 0 };

let activeTariffs = {
    tier1_rate: 0.9123,
    tier2_rate: 2.0672,
    tier3_rate: 2.7315
};

function loadTariffs() {
    db.all(`SELECT * FROM system_config`, [], (err, rows) => {
        if (!err && rows) {
            rows.forEach(row => {
                activeTariffs[row.key] = row.value;
            });
        }
    });
}
loadTariffs();

function getActiveTariffRate(cumulativeKwh) {
    if (cumulativeKwh <= 30) {
        return activeTariffs.tier1_rate;
    } else if (cumulativeKwh <= 300) {
        return activeTariffs.tier2_rate;
    } else {
        return activeTariffs.tier3_rate;
    }
}

function verifyAdmin(req, res, next) {
    const authHeader = req.headers['x-admin-password'];
    if (authHeader === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }
}

// Broadcasts updated room data and the aggregated Main ECG Meter State
function broadcastSystemState() {
    db.all(`SELECT * FROM rooms`, [], (err, rooms) => {
        if (err || !rooms) return;

        let mainBalance = 0;
        let totalEnergy = 0;

        rooms.forEach(room => {
            mainBalance += room.balance;
            totalEnergy += room.total_kwh;
        });

        const totalActiveLoad = (livePower[1] || 0) + (livePower[2] || 0);

        io.emit('main-meter-update', {
            mainBalance: parseFloat(mainBalance.toFixed(4)),
            totalActiveLoad: parseFloat(totalActiveLoad.toFixed(1)),
            totalEnergy: parseFloat(totalEnergy.toFixed(3)),
            rooms: rooms
        });
    });
}

// Serial Listener Processing (Live Deduction Logic)
parser.on('data', (data) => {
    try {
        const sensorData = JSON.parse(data);
        const sensorId = sensorData.sensor;
        const currentEnergy = sensorData.energy;

        livePower[sensorId] = sensorData.power || 0;

        db.get(`SELECT balance, relay_status FROM rooms WHERE sensor_id = ?`, [sensorId], (err, row) => {
            if (err || !row) return;

            // Calculate live exact energy used in the last ~2 seconds based on active load (W)
            let power_kW = (sensorData.power || 0) / 1000;
            let liveEnergyDelta = power_kW * (TIME_BETWEEN_READINGS_SEC / 3600); 

            const activeRate = getActiveTariffRate(currentEnergy);
            
            // Apply the DEMO_MULTIPLIER so the audience can see the balance drop rapidly!
            let deductionCost = liveEnergyDelta * activeRate * DEMO_MULTIPLIER; 
            
            let newBalance = row.balance - deductionCost;
            if (newBalance < 0) newBalance = 0;

            let newRelayStatus = row.relay_status;

            // Auto Trip Logic when balance hits exactly zero
            if (newBalance <= 0.00 && row.relay_status === 'ON') {
                newRelayStatus = 'OFF';
                port.write(`RELAY${sensorId}:OFF\n`);
                console.log(`[ALERT] Room ${sensorId} balance exhausted. Relay tripped.`);
            }

            db.run(`UPDATE rooms SET balance = ?, total_kwh = ?, relay_status = ? WHERE sensor_id = ?`, 
                [newBalance, currentEnergy, newRelayStatus, sensorId], () => {

                    // Broadcast individual room update
                    io.emit('sensor-update', {
                        sensorId,
                        voltage: sensorData.voltage,
                        current: sensorData.current,
                        power: sensorData.power,
                        energy: currentEnergy,
                        balance: parseFloat(newBalance.toFixed(4)), 
                        rate: activeRate,
                        relayStatus: newRelayStatus
                    });

                    // Broadcast aggregated Main Meter update
                    broadcastSystemState();
                });
        });
    } catch (err) {}
});

// --- PUBLIC APIS ---
app.get('/api/rooms', (req, res) => {
    db.all(`SELECT * FROM rooms`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/topup', (req, res) => {
    const { sensorId, amount } = req.body;
    const rechargeAmount = parseFloat(amount);

    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
        return res.status(400).json({ error: "Invalid top-up amount" });
    }

    db.get(`SELECT balance, relay_status FROM rooms WHERE sensor_id = ?`, [sensorId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Room not found" });

        let updatedBalance = row.balance + rechargeAmount;
        let updatedRelayStatus = row.relay_status;

        // Auto-restore power if they were tripped but now have positive balance
        if (updatedBalance > 0 && row.relay_status === 'OFF') {
            updatedRelayStatus = 'ON';
            port.write(`RELAY${sensorId}:ON\n`);
            console.log(`[RECHARGE] Room ${sensorId} topped up. Power Restored.`);
        }

        db.run(`UPDATE rooms SET balance = ?, relay_status = ? WHERE sensor_id = ?`, 
            [updatedBalance, updatedRelayStatus, sensorId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                broadcastSystemState();
                res.json({ success: true, newBalance: updatedBalance, relayStatus: updatedRelayStatus });
            });
    });
});

// --- ADMIN APIS (Protected by Password) ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ error: "Incorrect Password" });
    }
});

app.get('/api/admin/config', verifyAdmin, (req, res) => {
    res.json(activeTariffs);
});

app.post('/api/admin/config', verifyAdmin, (req, res) => {
    const { tier1_rate, tier2_rate, tier3_rate } = req.body;

    db.serialize(() => {
        db.run(`UPDATE system_config SET value = ? WHERE key = 'tier1_rate'`, [tier1_rate]);
        db.run(`UPDATE system_config SET value = ? WHERE key = 'tier2_rate'`, [tier2_rate]);
        db.run(`UPDATE system_config SET value = ? WHERE key = 'tier3_rate'`, [tier3_rate]);
        loadTariffs();
        res.json({ success: true, activeTariffs });
    });
});

app.post('/api/admin/room-override', verifyAdmin, (req, res) => {
    const { sensorId, balance, total_kwh, relayStatus } = req.body;

    db.run(`UPDATE rooms SET balance = ?, total_kwh = ?, relay_status = ? WHERE sensor_id = ?`,
        [balance, total_kwh, relayStatus, sensorId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            port.write(`RELAY${sensorId}:${relayStatus}\n`);
            broadcastSystemState();
            res.json({ success: true });
        });
});

app.post('/api/admin/zero-balances', verifyAdmin, (req, res) => {
    db.run(`UPDATE rooms SET balance = 0`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        port.write(`RELAY1:OFF\n`);
        port.write(`RELAY2:OFF\n`);
        broadcastSystemState();
        res.json({ success: true });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Web Dashboard: http://localhost:${PORT}`);
    console.log(`Admin Portal:  http://localhost:${PORT}/admin.html`);
    console.log(`Listening for Arduino Mega on COM11`);
    console.log(`====================================================`);
});