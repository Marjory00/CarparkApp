// backend/routes/auth.js

const express = require('express');
const router = express.Router();

// --- Authentication Routes ---

// Placeholder Login route (e.g., POST /api/auth/login)
router.post('/login', (req, res) => {
    // This dummy response simulates a successful login. 
    // The frontend requires a 'role' to display the correct tabs.
    res.json({ 
        success: true, 
        message: "Login successful (Placeholder)", 
        user: { 
            username: "ManagerUser", 
            role: "Manager" // Setting to Manager ensures all tabs (including Management) are visible for testing
        } 
    });
});

// Placeholder Logout route (e.g., POST /api/auth/logout)
router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: "Logout successful" 
    });
});

module.exports = router;