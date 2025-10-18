document.addEventListener('DOMContentLoaded', () => {
    // --- Global Configuration ---
    const apiBaseUrl = 'http://localhost:3000';

    // --- DOM Views & Controls ---
    const managementView = document.getElementById('management-view');
    const digitalPortal = document.getElementById('digital-portal');
    const portalLink = document.getElementById('portal-link');
    const managementLink = document.getElementById('management-link');

    // --- DOM Elements (Management) ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const passForm = document.getElementById('pass-form');
    const activeLog = document.getElementById('active-passes-list');
    const noPassesMessage = document.getElementById('no-passes-message');
    const previewSection = document.getElementById('pass-preview-section');
    const previewPlate = document.getElementById('preview-plate');
    const previewUnit = document.getElementById('preview-unit');
    const previewExpires = document.getElementById('preview-expires');
    const visitorForm = document.getElementById('visitor-form');
    const visitorLogTableBody = document.getElementById('visitor-log-body');
    const violationForm = document.getElementById('violation-form');
    const plateSearchForm = document.getElementById('plate-search-form');

    // --- DOM Elements (Portal) ---
    const portalLookupForm = document.getElementById('portal-lookup-form');
    const portalPlateInput = document.getElementById('portal-plate');
    const portalResultCard = document.getElementById('portal-result');


    // --- Utility Functions ---

    /**
     * Switches between the Management View and the Digital Portal View.
     */
    function switchView(viewName) {
        if (viewName === 'portal') {
            managementView.style.display = 'none';
            digitalPortal.style.display = 'block';
            portalResultCard.innerHTML = '<p class="neutral-message">Enter your plate number to verify your pass status.</p>';
            portalPlateInput.value = '';
        } else {
            managementView.style.display = 'block';
            digitalPortal.style.display = 'none';
            // Ensure data is fresh when returning to management
            switchTab('passes');
        }
    }

    /**
     * Switches the active management tab.
     */
    function switchTab(targetId) {
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.target === targetId) {
                button.classList.add('active');
            }
        });
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === targetId) {
                content.classList.add('active');
            }
        });

        if (targetId === 'passes') {
            fetchParkingData();
        } else if (targetId === 'visitor-log-tab') {
            fetchVisitorData();
        }
    }

    /**
     * Formats an ISO date string into a readable time.
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + date.toLocaleDateString();
    }


    // --- Parking Pass Logic (Management) ---

    async function fetchParkingData() {
        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/log`);
            const data = await response.json();
            if (response.ok) {
                renderLog(data);
            }
        } catch (error) {
            console.error('Network error fetching parking log:', error);
        }
    }

    function renderLog(data) {
        activeLog.innerHTML = '';
        noPassesMessage.style.display = data.length === 0 ? 'block' : 'none';

        data.forEach(pass => {
            const formattedTime = formatTime(pass.expires);
            
            const listItem = document.createElement('li');
            listItem.className = 'pass-list-item';
            listItem.innerHTML = `
                <div class="pass-info">
                    <strong>PASS ACTIVE</strong> (ID: ${pass.id}) - Plate: ${pass.plate.toUpperCase()}<br>
                    Unit Visting: ${pass.unit} | Expires: ${formattedTime}
                </div>
                <button class="revoke-btn" onclick="window.handlePassRevocation('${pass.id}')">
                    <i class="fas fa-times-circle"></i> Revoke
                </button>
            `;
            activeLog.appendChild(listItem);
        });
    }

    async function handlePassRevocation(passId) {
        if (!confirm(`Revoke parking pass ID: ${passId}?`)) return;

        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/pass/${passId}`, { method: 'DELETE' });
            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                fetchParkingData(); 
            } else {
                alert(`Revocation Error: ${result.message || result.error}`);
            }
        } catch (error) {
            alert('A network error occurred during pass revocation.');
        }
    }
    window.handlePassRevocation = handlePassRevocation; 

    passForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const plate = document.getElementById('pass-plate').value.trim();
        const unit = document.getElementById('pass-unit').value.trim();
        const duration = document.getElementById('pass-duration').value;

        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plate, unit, duration })
            });

            const data = await response.json();

            if (response.ok) {
                showPassPreview(data.pass);
                fetchParkingData();
                passForm.reset();
            } else {
                alert(`Error creating pass: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    });

    function showPassPreview(pass) {
        previewPlate.textContent = pass.plate;
        previewUnit.textContent = pass.unit;
        previewExpires.textContent = formatTime(pass.expires);

        previewSection.classList.remove('hidden-preview');
        previewSection.classList.add('visible-preview');

        setTimeout(() => {
            previewSection.classList.remove('visible-preview');
            previewSection.classList.add('hidden-preview');
        }, 8000);
    }


    // --- Visitor Log Logic (Management) ---

    async function fetchVisitorData() {
        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/log`);
            const data = await response.json();
            if (response.ok) {
                renderVisitorLog(data);
            }
        } catch (error) {
            console.error('Network error fetching visitor log:', error);
        }
    }

    function renderVisitorLog(visitors) {
        visitorLogTableBody.innerHTML = '';

        visitors.forEach(visitor => {
            const row = visitorLogTableBody.insertRow();
            
            if (visitor.checkOutTime) {
                row.classList.add('checked-out-row');
            }

            row.insertCell().textContent = visitor.name;
            row.insertCell().textContent = visitor.unit;
            row.insertCell().textContent = visitor.type;
            row.insertCell().textContent = formatTime(visitor.checkInTime);
            
            const actionCell = row.insertCell();

            if (!visitor.checkOutTime) {
                const checkoutButton = document.createElement('button');
                checkoutButton.textContent = 'Check Out';
                checkoutButton.className = 'check-out-btn';
                checkoutButton.onclick = () => handleCheckOut(visitor.id, visitor.name);
                actionCell.appendChild(checkoutButton);
            } else {
                actionCell.textContent = 'Completed';
            }
        });
    }

    visitorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('visitor-name').value.trim(),
            unit: document.getElementById('visitor-unit').value.trim(),
            type: document.getElementById('visitor-type').value,
            guestPass: document.getElementById('visitor-pass').value.trim() || null,
            notes: document.getElementById('visitor-notes').value.trim() || null
        };

        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Visitor ${data.visitor.name} checked in successfully.`);
                fetchVisitorData();
                visitorForm.reset();
            } else {
                alert(`Check-in Error: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    });

    async function handleCheckOut(visitorId, visitorName) {
        if (!confirm(`Confirm check-out for: ${visitorName}?`)) return;

        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/checkout/${visitorId}`, { method: 'PATCH' });
            const result = await response.json();

            if (response.ok) {
                alert(`Check-out successful for ${visitorName}.`);
                fetchVisitorData();
            } else {
                alert(`Check-out Error: ${result.message || result.error}`);
            }
        } catch (error) {
            alert('A network error occurred during check-out.');
        }
    }


    // --- Violation Log Logic (Management) ---

    violationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            plate: document.getElementById('violation-plate').value.trim(),
            reason: document.getElementById('violation-reason').value.trim(),
            action: document.getElementById('violation-action').value,
            notes: document.getElementById('violation-notes').value.trim() || null
        };
        
        try {
            const response = await fetch(`${apiBaseUrl}/api/violations/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Violation successfully recorded for plate: ${data.violation.plate}. Action: ${data.violation.action}`);
                violationForm.reset();
            } else {
                alert(`Error recording violation: ${data.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    });

    plateSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const plate = document.getElementById('search-plate').value.trim();
        if (!plate) return;

        document.getElementById('plate-history-results').innerHTML = `<p class="info-message">Searching history for **${plate.toUpperCase()}**...</p>`;

        try {
            const response = await fetch(`${apiBaseUrl}/api/violations/history/${plate}`);
            const history = await response.json();

            renderViolationHistory(plate, history);

        } catch (error) {
            document.getElementById('plate-history-results').innerHTML = '<p class="info-message error-message">Error retrieving history.</p>';
        }
    });

    function renderViolationHistory(plate, history) {
        const historyContainer = document.getElementById('plate-history-results');
        historyContainer.innerHTML = ''; // Clear previous results

        if (history.length === 0) {
            historyContainer.innerHTML = `<p class="info-message success-message">No violation history found for **${plate.toUpperCase()}**.</p>`;
            return;
        }

        let html = `<h3>Violation History for ${plate.toUpperCase()} (${history.length} records)</h3><ul id="violation-history-list">`;
        
        history.forEach(record => {
            let severityClass = (record.action === 'Towed' || record.action === 'Booted') ? 'severe-violation' : '';

            html += `
                <li class="violation-record">
                    <div class="violation-details ${severityClass}">
                        <span class="action-tag">${record.action.toUpperCase()}</span>
                        <strong>Reason:</strong> ${record.reason}<br>
                        Time: ${formatTime(record.timestamp)}<br>
                        Notes: ${record.notes || 'N/A'}
                    </div>
                </li>
            `;
        });
        html += `</ul>`;
        historyContainer.innerHTML = html;
    }

    // --- Digital Pass Lookup Portal Logic (NEW FEATURE) ---

    // New API route to check plate status (requires backend update, but we'll simulate for now)
    async function checkPlateStatus(plate) {
        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/lookup/${plate}`);
            return await response.json();
        } catch (error) {
            console.error('Lookup network error:', error);
            return { error: true, message: 'Server error during lookup.' };
        }
    }

    portalLookupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const plate = portalPlateInput.value.trim().toUpperCase();
        if (!plate) return;

        portalResultCard.className = 'portal-result-card neutral-message';
        portalResultCard.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Checking status...</p>';

        const result = await checkPlateStatus(plate);
        
        portalResultCard.className = 'portal-result-card'; // Reset classes
        
        if (result.error) {
            portalResultCard.classList.add('pass-not-found');
            portalResultCard.innerHTML = `
                <h4><i class="fas fa-exclamation-circle"></i> SYSTEM ERROR</h4>
                <p>${result.message}</p>
            `;
        } else if (result.pass) {
            // Found a pass, check expiry
            const isExpired = new Date(result.pass.expires) < new Date();
            
            if (isExpired) {
                portalResultCard.classList.add('pass-expired');
                portalResultCard.innerHTML = `
                    <div class="pass-details">
                        <h4><i class="fas fa-times-circle"></i> PASS EXPIRED</h4>
                        <p>Plate: <strong>${result.pass.plate}</strong></p>
                        <p>Associated Unit: <strong>${result.pass.unit}</strong></p>
                        <p>Expired: <strong>${formatTime(result.pass.expires)}</strong></p>
                        <p class="error-message">This vehicle is no longer authorized to park.</p>
                    </div>
                `;
            } else {
                portalResultCard.classList.add('pass-valid');
                portalResultCard.innerHTML = `
                    <div class="pass-details">
                        <h4><i class="fas fa-check-circle"></i> PASS IS VALID</h4>
                        <p>Plate: <strong>${result.pass.plate}</strong></p>
                        <p>Associated Unit: <strong>${result.pass.unit}</strong></p>
                        <p>Expires: <strong>${formatTime(result.pass.expires)}</strong></p>
                        <p class="success-message">Please ensure your vehicle is parked in an appropriate guest space.</p>
                    </div>
                `;
            }
        } else {
            // No pass found
            portalResultCard.classList.add('pass-not-found');
            portalResultCard.innerHTML = `
                <h4><i class="fas fa-minus-circle"></i> NO ACTIVE PASS FOUND</h4>
                <p>Plate: <strong>${plate}</strong></p>
                <p class="error-message">You must register for a digital pass immediately.</p>
            `;
        }
    });


    // --- Initialization ---
    
    // View switching links
    portalLink.addEventListener('click', () => switchView('portal'));
    managementLink.addEventListener('click', () => switchView('management'));

    // Tab switching event listeners
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.target);
        });
    });

    // Start in management view and fetch initial data
    switchView('management');
});