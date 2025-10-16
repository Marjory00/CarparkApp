const express = require('express');
const path = require('path');
const fs = require('fs'); // Node's File System module to safely read files
const app = express();
const PORT = 3000;

// Define the path to the static JSON data file once
const PARKING_DATA_PATH = path.join(__dirname, '../frontend/data/parking_data.json');


// --- Middleware Setup ---

// 1. Serve Static Frontend Files
// This tells Express to look for files (index.html, app.js, style.css) 
// in the 'frontend' directory and serve them directly.
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Body Parser
// Required to parse JSON bodies from POST requests (like when generating a new pass).
app.use(express.json());


// --- API Routes ---

// API endpoint to GET the active parking log data
app.get('/api/parking/log', (req, res) => {
    try {
        // Use fs.readFileSync to safely read the content of the JSON file
        const data = fs.readFileSync(PARKING_DATA_PATH, 'utf8');
        const parkingData = JSON.parse(data);
        
        // Respond with the JSON data
        res.json(parkingData);

    } catch (error) {
        // If the file doesn't exist or is invalid JSON, log the error and send a 500
        console.error('ERROR: Failed to read parking data file.', error.message);
        res.status(500).json({ error: 'Could not load parking data from file.' });
    }
});

// API endpoint to POST a new parking pass request
app.post('/api/parking/pass', (req, res) => {
    const newPass = req.body; // Data sent from the frontend (plate, unit)
    
    // In a real, scalable application, you would:
    // 1. Validate the input (check required fields, format, etc.)
    // 2. Generate a unique ID and expiration time.
    // 3. Save the newPass object to a database (e.g., MongoDB, PostgreSQL).
    
    console.log('Received new pass request:', newPass);
    
    // Respond with a success message and a mock pass ID
    res.status(201).json({ 
        message: 'Pass request received successfully.', 
        passId: `GP-${Date.now() % 10000}`, // Mock pass ID
        data: newPass
    });
});


// --- Start Server ---
app.listen(PORT, () => {
    // This message confirms the server is running and is necessary for nodemon/npm run dev
    console.log(`CarparkApp server running at http://localhost:${PORT}`);
    console.log(`Frontend accessible at http://localhost:${PORT}/index.html`);
});