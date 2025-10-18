// backend/routes/residents.js

const express = require('express');
const router = express.Router();
// FIX: Ensure this path is correct and the controller exports functions
const residentsController = require('../controllers/residentsController'); 

// --- Resident Management Routes ---

// Line 12 (or close to it) is where the error originates.
// Ensure the controller method is correctly referenced here.
router.get('/', residentsController.getAllResidents); // Get all residents
router.post('/', residentsController.createResident); // Create new resident (Add/Update Resident form)
router.get('/search', residentsController.searchResidents); // Global search logic
router.delete('/:unit', residentsController.deleteResident); // Delete resident

module.exports = router;