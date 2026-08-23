const db = require('./database.js');

db.run(`UPDATE rooms SET balance = 0`, (err) => {
    if (err) {
        console.error("Error resetting balances:", err.message);
    } else {
        console.log("Success: All room balances set to 0.00 GH₵.");
    }
});