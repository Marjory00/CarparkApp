// app.js - CarparkApp Unified Frontend Logic (DEV MODE: Manager Access Granted)

// --- GLOBAL STATE ---
// HARDCODED MANAGER USER FOR DEVELOPMENT 
let currentUser = { 
    token: "DEV_MODE_TOKEN_12345", 
    role: "Manager", 
    userId: 99, // IMPORTANT: Used as issued_by ID in API calls
    username: "dev_manager"
}; 
const API_BASE = '/api';

// --- VIEW REFERENCES ---
// Global/Auth & Search
const mainDashboard = document.getElementById('main-dashboard');
const logOutButton = document.getElementById('logout-btn');
const userInfoDisplay = document.getElementById('user-info-display');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');

// Tab Content Areas
const parkingPassesTab = document.getElementById('parking-passes-tab');
const visitorLogTab = document.getElementById('visitor-log-tab');
const towingViolationsTab = document.getElementById('towing-violations-tab');
const residentManagementTab = document.getElementById('resident-management-tab');
const managementSectionTab = document.getElementById('management-section-tab'); // CONSOLIDATED MANAGER TAB

// Pass Management Specific
const passForm = document.getElementById('pass-form');
const activePassesTableBody = document.querySelector('#active-passes-table tbody');


// --- ROLE-BASED ACCESS CONTROL (RBAC) MAPPING ---
const restrictedTabs = {
    'parking-passes-tab': 'Guard', 
    'visitor-log-tab': 'Guard',
    'towing-violations-tab': 'Guard', 
    'resident-management-tab': 'Guard',
    'management-section-tab': 'Manager', 
};


// ----------------------------------------------------------------------------------
// ## INITIALIZATION & UTILITIES
// ----------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach event listeners
    if (logOutButton) {
        logOutButton.addEventListener('click', handleLogout);
    }
    
    // 2. Attach tab switching logic
    attachTabListeners();

    // 3. Attach feature form handlers
    document.getElementById('resident-form').addEventListener('submit', handleResidentSubmit);
    document.getElementById('gate-code-form').addEventListener('submit', handleGateCodeSubmit);
    
    // Attach Parking Pass Form Handler
    if (passForm) {
        passForm.addEventListener('submit', handlePassSubmit); 
    }

    // 4. Attach Global Search Listener (debounced for performance)
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', debounce(handleGlobalSearch, 300));
    }
    
    // 5. Initialize Sub-Tab Listeners
    attachSubTabListeners(); 

    // 6. Show the entire dashboard immediately
    showDashboardView(); 
});

/**
 * Debounce function to limit how often a function runs.
 */
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}


// ----------------------------------------------------------------------------------
// ## AUTHENTICATION AND TAB MANAGEMENT 
// ----------------------------------------------------------------------------------

function showDashboardView() {
    if (mainDashboard) mainDashboard.style.display = 'block';
    if (logOutButton) logOutButton.style.display = 'block';
    
    updateInterfacePermissions(); 
    
    // Select the default tab (Parking Passes)
    // Check if the element exists before accessing style
    if (document.getElementById('parking-passes-tab')) {
        document.getElementById('parking-passes-tab').style.display = 'block';
    }
    const defaultTabButton = document.querySelector('.tabs-nav .tab-button[data-tab="parking-passes-tab"]');
    if (defaultTabButton) {
        defaultTabButton.classList.add('active');
    }
    
    // Fetch initial data for the default tab
    fetchActiveParkingPasses();
    
    // Initialize default sub-tab state if Manager tab is visible
    if (currentUser.role === 'Manager') {
        const defaultSubTabButton = document.querySelector('.sub-tabs-nav .sub-tab-button[data-sub-tab="gate-codes-sub"]');
        if (defaultSubTabButton) {
            defaultSubTabButton.classList.add('active');
        }
    }
}

function handleLogout() {
    // Simulate a log out
    currentUser = null;
    alert('Logged out. Reload the page to reset DEV MODE access.');

    if (mainDashboard) mainDashboard.style.display = 'none';
    if (logOutButton) logOutButton.style.display = 'none';
    if (userInfoDisplay) userInfoDisplay.textContent = 'Logged Out';
}

function updateInterfacePermissions() {
    const userRole = currentUser ? currentUser.role : 'Guest';
    if (userInfoDisplay) {
        userInfoDisplay.textContent = `User: ${currentUser.username} | Role: ${userRole} (DEV MODE)`;
    }

    // Hide or show Manager tabs based on role
    document.querySelectorAll('.tab-button[data-tab="management-section-tab"]').forEach(btn => {
        btn.style.display = (userRole === 'Manager') ? 'inline-flex' : 'none';
    });
}

/**
 * Handles clicks on the main navigation tabs.
 */
