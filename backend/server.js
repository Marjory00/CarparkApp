const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron'); // <--- CRON IMPORTED
const app = express();
const PORT = 3000;

// Define the path to the static JSON data file once
const PARKING_DATA_PATH = path.join(__dirname, '../frontend/data/parking_data.json');
const VISITOR_LOG_PATH = path.join(__dirname, '../frontend/data/visitor_log.json'); // <-- NEW PATH

// --- Utility Functions for Parking Passes ---

/**
 * Reads all parking passes from the JSON file.
 * @returns {Array} List of parking passes.
 */
function readParkingPasses() {
    try {
        const data = fs.readFileSync(PARKING_DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Return empty array if file doesn't exist or is invalid JSON
        console.error('Parking file read error. Starting with empty log.', error.message);
        return [];
    }
}

/**
 * Writes the updated list of parking passes back to the JSON file.
 * @param {Array} passes - The list of passes to write.
 */
function writeParkingPasses(passes) {
    try {
        // Use 2 spaces for formatting the JSON output
        fs.writeFileSync(PARKING_DATA_PATH, JSON.stringify(passes, null, 2), 'utf8');
    } catch (error) {
        console.error('ERROR: Could not write parking data to file.', error.message);
    }
}

// --- NEW Utility Functions for Visitor Log ---

/**
 * Reads all visitor log entries from the JSON file.
 * @returns {Array} List of visitor entries.
 */
function readVisitorLog() {
    try {
        const data = fs.readFileSync(VISITOR_LOG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Visitor file read error. Starting with empty log.', error.message);
        return [];
    }
}

/**
 * Writes the updated list of visitor entries back to the JSON file.
 * @param {Array} visitors - The list of visitors to write.
 */
function writeVisitorLog(visitors) {
    try {
        fs.writeFileSync(VISITOR_LOG_PATH, JSON.stringify(visitors, null, 2), 'utf8');
    } catch (error) {
        console.error('ERROR: Could not write visitor data to file.', error.message);
    }
}


// --- Scheduled Expiry Check (The Cron Job) ---

// Schedule a function to run every hour at 0 minutes past the hour
cron.schedule('0 * * * *', () => {
    console.log(`[CRON] Running hourly expiry check: ${new Date().toLocaleString()}`);
    
    const now = new Date();
    let passes = readParkingPasses();
    
    // Filter out passes where the expiry time is in the past
    const activePasses = passes.filter(pass => {
        const expiry = new Date(pass.expires);
        return expiry.getTime() > now.getTime(); // Keep if expiry is in the future
    });
    
    const expiredCount = passes.length - activePasses.length;

    if (expiredCount > 0) {
        writeParkingPasses(activePasses);
        console.log(`[CRON] Cleanup complete. Removed ${expiredCount} expired pass(es).`);
    } else {
        console.log(`[CRON] No expired passes found. Active count: ${activePasses.length}`);
    }
});


// --- Middleware Setup ---

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());


// --- API Routes ---

// API endpoint to GET the active parking log data
app.get('/api/parking/log', (req, res) => {
    const activePasses = readParkingPasses();
    res.json(activePasses);
});

// API endpoint to POST a new parking pass request (UPDATED to use duration)
app.post('/api/parking/pass', (req, res) => {
    const newPassData = req.body; 
    
    // 1. Calculate expiration time based on duration passed in the body, defaulting to 4 hours
    const durationHours = parseInt(newPassData.duration, 10) || 4; 
    const expiryTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    
    const newPass = {
        id: `GP-${Date.now() % 10000}`, // Mock pass ID
        plate: newPassData.plate.toUpperCase(),
        unit: newPassData.unit,
        expires: expiryTime // Actual expiry time added
    };

    // 2. Read existing, append new, and write back to the file
    let passes = readParkingPasses();
    passes.push(newPass);
    writeParkingPasses(passes);
    
    console.log(`New pass generated for ${newPass.plate} for ${durationHours} hours.`);
    
    // Respond with a success message and the new pass data
    res.status(201).json({ 
        message: 'Pass generated and added to log.', 
        pass: newPass
    });
});


// --- NEW VISITOR LOG API ROUTES ---

// 1. GET Visitor Log
app.get('/api/visitor/log', (req, res) => {
    const visitors = readVisitorLog();
    // Sort so active visitors appear first, then by most recent check-in
    visitors.sort((a, b) => {
        if (!a.checkOutTime && b.checkOutTime) return -1;
        if (a.checkOutTime && !b.checkOutTime) return 1;
        return new Date(b.checkInTime) - new Date(a.checkInTime);
    });
    res.json(visitors);
});

// 2. POST Visitor Check-In
app.post('/api/visitor/checkin', (req, res) => {
    const newVisitorData = req.body; 
    
    if (!newVisitorData.name || !newVisitorData.unit || !newVisitorData.type) {
        return res.status(400).json({ error: 'Missing required fields: name, unit, or type.' });
    }

    const newVisitor = {
        id: Date.now(),
        name: newVisitorData.name,
        unit: newVisitorData.unit,
        type: newVisitorData.type,
        guestPass: newVisitorData.guestPass || null,
        notes: newVisitorData.notes || null,
        checkInTime: new Date().toISOString(),
        checkOutTime: null
    };

    let visitors = readVisitorLog();
    visitors.unshift(newVisitor); // Add to the start of the array
    writeVisitorLog(visitors);
    
    console.log(`Visitor checked in: ${newVisitor.name} (${newVisitor.unit})`);
    res.status(201).json({ message: 'Visitor checked in.', visitor: newVisitor });
});

// 3. PATCH Visitor Check-Out
app.patch('/api/visitor/checkout/:id', (req, res) => {
    // Note: ID comes from the URL parameter
    const visitorId = parseInt(req.params.id); 
    let visitors = readVisitorLog();
    
    const visitorIndex = visitors.findIndex(v => v.id === visitorId);
    
    if (visitorIndex === -1) {
        return res.status(404).json({ error: 'Visitor not found.' });
    }
    
    // Only check out if not already checked out
    if (!visitors[visitorIndex].checkOutTime) {
        visitors[visitorIndex].checkOutTime = new Date().toISOString();
        writeVisitorLog(visitors);
        console.log(`Visitor checked out: ${visitors[visitorIndex].name}`);
        return res.json({ message: 'Visitor checked out successfully.', visitor: visitors[visitorIndex] });
    }

    res.status(400).json({ message: 'Visitor already checked out.' });
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`CarparkApp server running at http://localhost:${PORT}`);
    console.log(`Frontend accessible at http://localhost:${PORT}/index.html`);
});