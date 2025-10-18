// app.js - CarparkApp Unified Frontend Logic (DEV MODE: Manager Access Granted)

// --- GLOBAL STATE ---
// HARDCODED MANAGER USER FOR DEVELOPMENT
// This bypasses the login screen for easy development access to all features.
let currentUser = { 
    token: "DEV_MODE_TOKEN_12345", 
    role: "Manager", 
    userId: 99, 
    username: "dev_manager"
}; 
const API_BASE = '/api';

// --- VIEW REFERENCES (Must match index.html IDs) ---
// Global/Auth
const loginView = document.getElementById('login-view'); // Note: This is now a null check in the HTML
const mainDashboard = document.getElementById('main-dashboard');
const logOutButton = document.getElementById('logout-btn');
const userInfoDisplay = document.getElementById('user-info-display');

// Tab Content Areas
const parkingPassesTab = document.getElementById('parking-passes-tab');
const visitorLogTab = document.getElementById('visitor-log-tab');
const towingViolationsTab = document.getElementById('towing-violations-tab');
const systemLogTab = document.getElementById('system-log-tab');
const userManagementTab = document.getElementById('user-management-tab');


// --- ROLE-BASED ACCESS CONTROL (RBAC) MAPPING ---
// Maps content area IDs to the minimum required role for access.
const restrictedTabs = {
    // Core functions visible to all logged-in users
    'parking-passes-tab': 'Guard', 
    'visitor-log-tab': 'Guard',
    'towing-violations-tab': 'Guard', 
    // Manager-only features
    'system-log-tab': 'Manager', 
    'user-management-tab': 'Manager',
};


// --- INITIALIZATION (UPDATED FOR DEV MODE) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach event listeners for logout
    if (logOutButton) {
        logOutButton.addEventListener('click', handleLogout);
    }
    
    // 2. Attach tab switching logic (moved from HTML)
    attachTabListeners();

    // 3. Go straight to the dashboard using the DEV MODE Manager user
    showDashboardView(); 
    
    // 4. Attach existing feature handlers 
    // Example: document.getElementById('pass-form').addEventListener('submit', handlePassSubmit);
});


// ----------------------------------------------------------------------------------
// ## AUTHENTICATION AND SESSION MANAGEMENT (DEV MODE STUBS)
// ----------------------------------------------------------------------------------

function showDashboardView() {
    // Show the dashboard and controls
    if (mainDashboard) mainDashboard.style.display = 'block';
    if (logOutButton) logOutButton.style.display = 'block';
    
    updateInterfacePermissions(); // Apply RBAC 
    
    // Select the default tab (Parking Passes) and fetch its data
    document.getElementById('parking-passes-tab').style.display = 'block';
    fetchActiveParkingPasses();
}

function handleLogout() {
    // Log out clears the DEV MODE user and session
    currentUser = null;
    sessionStorage.removeItem('carparkUser');
    if (userInfoDisplay) userInfoDisplay.textContent = ''; 
    
    // For a development environment without a proper login screen:
    alert('Logged out. Please reload the page to restart in DEV MODE.');

    // Manually hide the dashboard after logout
    if (mainDashboard) mainDashboard.style.display = 'none';
    if (logOutButton) logOutButton.style.display = 'none';
}


// ----------------------------------------------------------------------------------
// ## ROLE-BASED ACCESS CONTROL (RBAC) & TAB SWITCHING
// ----------------------------------------------------------------------------------

/**
 * Updates user info display and hides/shows management tabs based on role.
 */