function attachTabListeners() {
    document.querySelectorAll('.tabs-nav .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            const userRole = currentUser ? currentUser.role : 'Guest';
            const requiredRole = restrictedTabs[tabId];

            // 1. Permission Check
            const meetsRequirement = (
                (requiredRole === 'Guard' && (userRole === 'Guard' || userRole === 'Manager')) ||
                (requiredRole === 'Manager' && userRole === 'Manager')
            );

            if (!meetsRequirement) {
                alert(`Permission Denied: ${requiredRole} access required.`);
                return;
            }
            
            // 2. Update button styles
            document.querySelectorAll('.tabs-nav .tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 3. Toggle content visibility
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.style.display = 'block';
            }


            // 4. Trigger data fetch
            switch (tabId) {
                case 'parking-passes-tab':
                    fetchActiveParkingPasses();
                    break;
                case 'resident-management-tab':
                    fetchResidents();
                    break;
                case 'management-section-tab':
                    // On clicking the main Manager tab, switch to the default sub-tab (Gate Codes)
                    const gateCodesSub = document.getElementById('gate-codes-sub');
                    if (gateCodesSub) {
                        gateCodesSub.style.display = 'block';
                    }
                    // Deactivate and activate sub-tab buttons
                    document.querySelectorAll('.sub-tabs-nav .sub-tab-button').forEach(btn => btn.classList.remove('active'));
                    const gateCodesButton = document.querySelector('.sub-tabs-nav .sub-tab-button[data-sub-tab="gate-codes-sub"]');
                    if (gateCodesButton) {
                        gateCodesButton.classList.add('active');
                    }
                    fetchGateCodes(); 
                    break;
                case 'visitor-log-tab':
                    // fetchVisitorLog();
                    break;
                case 'towing-violations-tab':
                    // InitializeViolationSearch();
                    break;
            }
        });
    });
}

/**
 * Initializes listeners for the sub-tabs within the Management section.
 */
function attachSubTabListeners() {
    document.querySelectorAll('.sub-tabs-nav .sub-tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const subTabId = button.getAttribute('data-sub-tab');

            // 1. Update button styles
            document.querySelectorAll('.sub-tabs-nav .sub-tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 2. Toggle content visibility
            document.querySelectorAll('.sub-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const subTabElement = document.getElementById(subTabId);
            if (subTabElement) {
                 subTabElement.style.display = 'block';
            }
           
            
            // 3. Trigger data fetch for the selected sub-tab
            switch (subTabId) {
                case 'gate-codes-sub':
                    fetchGateCodes();
                    break;
                case 'reporting-sub':
                    fetchReportingData();
                    break;
                case 'system-log-sub':
                    fetchSystemActivityLog(); 
                    break;
                case 'user-management-sub':
                    // fetchUserAccounts();
                    break;
            }
        });
    });
    
    // Ensure the default sub-tab (Gate Codes) is shown on first load of the main Management tab
    const defaultSubTab = document.getElementById('gate-codes-sub');
    if(defaultSubTab) {
        defaultSubTab.style.display = 'block';
    }
}


// ----------------------------------------------------------------------------------
// ## PROTECTED API UTILITY 
// ----------------------------------------------------------------------------------

/**
 * Wrapper for all authenticated API calls.
 */
async function fetchProtected(endpoint, options = {}) {
    if (!currentUser || !currentUser.token) {
        alert('Authentication error. Please reload.');
        handleLogout();
        throw new Error('User not authenticated.'); 
    }
    
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/json';
    options.headers['Authorization'] = `Bearer ${currentUser.token}`; 
    options.headers['X-User-Role'] = currentUser.role;
    options.headers['X-User-Id'] = currentUser.userId; // Sent for issued_by tracking

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (response.status === 401 || response.status === 403) {
        console.error('Authorization failed:', response.status);
        alert('Permission Denied by Server. Logging out.');
        handleLogout(); 
        throw new Error('Authorization failed.'); 
    }

    return response;
}


// ----------------------------------------------------------------------------------
// ## CORE FEATURE LOGIC: PARKING PASSES 
// ----------------------------------------------------------------------------------

/**
 * Handles the submission of the Temporary Pass form.
 */
async function handlePassSubmit(event) {
    event.preventDefault();
    
    const plate = document.getElementById('pass-plate').value.trim().toUpperCase();
    const unit = document.getElementById('pass-unit').value.trim();
    const duration = parseInt(document.getElementById('pass-duration').value, 10);
    
    if (!plate || !unit || isNaN(duration) || duration <= 0) {
        alert("Please ensure all fields are valid.");
        return;
    }

    try {
        const response = await fetchProtected('/passes/issue', {
            method: 'POST',
            body: JSON.stringify({ plate, unit, duration })
        });

        const result = await response.json();

        if (result.success) {
            alert(`Pass issued for ${plate}! Expires: ${new Date(result.pass.expires_at).toLocaleString()}`);
            passForm.reset();
            // Refresh the table to show the new pass
            fetchActiveParkingPasses(); 
        } else {
            alert(`Failed to issue pass: ${result.message}`);
        }
    } catch (error) {
        console.error('Error in Pass Submission:', error);
        alert('An error occurred while connecting to the server.');
    }
}

/**
 * Fetches and renders all active parking passes.
 */
