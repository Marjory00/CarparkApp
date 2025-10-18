const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const app = express();
const PORT = 3000;

// Database file path
const DB_PATH = path.join(__dirname, 'carpark.db');

// Database connection object
let db;

// --- Utility Functions: Database Initialization ---

/**
 * Connects to the SQLite database and creates tables if they don't exist.
 */
async function initDB() {
    // Open the database connection
    db = await sqlite.open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // 1. Create Parking Passes Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS parking_passes (
            id TEXT PRIMARY KEY,
            plate TEXT NOT NULL,
            unit TEXT NOT NULL,
            expires TEXT NOT NULL
        );
    `);
    console.log('SQLite: Parking Passes table ensured.');

    // 2. Create Visitor Log Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS visitor_log (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            unit TEXT NOT NULL,
            type TEXT NOT NULL,
            guestPass TEXT,
            notes TEXT,
            checkInTime TEXT NOT NULL,
            checkOutTime TEXT
        );
    `);
    console.log('SQLite: Visitor Log table ensured.');

    // 3. Create Violation Log Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS violation_log (
            id INTEGER PRIMARY KEY,
            plate TEXT NOT NULL,
            reason TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            notes TEXT
        );
    `);
    console.log('SQLite: Violation Log table ensured.');
}

// --- Scheduled Expiry Check (The Cron Job) ---

// Runs at the 0 minute of every hour
cron.schedule('0 * * * *', async () => {
    console.log(`[CRON] Running hourly expiry cleanup: ${new Date().toLocaleString()}`);

    if (!db) return console.error('[CRON ERROR] Database not initialized.');

    try {
        const now = new Date().toISOString();
        
        const result = await db.run(
            `DELETE FROM parking_passes WHERE expires < ?`,
            [now]
        );

        if (result.changes > 0) {
            console.log(`[CRON] Cleanup complete. Removed ${result.changes} expired pass(es).`);
        } else {
            console.log(`[CRON] No expired passes found.`);
        }
    } catch (error) {
        console.error('[CRON ERROR] Failed to perform database cleanup:', error.message);
    }
});


// --- Middleware Setup ---

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());


// --- API Routes: Parking Passes ---

// GET active parking log data
app.get('/api/parking/log', async (req, res) => {
    try {
        const passes = await db.all('SELECT * FROM parking_passes ORDER BY expires ASC');
        res.json(passes);
    } catch (error) {
        console.error('Error in /api/parking/log:', error.message);
        res.status(500).json({ error: 'Failed to retrieve parking log from DB.' });
    }
});

// POST a new parking pass request
app.post('/api/parking/pass', async (req, res) => {
    const { plate, unit, duration } = req.body; 
    
    if (!plate || !unit || !duration) {
        return res.status(400).json({ error: 'Missing required fields: plate, unit, or duration.' });
    }

    const durationHours = parseInt(duration, 10) || 4; 
    const expiryTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const passId = `GP-${Date.now() % 10000}`;

    try {
        await db.run(
            `INSERT INTO parking_passes (id, plate, unit, expires) VALUES (?, ?, ?, ?)`,
            [passId, plate.toUpperCase(), unit, expiryTime]
        );
        
        const newPass = { id: passId, plate: plate.toUpperCase(), unit, expires: expiryTime };
        
        console.log(`New pass generated for ${plate.toUpperCase()} for ${durationHours} hours.`);
        
        res.status(201).json({ 
            message: 'Pass generated and added to DB log.', 
            pass: newPass
        });
    } catch (error) {
        console.error('DB ERROR: Failed to insert new pass:', error.message);
        res.status(500).json({ error: 'Failed to save pass to database.' });
    }
});

// DELETE /api/parking/pass/:id - Manually revoke/delete a parking pass
app.delete('/api/parking/pass/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Missing pass ID.' });
    }

    try {
        const result = await db.run('DELETE FROM parking_passes WHERE id = ?', id);

        if (result.changes === 0) {
            return res.status(404).json({ message: `Pass ${id} not found or already revoked.` });
        }

        console.log(`Parking Pass ${id} successfully revoked.`);
        return res.json({ message: `Pass ${id} revoked successfully.`, revokedId: id });

    } catch (error) {
        console.error('DB ERROR: Failed to revoke pass:', error.message);
        res.status(500).json({ error: 'Failed to revoke pass from database.' });
    }
});

// NEW: GET Digital Pass Lookup
app.get('/api/parking/lookup/:plate', async (req, res) => {
    const plate = req.params.plate.toUpperCase();
    
    try {
        const pass = await db.get(
            `SELECT * FROM parking_passes WHERE plate = ?`,
            [plate]
        );

        if (pass) {
            // Pass found. We send the pass object. The frontend checks expiry.
            res.json({ pass: pass });
        } else {
            // No pass found for this plate.
            res.json({ pass: null, message: 'No active pass found for this plate.' });
        }
    } catch (error) {
        console.error('Error in /api/parking/lookup:', error.message);
        res.status(500).json({ error: 'Failed to perform plate lookup.' });
    }
});


// --- API Routes: Visitor Log ---

// 1. GET Visitor Log
app.get('/api/visitor/log', async (req, res) => {
    try {
        const visitors = await db.all(`
            SELECT * FROM visitor_log 
            ORDER BY 
                CASE WHEN checkOutTime IS NULL THEN 0 ELSE 1 END, 
                checkInTime DESC
        `);
        res.json(visitors);
    } catch (error) {
        console.error('Error in /api/visitor/log:', error.message);
        res.status(500).json({ error: 'Failed to retrieve visitor log from DB.' });
    }
});

// 2. POST Visitor Check-In
app.post('/api/visitor/checkin', async (req, res) => {
    const { name, unit, type, guestPass, notes } = req.body;
    
    if (!name || !unit || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, unit, or type.' });
    }

    const checkInTime = new Date().toISOString();
    
    try {
        const result = await db.run(
            `INSERT INTO visitor_log (name, unit, type, guestPass, notes, checkInTime) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, unit, type, guestPass || null, notes || null, checkInTime]
        );

        const newVisitor = { 
            id: result.lastID, name, unit, type, 
            guestPass: guestPass || null, notes: notes || null, checkInTime, checkOutTime: null 
        };
        
        console.log(`Visitor checked in: ${name} (${unit})`);
        res.status(201).json({ message: 'Visitor checked in.', visitor: newVisitor });

    } catch (error) {
        console.error('DB ERROR: Failed to insert new visitor:', error.message);
        res.status(500).json({ error: 'Failed to save visitor data to database.' });
    }
});

