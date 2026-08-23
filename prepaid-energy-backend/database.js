const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./energy_meter.db');

db.serialize(() => {
    // Rooms table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        sensor_id INTEGER PRIMARY KEY,
        room_name TEXT,
        balance REAL,
        total_kwh REAL,
        relay_status TEXT
    )`);

    // System Configuration table for Admin Tariff Management
    db.run(`CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value REAL
    )`);

    // Default room entries
    const insertRoom = db.prepare(`INSERT OR IGNORE INTO rooms (sensor_id, room_name, balance, total_kwh, relay_status) VALUES (?, ?, ?, ?, ?)`);
    insertRoom.run(1, 'Room 1', 10.00, 0.0, 'ON');
    insertRoom.run(2, 'Room 2', 10.00, 0.0, 'ON');
    insertRoom.finalize();

    // Default April 2026 ECG Tariff Defaults
    const insertConfig = db.prepare(`INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)`);
    insertConfig.run('tier1_rate', 0.9123); // Lifeline (<=30 kWh)
    insertConfig.run('tier2_rate', 2.0672); // Standard (31-300 kWh)
    insertConfig.run('tier3_rate', 2.7315); // Upper Tier (>300 kWh)
    insertConfig.finalize();
});

module.exports = db;