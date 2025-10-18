
// backend/controllers/residentsController.js

// Placeholder array for resident data (to simulate a database)
let residents = [
    { unit: '101', name: 'John Doe', phone: '(555) 123-4567', email: 'john@example.com', primaryPlate: 'XYZ 789' },
    { unit: '205', name: 'Jane Smith', phone: '', email: 'jane@example.com', primaryPlate: 'ABC 123' }
];

/**
 * GET /api/residents
 * Sends back the list of all residents.
 */
exports.getAllResidents = (req, res) => {
    // FIX: Send the static resident data to the frontend
    res.json(residents);
};

/**
 * POST /api/residents
 * Creates a new resident or updates an existing one based on the unit.
 */
exports.createResident = (req, res) => {
    const { unit, name, phone, email, primaryPlate } = req.body;
    
    // Simple validation (can be expanded)
    if (!unit || !name || !primaryPlate) {
        return res.status(400).json({ message: 'Unit, Name, and Primary Plate are required.' });
    }

    const newResident = { unit, name, phone, email, primaryPlate: primaryPlate.toUpperCase() };

    // Placeholder: Check if resident already exists and update
    const index = residents.findIndex(r => r.unit === unit);

    if (index !== -1) {
        // Update existing resident
        residents[index] = newResident;
        return res.status(200).json({ message: `Resident for Unit ${unit} updated.`, resident: newResident });
    } else {
        // Create new resident
        residents.push(newResident);
        return res.status(201).json({ message: `Resident for Unit ${unit} created.`, resident: newResident });
    }
};

/**
 * GET /api/residents/search?query=...
 * Searches residents by plate, unit, or name.
 */
exports.searchResidents = (req, res) => {
    const query = req.query.query ? req.query.query.toLowerCase() : '';

    const results = residents.filter(r =>
        r.unit.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        r.primaryPlate.toLowerCase().includes(query)
    );

    res.json(results);
};


/**
 * DELETE /api/residents/:unit
 * Deletes a resident based on the unit number.
 */
exports.deleteResident = (req, res) => {
    const unitToDelete = req.params.unit;
    
    // Filter out the resident with the matching unit
    const initialLength = residents.length;
    residents = residents.filter(r => r.unit !== unitToDelete);

    if (residents.length < initialLength) {
        return res.status(200).json({ message: `Resident for Unit ${unitToDelete} deleted.` });
    } else {
        return res.status(404).json({ message: `Resident for Unit ${unitToDelete} not found.` });
    }
};