// 3. PATCH Visitor Check-Out
app.patch('/api/visitor/checkout/:id', async (req, res) => {
    const visitorId = req.params.id;

    try {
        const checkOutTime = new Date().toISOString();
        
        const result = await db.run(
            `UPDATE visitor_log SET checkOutTime = ? WHERE id = ? AND checkOutTime IS NULL`,
            [checkOutTime, visitorId]
        );

        if (result.changes === 0) {
            const visitor = await db.get(`SELECT * FROM visitor_log WHERE id = ?`, [visitorId]);
            if (!visitor) {
                return res.status(404).json({ message: 'Visitor not found.' });
            }
            if (visitor.checkOutTime) {
                return res.status(400).json({ message: 'Visitor already checked out.' });
            }
        }
        
        console.log(`Visitor ${visitorId} checked out.`);
        return res.json({ message: 'Visitor checked out successfully.' });

    } catch (error) {
        console.error('DB ERROR: Failed to check out visitor:', error.message);
        res.status(500).json({ error: 'Failed to update database.' });
    }
});

// --- API Routes: Violation Log ---

// 1. GET Plate History (Search Violation Log)
app.get('/api/violations/history/:plate', async (req, res) => {
    const plate = req.params.plate.toUpperCase();
    
    try {
        const history = await db.all(
            `SELECT * FROM violation_log WHERE plate = ? ORDER BY timestamp DESC`,
            [plate]
        );
        res.json(history);
    } catch (error) {
        console.error('Error in /api/violations/history:', error.message);
        res.status(500).json({ error: 'Failed to retrieve plate history.' });
    }
});

// 2. POST New Violation (Towing/Citation Action)
app.post('/api/violations/record', async (req, res) => {
    const { plate, reason, action, notes } = req.body;
    
    if (!plate || !reason || !action) {
        return res.status(400).json({ error: 'Missing required fields: plate, reason, or action.' });
    }

    const timestamp = new Date().toISOString();
    
    try {
        const result = await db.run(
            `INSERT INTO violation_log (plate, reason, action, timestamp, notes) 
             VALUES (?, ?, ?, ?, ?)`,
            [plate.toUpperCase(), reason, action, timestamp, notes || null]
        );

        const newViolation = { id: result.lastID, plate: plate.toUpperCase(), reason, action, timestamp };
        
        console.log(`Violation recorded for ${plate.toUpperCase()}. Action: ${action}`);
        res.status(201).json({ 
            message: 'Violation recorded successfully.', 
            violation: newViolation 
        });

    } catch (error) {
        console.error('DB ERROR: Failed to record violation:', error.message);
        res.status(500).json({ error: 'Failed to save violation data to database.' });
    }
});


// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error('--- Global Error Handler Caught Exception ---');
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    console.error(err.stack);
    console.error('-------------------------------------------');

    res.status(500).json({
        error: 'An unexpected internal server error occurred.',
        details: err.message
    });
});


// --- Start Server ---
async function startServer() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`CarparkApp server running at http://localhost:${PORT}`);
            console.log(`Frontend accessible at http://localhost:${PORT}/index.html`);
            console.log(`Using SQLite database: ${DB_PATH}`);
        });
    } catch (error) {
        console.error('FATAL ERROR: Failed to start the server or initialize database:', error);
        process.exit(1);
    }
}

startServer();