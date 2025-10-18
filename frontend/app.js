// frontend/app.js (The main client-side logic, communicating with Express backend)
document.addEventListener('DOMContentLoaded', () => {
    const activeLog = document.getElementById('active-passes-list'); // UL element for passes
    const loadingMessage = document.getElementById('loading-message'); // Note: This ID is not in the HTML provided, but is kept for robust future use.
    const parkingForm = document.getElementById('parking-form');
    const passPreviewEl = document.getElementById('pass-preview-section');
    
    // Set the base URL to match your Express server
    const apiBaseUrl = 'http://localhost:3000'; 
    
    // --- Utility Methods ---

    /**
     * Formats an ISO string date into a user-friendly local time string.
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
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
        clearPassPreview(); // Clear existing
        
        const expiryDisplay = formatTime(passData.expires);
        const html = `
            <div class="pass-preview-header">
                <h4>Wingstar Guest Parking Pass</h4>
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

    // --- 1. Fetch Data from Express API (GET) ---
    async function fetchParkingData() {
        activeLog.innerHTML = '';
        // If you add the loading message element later, uncomment this:
        // loadingMessage.style.display = 'block';

        try {
            // Fetch data from the Express backend route
            const response = await fetch(`${apiBaseUrl}/api/parking/log`);
            if (!response.ok) {
                throw new Error('Server responded with an error or API route is down.');
            }
            const data = await response.json();
            renderLog(data);
        } catch (error) {
            console.error('Error fetching parking data:', error);
            document.getElementById('no-passes').textContent = `Failed to load passes. Server Error: ${error.message}`;
        } finally {
            // loadingMessage.style.display = 'none';
        }
    }

    // --- 2. Post Data to Express API (POST) ---
    async function handlePassSubmission(e) {
        e.preventDefault();
        
        const plate = document.getElementById('plate').value.toUpperCase();
        const unit = document.getElementById('passUnit').value.trim();
        // NOTE: The server currently hardcodes 4 hours, so duration is ignored in the POST payload below.
        
        if (!plate || !unit) {
            alert('Please enter both plate number and unit visited.');
            return;
        }

        try {
            // Send only the required data (plate and unit) to the server
            const response = await fetch(`${apiBaseUrl}/api/parking/pass`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plate, unit })
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(`SUCCESS! Pass generated for plate ${result.pass.plate}.`);
                parkingForm.reset();
                
                // Refresh the log and show the preview
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

    // --- 3. Rendering Function ---
    function renderLog(data) {
        activeLog.innerHTML = '';
        const noPassesMessage = document.getElementById('no-passes');

        if (data.length === 0) {
            noPassesMessage.style.display = 'block';
            noPassesMessage.textContent = 'No active digital passes.';
            return;
        } else {
            noPassesMessage.style.display = 'none';
        }

        data.forEach(pass => {
            const expiryDate = new Date(pass.expires);
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

    // --- Event Handlers (Tab Switching & Modals) ---

    function handleTabSwitch(e) {
        const button = e.currentTarget;
        const tabId = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and content
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to the clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Refresh parking data when switching to the 'passes' tab
        if (tabId === 'passes') {
            fetchParkingData(); 
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
    document.getElementById('concierge-email-form').addEventListener('submit', handleConciergeEmail);

    // Initial load: Fetch passes (if passes tab is the default active one)
    if (document.querySelector('.tab-button[data-tab="passes"]').classList.contains('active')) {
         fetchParkingData();
    }
});

// Since the server-side handles the expiry cron job, we simplify the client-side passes logic significantly.