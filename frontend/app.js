// frontend/app.js (The main client-side logic, communicating with Express backend)
document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const activeLog = document.getElementById('active-passes-list'); // UL element for passes
    const parkingForm = document.getElementById('parking-form');
    const passPreviewEl = document.getElementById('pass-preview-section');
    const visitorForm = document.getElementById('visitor-form'); 
    const visitorLogBody = document.getElementById('visitor-log-body');
    const noVisitorsMessage = document.getElementById('no-visitors');
    const noPassesMessage = document.getElementById('no-passes');
    
    // Set the base URL to match your Express server
    const apiBaseUrl = 'http://localhost:3000'; 
    
    // --- Utility Methods ---

    /**
     * Formats an ISO string date into a user-friendly local time string, 
     * showing month, day, and time (e.g., Oct 17, 8:25 PM).
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Clears and hides the digital pass preview section.
     */
    function clearPassPreview() {
        passPreviewEl.innerHTML = '';
        passPreviewEl.classList.remove('visible-preview');
        passPreviewEl.classList.add('hidden-preview');
    }
    
    /**
     * Renders a full digital parking pass preview.
     */
    function renderPassPreview(passData) {
        clearPassPreview();
        
        const expiryDisplay = formatTime(passData.expires); 
        const html = `
            <div class="pass-preview-header">
                <h4>CarparkApp Guest Parking Pass</h4>
                <i class="fas fa-ticket-alt"></i>
            </div>
            <div class="pass-detail-grid">
                <div class="detail">
                    <span class="label">VISITING UNIT:</span>
                    <strong>${passData.unit}</strong>
                </div>
                <div class="detail">
                    <span class="label">PASS ID:</span>
                    <strong>${passData.id}</strong>
                </div>
                <div class="detail">
                    <span class="label">VEHICLE PLATE:</span>
                    <strong>${passData.plate.toUpperCase()}</strong>
                </div>
                <div class="detail">
                    <span class="label">CAR MAKE/COLOR:</span>
                    <strong>N/A</strong> 
                </div>
            </div>
            <div class="expiry-time">
                <span class="label">VALID UNTIL:</span>
                <br>
                <strong>${expiryDisplay}</strong>
            </div>
        `;

        passPreviewEl.innerHTML = html;
        passPreviewEl.classList.remove('hidden-preview');
        passPreviewEl.classList.add('visible-preview');

        // Scroll to the preview to show the user the result
        passPreviewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- Parking Pass Logic (Data Fetch & Submission) ---

    async function fetchParkingData() {
        activeLog.innerHTML = '';
        noPassesMessage.textContent = 'Loading active passes...';

        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/log`);
            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }
            const data = await response.json();
            renderLog(data);
        } catch (error) {
            console.error('Error fetching parking data:', error);
            noPassesMessage.textContent = `Failed to load passes. Server Error.`;
        }
    }

    async function handlePassSubmission(e) {
        e.preventDefault();
        
        const plate = document.getElementById('plate').value.toUpperCase();
        const unit = document.getElementById('passUnit').value.trim();
        const duration = document.getElementById('passDuration').value; 
        
        if (!plate || !unit || !duration) {
            alert('Please enter plate number, unit visited, and duration.');
            return;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/parking/pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plate, unit, duration: duration }) 
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(`SUCCESS! Pass generated for plate ${result.pass.plate}. Expires: ${formatTime(result.pass.expires)}`);
                parkingForm.reset();
                
                fetchParkingData(); 
                renderPassPreview(result.pass);
            } else {
                alert(`ERROR: Could not generate pass. Server message: ${result.error || result.message}`);
            }

        } catch (error) {
            console.error('Error submitting pass:', error);
            alert('A network error occurred. Check the server connection and ensure it is running.');
        }
    }

    function renderLog(data) {
        activeLog.innerHTML = '';

        if (data.length === 0) {
            noPassesMessage.style.display = 'block';
            noPassesMessage.textContent = 'No active digital passes.';
            return;
        } else {
            noPassesMessage.style.display = 'none';
        }

        data.forEach(pass => {
            const formattedTime = formatTime(pass.expires);
            
            const listItem = document.createElement('li');
            listItem.className = 'pass-list-item';
            listItem.innerHTML = `
                <strong>PASS ACTIVE</strong> - Plate: ${pass.plate.toUpperCase()}<br>
                Unit Visting: ${pass.unit} | Expires: ${formattedTime}
            `;
            activeLog.appendChild(listItem);
        });
    }
    
    // --- Visitor Log Logic ---

    async function fetchVisitorLog() {
        visitorLogBody.innerHTML = '';
        noVisitorsMessage.style.display = 'block';
        noVisitorsMessage.textContent = 'Loading visitor log...';

        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/log`);
            const data = await response.json();
            renderVisitorLog(data);
        } catch (error) {
            console.error('Error fetching visitor log:', error);
            noVisitorsMessage.textContent = 'Failed to load visitor log.';
        }
    }

    function renderVisitorLog(data) {
        visitorLogBody.innerHTML = '';
        
        if (data.length === 0) {
            noVisitorsMessage.style.display = 'block';
            noVisitorsMessage.textContent = 'No visitors currently checked in.';
            return;
        }
        
        noVisitorsMessage.style.display = 'none';

        data.forEach(visitor => {
            const row = visitorLogBody.insertRow();
            row.dataset.id = visitor.id;
            
            if (visitor.checkOutTime) {
                row.classList.add('checked-out-row');
            }
            
            row.insertCell().textContent = visitor.name;
            row.insertCell().textContent = visitor.unit;
            row.insertCell().textContent = visitor.type;
            row.insertCell().textContent = formatTime(visitor.checkInTime);
            row.insertCell().textContent = visitor.checkOutTime ? formatTime(visitor.checkOutTime) : '—';
            
            const passesText = visitor.guestPass || '—';
            row.insertCell().textContent = passesText;

            const actionCell = row.insertCell();
            if (!visitor.checkOutTime) {
                const checkOutBtn = document.createElement('button');
                checkOutBtn.className = 'check-out-btn';
                checkOutBtn.textContent = 'Check Out';
                checkOutBtn.addEventListener('click', () => handleVisitorCheckOut(visitor.id)); 
                actionCell.appendChild(checkOutBtn);
            } else {
                actionCell.textContent = 'Completed';
            }
        });
    }

    async function handleVisitorCheckIn(e) {
        e.preventDefault();

        const newVisitorData = {
            name: document.getElementById('visitorName').value,
            unit: document.getElementById('unitName').value,
            type: document.getElementById('visitorType').value,
            guestPass: document.getElementById('guestPass').value.trim(),
            notes: document.getElementById('notes').value.trim(),
        };

        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVisitorData)
            });
            
            const result = await response.json();
            if (response.ok) {
                alert(`Visitor ${result.visitor.name} checked in successfully!`);
                visitorForm.reset();
                fetchVisitorLog(); 
            } else {
                alert(`Check-In Error: ${result.error || 'Check server console.'}`);
            }
        } catch (error) {
            console.error('Check-In network error:', error);
            alert('A network error occurred during check-in.');
        }
    }

    async function handleVisitorCheckOut(id) {
        if (!confirm("Are you sure you want to check out this visitor?")) return;
        
        try {
            const response = await fetch(`${apiBaseUrl}/api/visitor/checkout/${id}`, {
                method: 'PATCH',
            });
            
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                fetchVisitorLog(); 
            } else {
                alert(`Check-Out Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Check-Out network error:', error);
            alert('A network error occurred during check-out.');
        }
    }
    
    // --- LIVE UPDATES (Polling) ---

    function startPolling() {
        // Poll every 15 seconds to keep the pass log fresh
        setInterval(() => {
            const passesTab = document.querySelector('.tab-button[data-tab="passes"]');
            if (passesTab && passesTab.classList.contains('active')) {
                fetchParkingData();
            }
        }, 15000); 
    }


    // --- Event Handlers (Tab Switching & Modals) ---

    function handleTabSwitch(e) {
        const button = e.currentTarget;
        const tabId = button.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Refresh data based on the tab
        if (tabId === 'passes') {
            fetchParkingData(); 
            clearPassPreview();
        } else if (tabId === 'log') { 
            fetchVisitorLog();
            clearPassPreview();
        } else {
            clearPassPreview();
        }
    }

    function handleConciergeEmail(e) {
        e.preventDefault();
        const name = document.getElementById('modalName').value;
        const subject = document.getElementById('modalSubject').value;
        
        alert(`Message sent to Concierge! Received request: "${subject}" from ${name}.`);
        
        document.getElementById('concierge-email-form').reset();
        window.closeModal('concierge-modal');
    }

    // Global functions for modal control (must be global for HTML onclick)
    window.openModal = function(id) { document.getElementById(id).style.display = 'block'; };
    window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

    // --- Initialization and Binding ---
    
    // Bind Tab Switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', handleTabSwitch);
    });

    // Bind Form Submissions
    parkingForm.addEventListener('submit', handlePassSubmission);
    visitorForm.addEventListener('submit', handleVisitorCheckIn); 
    document.getElementById('concierge-email-form').addEventListener('submit', handleConciergeEmail);

    // Initial load: Determine which tab is active and load data
    const defaultTabId = document.querySelector('.tab-button.active')?.getAttribute('data-tab');
    if (defaultTabId === 'passes') {
         fetchParkingData();
    } else if (defaultTabId === 'log') {
        fetchVisitorLog(); 
    }
    
    startPolling(); // Start the live update
});