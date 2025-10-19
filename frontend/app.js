// CarparkApp/frontend/app.js

// --- Configuration ---
const API_BASE_URL = 'http://localhost:3000/api';

// --- State Variables ---
// FIX: Explicitly set default role to 'Manager' for full development access
let currentUserRole = 'Manager'; 
let isLoggedIn = false;

// --- Helper Functions ---

// NEW: Function to return the original HTML content of the Residents tab
function getResidentsHtml() {
    return `
        <h2><i class="fas fa-user-friends"></i> Resident Management</h2>

        <div class="card full-width resident-form-card">
            <h3>Add/Update Resident</h3>
            <form id="resident-form">
                <div class="form-grid">
                    <input type="text" id="resident-unit" placeholder="Unit Number (e.g., 101)" required>
                    <input type="text" id="resident-name" placeholder="Full Name" required>
                    <input type="text" id="resident-plate" placeholder="Primary Vehicle Plate" required>
                    <input type="tel" id="resident-phone" placeholder="Phone (Optional)">
                    <input type="email" id="resident-email" placeholder="Email (Optional)">
                </div>
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Save Resident</button>
            </form>
        </div>

        <div class="card full-width">
            <h3>All Registered Residents</h3>
            <table id="residents-table" class="data-table">
                <thead>
                    <tr>
                        <th>Unit</th>
                        <th>Name</th>
                        <th>Primary Plate</th>
                        <th>Contact</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    </tbody>
            </table>
        </div>
    `;
}

/**
 * Fetches data from the backend API.
 * @param {string} endpoint - The specific API route (e.g., '/passes/active').
 */
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        alert(`Could not connect to the server or fetch data: ${error.message}`);
        return null;
    }
}

/**
 * Renders the data into the specified table element.
 * @param {string} tableId - The ID of the <tbody> element to fill.
 * @param {Array} data - The array of objects to display.
 * @param {Function} rowMapper - Function to create the HTML string for one row.
 */
function renderTable(tableId, data, rowMapper) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody || !data) return;

    tbody.innerHTML = data.map(rowMapper).join('');
}

/**
 * Checks if the current user has permission to view the given tab.
 * @param {string} viewId - The ID of the view being accessed.
 * @returns {boolean}
 */
function checkPermission(viewId) {
    // Role logic: Manager can access everything; Guard cannot access 'residents' or 'management'.
    if (viewId === 'residents' && currentUserRole === 'Guard') {
        const residentsViewContainer = document.querySelector('#residents .view-container');
        if (residentsViewContainer) {
            // Display permission denied message
            residentsViewContainer.innerHTML = `
                <h2><i class="fas fa-lock"></i> Permission Denied</h2>
                <div class="card full-width permission-denied-message">
                    <p class="danger-text" style="font-size: 1.1rem; text-align: center;">
                        Your current role (${currentUserRole}) does not have access to Resident Management.
                    </p>
                </div>
            `;
        }
        return false;
    }
    return true; 
}


/**
 * Switches the active tab content based on the button clicked.
 * @param {string} targetTabId - The ID of the tab to display.
 */
function switchView(targetTabId) {
    // Hide all content and remove active class from all buttons
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show the target content and set the button as active
    const targetContent = document.getElementById(targetTabId);
    const targetButton = document.querySelector(`.tab-button[data-tab="${targetTabId}"]`);
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Refresh data for the view being opened (and perform permission check)
    if (targetTabId === 'passes') {
        loadActivePasses();
    } else if (targetTabId === 'residents') {
        if (checkPermission('residents')) {
            loadResidents();
        } 
    }
    // No action needed for dashboard, violations, contact, or management currently
}

// --- Data Loading Functions ---

async function loadDashboardStats() {
    document.getElementById('stat-active-passes').textContent = '15';
    document.getElementById('stat-violations').textContent = '3';
    document.getElementById('stat-expiring').textContent = '2';
    document.getElementById('stat-towed').textContent = '1';
}

async function loadActivePasses() {
    const passes = await fetchData('/passes/active');
    
    const rowMapper = (pass) => {
        const statusClass = new Date(pass.expires) < new Date() ? 'text-danger' : '';
        return `
            <tr class="${statusClass}">
                <td>${pass.plate}</td>
                <td>${pass.unit}</td>
                <td>${new Date(pass.issued).toLocaleTimeString()}</td>
                <td>${new Date(pass.expires).toLocaleString()}</td>
                <td class="action-buttons">
                    <button class="btn btn-danger btn-sm" onclick="revokePass('${pass.plate}')">Revoke</button>
                </td>
            </tr>
        `;
    };

    renderTable('active-passes-table', passes || [], rowMapper);
}

