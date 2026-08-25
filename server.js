const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initializeDatabase } = require('./database');

const app = express();
app.use(cors());
app.use(express.json()); 

// static files from new folder "public"
app.use(express.static(path.join(__dirname, 'public')));

// login system (BLUE TEAM)
let securityLogs = [];

function addLog(action, payload) {
    const time = new Date().toLocaleTimeString();
    const isSuspicious = payload.toUpperCase().includes("'") || 
                         payload.toUpperCase().includes("UNION") || 
                         payload.toUpperCase().includes("--");
                         
    const type = isSuspicious ? '[🚨 ALERT]' : '[ℹ️ INFO]';
    const logEntry = `${time} ${type} - ${action} | Input detected: ${payload}`;
    
    securityLogs.unshift(logEntry);
    if(securityLogs.length > 15) securityLogs.pop();
}

app.get('/api/events', (req, res) => {
    res.json({ success: true, logs: securityLogs });
});

app.post('/api/events/clear', (req, res) => {
    securityLogs = [];
    res.json({ success: true });
});

app.post('/api/database/reset', (req, res) => {
    try {
        initializeDatabase();
        addLog("SYSTEM", "Administrator reset the database.");
        res.json({ success: true, message: "Database successfully reset to initial state!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// WAF medium level

function checkWAF(input) {
    if (!input) return false;
    const blockedKeywords = ['UNION', 'union', ' OR ', ' or ', '--'];
    for (let word of blockedKeywords) {
        if (input.includes(word)) {
            return true;
        }
    }
    return false; 
}

//  1: login (Auth Bypass)

app.post('/api/attack/login', (req, res) => {
    const { email, parola, difficulty } = req.body;
    addLog(`LOGIN [${difficulty.toUpperCase()}]`, email); 

    if (difficulty === 'hard') {
        const query = `SELECT * FROM Clienti WHERE email = ? AND parola = ?`;
        db.all(query, [email, parola], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            if (rows.length > 0) res.json({ success: true, user: rows[0], executedQuery: query });
            else res.status(401).json({ success: false, message: 'Invalid email or password', executedQuery: query });
        });
    } else {
        if (difficulty === 'medium' && checkWAF(email)) {
            addLog("WAF BLOCKED", "Malicious signature caught on Login");
            return res.json({ success: false, isWafBlock: true, message: 'WAF ALERT: Malicious SQL keywords detected and blocked!', executedQuery: 'BLOCKED BY FIREWALL' });
        }
        
        const query = `SELECT * FROM Clienti WHERE email = '${email}' AND parola = '${parola}'`;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            if (rows.length > 0) res.json({ success: true, user: rows[0], executedQuery: query });
            else res.status(401).json({ success: false, message: 'Invalid email or password', executedQuery: query });
        });
    }
});

// 2:search (UNION)

app.post('/api/attack/search', (req, res) => {
    const { roomName, difficulty } = req.body;
    addLog(`SEARCH [${difficulty.toUpperCase()}]`, roomName);

    if (difficulty === 'hard') {
        const query = `SELECT id, denumire, pret FROM TipuriCamera WHERE denumire LIKE ?`;
        db.all(query, [`%${roomName}%`], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            res.json({ success: true, results: rows, executedQuery: query });
        });
    } else {
        if (difficulty === 'medium' && checkWAF(roomName)) {
            addLog("WAF BLOCKED", "Malicious signature caught on Search");
            return res.json({ success: false, isWafBlock: true, message: 'WAF ALERT: UNION keyword detected and blocked!', executedQuery: 'BLOCKED BY FIREWALL' });
        }

        const query = `SELECT id, denumire, pret FROM TipuriCamera WHERE denumire LIKE '%${roomName}%'`;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            res.json({ success: true, results: rows, executedQuery: query });
        });
    }
});

// 3: update (MODIFICATION)
app.post('/api/attack/update', (req, res) => {
    const { targetEmail, newPassword, difficulty } = req.body;
    addLog(`UPDATE [${difficulty.toUpperCase()}]`, targetEmail);

    if (difficulty === 'hard') {
        const query = `UPDATE Clienti SET parola = ? WHERE email = ?`;
        db.run(query, [newPassword, targetEmail], function(err) {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            res.json({ success: true, affectedRows: this.changes, executedQuery: query });
        });
    } else {
        if (difficulty === 'medium' && checkWAF(targetEmail)) {
            addLog("WAF BLOCKED", "Malicious signature caught on Update");
            return res.json({ success: false, isWafBlock: true, message: 'WAF ALERT: OR statement detected and blocked!', executedQuery: 'BLOCKED BY FIREWALL' });
        }

        const query = `UPDATE Clienti SET parola = '${newPassword}' WHERE email = '${targetEmail}'`;
        db.run(query, function(err) {
            if (err) return res.status(500).json({ error: err.message, executedQuery: query });
            res.json({ success: true, affectedRows: this.changes, executedQuery: query });
        });
    }
});

// 4: BLIND SQL INJECTION
app.post('/api/attack/blind', (req, res) => {
    const { roomNumber, difficulty } = req.body;
    addLog(`BLIND [${difficulty.toUpperCase()}]`, roomNumber);

    if (difficulty === 'hard') {
        const query = `SELECT id FROM Camere WHERE numar = ?`;
        db.all(query, [roomNumber], (err, rows) => {
            if (err) return res.json({ success: true, exists: false, executedQuery: query });
            if (rows.length > 0) res.json({ success: true, exists: true, executedQuery: query });
            else res.json({ success: true, exists: false, executedQuery: query });
        });
    } else {
        if (difficulty === 'medium' && checkWAF(roomNumber)) {
            addLog("WAF BLOCKED", "Malicious signature caught on Blind SQLi");
            return res.json({ success: false, isWafBlock: true, message: 'WAF ALERT: Logic operator detected and blocked!', executedQuery: 'BLOCKED BY FIREWALL' });
        }

        const query = `SELECT id FROM Camere WHERE numar = '${roomNumber}'`;
        db.all(query, [], (err, rows) => {
            if (err) return res.json({ success: true, exists: false, executedQuery: query });
            if (rows.length > 0) res.json({ success: true, exists: true, executedQuery: query });
            else res.json({ success: true, exists: false, executedQuery: query });
        });
    }
});

// live database

app.get('/api/database/state', (req, res) => {
    const query = `SELECT id, nume, email, parola FROM Clienti`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, table: 'Clienti', data: rows });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[+] Security Lab running on http://localhost:${PORT}`);
});