// backend/routes/passes.js

const express = require('express');
const router = express.Router();
// Placeholder data for active passes
const activePasses = [];

// --- Parking Passes Routes ---

// GET /api/passes/active - Get all active passes
router.get('/active', (req, res) => {
    // Send back the placeholder data
    res.json(activePasses);
});

// POST /api/passes - Issue a new temporary pass
router.post('/', (req, res) => {
    // Simulate pass creation (we don't need real logic yet)
    const { plate, unit, duration } = req.body;
    
    if (!plate || !unit || !duration) {
        return res.status(400).json({ message: 'Missing pass details.' });
    }

    const newPass = {
        id: Date.now(),
        plate: plate.toUpperCase(),
        unit: unit,
        expires: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
    };
    
    activePasses.push(newPass);
    
    res.status(201).json({ 
        message: "Temporary pass issued.", 
        pass: newPass 
    });
});

// DELETE /api/passes/:plate - Revoke a pass (e.g., from the table)
router.delete('/:plate', (req, res) => {
    // Simulate deletion
    res.json({ message: `Pass for plate ${req.params.plate.toUpperCase()} revoked.` });
});


module.exports = router;