async function fetchActiveParkingPasses() {
    console.log("Fetching active parking passes...");
    
    try {
        const response = await fetchProtected('/passes/active');
        const data = await response.json();

        if (data.success && activePassesTableBody) {
            renderActivePasses(data.passes);
        } else {
            if(activePassesTableBody) {
                 activePassesTableBody.innerHTML = '<tr><td colspan="4">Failed to load passes.</td></tr>';
            }
           
        }

    } catch (error) {
        console.error("Error fetching active parking passes:", error);
         if(activePassesTableBody) {
            activePassesTableBody.innerHTML = '<tr><td colspan="4">Server connection failed. Ensure backend is running.</td></tr>';
         }
    }
}

/**
 * Renders the array of active passes into the table body.
 */
function renderActivePasses(passes) {
    if (!activePassesTableBody) return;
    activePassesTableBody.innerHTML = ''; // Clear existing rows
    
    if (passes.length === 0) {
        activePassesTableBody.innerHTML = '<tr><td colspan="4">No active temporary passes.</td></tr>';
        return;
    }
    
    passes.forEach(pass => {
        const expiresTime = new Date(pass.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expiresDate = new Date(pass.expires_at).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pass.plate}</td>
            <td>${pass.unit}</td>
            <td>${expiresDate} ${expiresTime}</td>
            <td>
                <button class="btn secondary-btn small-btn" data-id="${pass.id}" onclick="revokePass(${pass.id})">Revoke</button>
            </td>
        `;
        activePassesTableBody.appendChild(row);
    });
}

/**
 * Revokes (deletes) an active pass via the API.
 */
async function revokePass(passId) {
    if (!confirm(`Are you sure you want to revoke pass ID ${passId}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetchProtected(`/passes/revoke/${passId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            // Refresh the table to show the pass is gone
            fetchActiveParkingPasses(); 
        } else {
            alert(`Revocation failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Error during pass revocation:', error);
        alert('An error occurred while connecting to the server for revocation.');
    }
}

// ----------------------------------------------------------------------------------
// ## OTHER FEATURE PLACEHOLDERS (Unchanged)
// ----------------------------------------------------------------------------------

async function fetchResidents() {
    console.log("Fetching resident list...");
    // Fetch logic here...
}

async function handleResidentSubmit(event) {
    event.preventDefault();
    console.log("Submitting new/updated resident data...");
    // Submission logic here...
}

async function handleGlobalSearch() {
    console.log(`Global search triggered for: ${globalSearchInput.value}`);
    // Search logic here...
}


// --- Manager Features ---

async function fetchGateCodes() {
    console.log("Fetching active gate codes...");
    // Fetch logic here...
}

async function handleGateCodeSubmit(event) {
    event.preventDefault();
    console.log("Submitting new gate code...");
    // Submission logic here...
}

async function fetchReportingData() {
    console.log("Fetching reporting data...");
    
    // 1. Fetch Violation Summary
    try {
        const violationResponse = await fetchProtected('/reports/violation-summary');
        const violationData = await violationResponse.json();
        renderViolationSummary(violationData);
    } catch (error) {
        console.error('Error fetching violation summary:', error);
    }
    
    // 2. Fetch Pass Expiration Forecast
    try {
        const forecastResponse = await fetchProtected('/reports/pass-forecast');
        const forecastData = await forecastResponse.json();
        renderExpirationForecast(forecastData);
    } catch (error) {
        console.error('Error fetching pass forecast:', error);
    }
}

/**
 * Renders the violation summary data into the Reporting table.
 */
function renderViolationSummary(summary) {
    const tableBody = document.getElementById('violation-summary-body');
    if (!tableBody) return;
    
    const total = (summary.Towed || 0) + (summary.Booted || 0) + (summary.Warning || 0);
    
    const data = [
        { type: "Towed", count: summary.Towed || 0 },
        { type: "Booted", count: summary.Booted || 0 },
        { type: "Warning", count: summary.Warning || 0 }
    ];
    
    tableBody.innerHTML = data.map(item => `
        <tr>
            <td>${item.type}</td>
            <td>${item.count}</td>
            <td>${total > 0 ? ((item.count / total * 100).toFixed(1)) : 0}%</td>
        </tr>
    `).join('');
}

/**
 * Renders the pass expiration forecast data into the Reporting table.
 */
function renderExpirationForecast(forecast) {
    const tableBody = document.getElementById('expiration-forecast-table');
    if (!tableBody) return;
    const tbody = tableBody.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Clear previous data
    
    const today = new Date();
    const sevenDaysFromNow = today.getTime() + 7 * 24 * 60 * 60 * 1000;
    
    // The forecast data from the backend is assumed to be an array of objects
    const filteredForecast = forecast.filter(p => new Date(p.expires).getTime() < sevenDaysFromNow);

    if (filteredForecast.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No passes are expiring in the next 7 days.</td></tr>';
        return;
    }

    filteredForecast.forEach(pass => {
        const expiresDate = new Date(pass.expires);
        const daysLeft = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pass.plate}</td>
            <td>${pass.unit}</td>
            <td><span class="${daysLeft <= 3 ? 'danger-text' : ''}">${daysLeft} Days</span></td> 
        `; // FIX APPLIED HERE: Removed extra <td> 
        tbody.appendChild(row);
    });
}


async function fetchSystemActivityLog() {
    console.log("Fetching system activity log...");
    // Fetch logic here...
}