function updateInterfacePermissions() {
    const userRole = currentUser ? currentUser.role : 'Guest';
    if (userInfoDisplay) {
        userInfoDisplay.textContent = `Logged in as: ${userRole} (DEV MODE)`;
    }

    // Apply visibility based on RBAC map
    document.querySelectorAll('.tab-content').forEach(tabElement => {
        const tabId = tabElement.id;
        const requiredRole = restrictedTabs[tabId];
        
        // Check if the current user meets the minimum required role
        const meetsRequirement = (
            (requiredRole === 'Guard' && (userRole === 'Guard' || userRole === 'Manager')) ||
            (requiredRole === 'Manager' && userRole === 'Manager')
        );

        // Initially hide content if it is restricted and the user doesn't meet the requirements.
        // In DEV MODE (Manager), all tabs are technically authorized, but we hide content initially
        // so only the first tab is visible.
        if (tabElement) {
            if (meetsRequirement) {
                // If authorized, the element is ready to be shown when selected
                tabElement.classList.remove('unauthorized');
            } else {
                 // Mark unauthorized tabs (app.js will prevent clicking them, but CSS can hide them)
                tabElement.classList.add('unauthorized'); 
            }
            tabElement.style.display = 'none'; // Ensure all tabs are hidden initially except the one shown in showDashboardView
        }
    });
}

/**
 * Handles tab navigation, permission checks, and data fetching for the selected tab.
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
            document.getElementById(tabId).style.display = 'block';

            // 4. Trigger data fetch for the selected tab
            switch (tabId) {
                case 'parking-passes-tab':
                    fetchActiveParkingPasses();
                    break;
                case 'visitor-log-tab':
                    // fetchVisitorLog();
                    break;
                case 'towing-violations-tab':
                    // InitializeViolationSearch();
                    break;
                case 'system-log-tab':
                    fetchSystemActivityLog(); // Manager function
                    break;
                case 'user-management-tab':
                    // fetchUserAccounts(); // Manager function
                    break;
            }
        });
    });
}


// ----------------------------------------------------------------------------------
// ## PROTECTED API UTILITY
// ----------------------------------------------------------------------------------

/**
 * Wrapper for all authenticated API calls. Adds required headers.
 */
async function fetchProtected(endpoint, options = {}) {
    if (!currentUser || !currentUser.token) {
        // This should not be hit in DEV MODE unless manually logged out.
        alert('Authentication error. Please reload.');
        handleLogout();
        throw new Error('User not authenticated.'); 
    }
    
    options.headers = options.headers || {};

    // Inject credentials into headers for server-side verification and logging
    options.headers['Content-Type'] = 'application/json';
    options.headers['Authorization'] = `Bearer ${currentUser.token}`; 
    options.headers['X-User-Role'] = currentUser.role;
    options.headers['X-User-Id'] = currentUser.userId;

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    // Handle authentication failures returned by the server
    if (response.status === 401 || response.status === 403) {
        console.error('Authorization failed:', response.status);
        alert('Permission Denied by Server. Logging out.');
        handleLogout(); 
        throw new Error('Authorization failed.'); 
    }

    return response;
}


// ----------------------------------------------------------------------------------
// ## CORE FEATURE LOGIC (Examples)
// ----------------------------------------------------------------------------------

/**
 * Example: Fetching active passes.
 */
async function fetchActiveParkingPasses() {
    try {
        const response = await fetchProtected('/passes'); 
        
        if (response.ok) {
            const passes = await response.json();
            // ... [Rendering passes to the parking passes table/view] ...
            console.log("DEV MODE: Successfully fetched passes:", passes.length);
        } else {
            console.error("Failed to fetch passes.");
        }
    } catch (e) {
        if (e.message !== 'Authorization failed.') {
            console.error("Request error:", e);
        }
    }
}

/**
 * Placeholder for fetching the system activity log (Manager access required).
 */
async function fetchSystemActivityLog() {
    try {
        const response = await fetchProtected('/logs/activity'); 
        
        if (response.ok) {
            const logs = await response.json();
            // ... [Rendering logs to the system log view] ...
            console.log("DEV MODE: Successfully fetched system logs.", logs.length);
        } else {
            console.error("Failed to fetch system logs.");
        }
    } catch (e) {
        // Error handling
    }
}