// Function to safely re-attach the resident form listener
function attachResidentFormListener() {
    const form = document.getElementById('resident-form');
    // Ensure the listener is only attached if the form exists
    if (form) {
        form.removeEventListener('submit', handleResidentFormSubmit); // Prevent duplicates
        form.addEventListener('submit', handleResidentFormSubmit);
    }
}

async function loadResidents() {
    // 1. **FIX:** If the role is Manager (access granted), explicitly restore the original HTML
    //    in case it was overwritten by a previous 'Permission Denied' state.
    if (currentUserRole === 'Manager') {
        const residentsViewContainer = document.querySelector('#residents .view-container');
        if (residentsViewContainer) {
            residentsViewContainer.innerHTML = getResidentsHtml();
            attachResidentFormListener(); // Re-attach listener after restoring HTML
        }
    }
    
    // 2. Perform permission check (This will display the error message and RETURN if 'Guard')
    if (!checkPermission('residents')) {
        return; 
    }
    
    // 3. Load data
    const residents = await fetchData('/residents');
    
    const rowMapper = (resident) => `
        <tr>
            <td>${resident.unit}</td>
            <td>${resident.name}</td>
            <td>${resident.primaryPlate}</td>
            <td>${resident.phone || 'N/A'}</td>
            <td class="action-buttons">
                <button class="btn btn-secondary btn-sm" onclick="editResident('${resident.unit}')">Edit</button>
            </td>
        </tr>
    `;

    renderTable('residents-table', residents || [], rowMapper);
}

// --- Action Handlers ---

// Placeholder function for resident form
async function handleResidentFormSubmit(event) {
    event.preventDefault();
    alert('Resident form submission handler triggered. (API call needed)');
    // Implementation for submitting resident data goes here
}

function handleLogin() {
    // Role is already set to 'Manager' at the top for guaranteed dev access.
    isLoggedIn = true;
    
    document.getElementById('user-role').textContent = `${currentUserRole} Portal`;

    const managementElements = document.querySelectorAll('.management-only');
    managementElements.forEach(el => {
        el.style.display = (currentUserRole === 'Manager') ? 'flex' : 'none';
    });

    switchView('dashboard');
    loadDashboardStats();
    loadActivePasses();
    
    // FIX: Call loadResidents here as well to ensure the initial table structure is populated
    // or the error is correctly shown on initial page load if the role was 'Guard'.
    loadResidents();
}

async function handlePassIssue(event) {
    event.preventDefault();
    const plate = document.getElementById('pass-plate').value.toUpperCase();
    const unit = document.getElementById('pass-unit').value;
    const duration = parseInt(document.getElementById('pass-duration').value);

    const response = await fetch(`${API_BASE_URL}/passes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plate, unit, duration }),
    });

    if (response.ok) {
        alert('Temporary pass issued successfully!');
        document.getElementById('temp-pass-form').reset();
        loadActivePasses(); // Reload data
    } else {
        const errorData = await response.json();
        alert(`Failed to issue pass: ${errorData.message}`);
    }
}

async function revokePass(plate) {
    if (confirm(`Are you sure you want to revoke the pass for plate ${plate}?`)) {
        const response = await fetch(`${API_BASE_URL}/passes/${plate}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert(`Pass for ${plate} revoked.`);
            loadActivePasses(); // Reload data
        } else {
            alert('Failed to revoke pass.');
        }
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State Check (Simulated Login)
    handleLogin(); 

    // 2. Attach Tab Switching Listeners
    document.querySelectorAll('.tabs-nav .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.getAttribute('data-tab'));
        });
    });

    // 3. Attach Form Submission Listeners (Attach ONLY once for forms in the initial DOM)
    document.getElementById('temp-pass-form').addEventListener('submit', handlePassIssue);
    // The resident form listener is now attached inside the loadResidents/restore logic.

    // 4. Attach Logout Listener
    document.getElementById('logout-button').addEventListener('click', () => {
        alert("Logged out. Restart application to log back in.");
        location.reload(); 
    });
});