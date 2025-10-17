class VisitorApp {
    constructor() {
        // Initialize state from local storage
        this.visitors = JSON.parse(localStorage.getItem('wingstarVisitors')) || [];
        this.parkingPasses = JSON.parse(localStorage.getItem('wingstarParkingPasses')) || [];

        this.bindEvents();
        this.renderVisitorLog();
        this.renderParkingPasses();
        this.clearPassPreview();
    }

    // --- Utility Methods ---

    /**
     * Saves the current visitor and parking pass arrays to local storage.
     */
    saveToLocalStorage() {
        localStorage.setItem('wingstarVisitors', JSON.stringify(this.visitors));
        localStorage.setItem('wingstarParkingPasses', JSON.stringify(this.parkingPasses));
    }

    /**
     * Formats an ISO string date into a user-friendly local time string.
     * @param {string} isoString - The ISO date string.
     * @returns {string} The formatted date/time string.
     */
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    
    // --- Pass Preview Logic ---

    /**
     * Clears and hides the digital pass preview section.
     */
    clearPassPreview() {
        const previewEl = document.getElementById('pass-preview-section');
        previewEl.innerHTML = '';
        previewEl.classList.remove('visible-preview');
        previewEl.classList.add('hidden-preview');
    }

    /**
     * Renders a full digital parking pass preview.
     * @param {object} passData - The data of the newly created pass.
     */
    renderPassPreview(passData) {
        const previewEl = document.getElementById('pass-preview-section');
        
        const expiryDisplay = this.formatTime(passData.expiryTime);
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
                    <strong>${passData.makeModel}</strong>
                </div>
            </div>
            <div class="expiry-time">
                <span class="label">VALID UNTIL:</span>
                <br>
                <strong>${expiryDisplay}</strong>
            </div>
        `;

        previewEl.innerHTML = html;
        previewEl.classList.remove('hidden-preview');
        previewEl.classList.add('visible-preview');

        // Scroll to the preview to show the user the result
        previewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- Event Binding & Tab Logic ---

    /**
     * Binds all necessary event listeners to the DOM elements.
     */
    bindEvents() {
        // Tab Switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', this.handleTabSwitch.bind(this));
        });

        // Form Submissions
        document.getElementById('visitor-form').addEventListener('submit', this.handleVisitorCheckIn.bind(this));
        document.getElementById('parking-form').addEventListener('submit', this.handlePassRequest.bind(this));
        
        // Concierge Email Form Submission
        document.getElementById('concierge-email-form').addEventListener('submit', this.handleConciergeEmail.bind(this));

        // Dynamic Check-Out (event delegation)
        document.getElementById('visitor-log-body').addEventListener('click', (e) => {
            if (e.target.classList.contains('check-out-btn')) {
                const id = parseInt(e.target.closest('tr').dataset.id);
                this.checkOutVisitor(id);
            }
        });
        
        // Close modals when clicking the backdrop
        window.addEventListener('click', (e) => {
            const conciergeModal = document.getElementById('concierge-modal');
            const supportModal = document.getElementById('app-support-modal');

            if (e.target === conciergeModal) {
                closeModal('concierge-modal');
            }
            if (e.target === supportModal) {
                closeModal('app-support-modal');
            }
        });
    }

    /**
     * Handles switching between the application tabs.
     * @param {Event} e - The click event.
     */
    handleTabSwitch(e) {
        const button = e.currentTarget;
        const tabId = button.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // IMPORTANT: Clear pass preview when switching to the Visitor Log tab
        this.clearPassPreview();
    }

    // --- Visitor Log Logic ---

    renderVisitorLog() {
        const logBody = document.getElementById('visitor-log-body');
        const noVisitorsMessage = document.getElementById('no-visitors');
        logBody.innerHTML = '';

        const activeVisitors = this.visitors.filter(v => !v.checkOutTime);
        const checkedOutVisitors = this.visitors.filter(v => v.checkOutTime).slice(0, 5); 
        const logEntries = [...activeVisitors, ...checkedOutVisitors];

        if (logEntries.length === 0) {
            noVisitorsMessage.style.display = 'block';
            return;
        } else {
            noVisitorsMessage.style.display = 'none';
        }

        logEntries.forEach(visitor => {
            const row = logBody.insertRow();
            row.dataset.id = visitor.id;
            
            if (visitor.checkOutTime) {
                row.classList.add('checked-out-row');
            }
            
            row.insertCell().textContent = visitor.name;
            row.insertCell().textContent = visitor.unit;
            row.insertCell().textContent = visitor.type;
            row.insertCell().textContent = this.formatTime(visitor.checkInTime);
            row.insertCell().textContent = visitor.checkOutTime ? this.formatTime(visitor.checkOutTime) : '—';
            
            const passesText = visitor.guestPass ? `Pass: ${visitor.guestPass}` : '—';
            row.insertCell().textContent = passesText;

            const actionCell = row.insertCell();
            if (!visitor.checkOutTime) {
                const checkOutBtn = document.createElement('button');
                checkOutBtn.className = 'check-out-btn';
                checkOutBtn.textContent = 'Check Out';
                actionCell.appendChild(checkOutBtn);
            } else {
                actionCell.textContent = 'Completed';
            }
        });
    }

    handleVisitorCheckIn(e) {
        e.preventDefault();

        const newVisitor = {
            id: Date.now(),
            name: document.getElementById('visitorName').value,
            unit: document.getElementById('unitName').value,
            type: document.getElementById('visitorType').value,
            guestPass: document.getElementById('guestPass').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            checkInTime: new Date().toISOString(),
            checkOutTime: null
        };

        this.visitors.unshift(newVisitor); 
        this.saveToLocalStorage();
        this.renderVisitorLog();

        e.target.reset();
        alert(`Visitor ${newVisitor.name} checked in successfully!`);
    }

    checkOutVisitor(id) {
        const visitorIndex = this.visitors.findIndex(v => v.id === id);
        if (visitorIndex !== -1 && !this.visitors[visitorIndex].checkOutTime) {
            this.visitors[visitorIndex].checkOutTime = new Date().toISOString();
            this.saveToLocalStorage();
            this.renderVisitorLog();
            alert(`Visitor ${this.visitors[visitorIndex].name} checked out.`);
        }
    }

    // --- Parking Pass Logic ---

    renderParkingPasses() {
        const activePassesList = document.getElementById('active-passes-list');
        const noPassesMessage = document.getElementById('no-passes');
        activePassesList.innerHTML = '';
        const now = Date.now();
        
        // Filter out expired passes and update state
        this.parkingPasses = this.parkingPasses.filter(p => new Date(p.expiryTime).getTime() > now);
        this.saveToLocalStorage();

        if (this.parkingPasses.length === 0) {
            noPassesMessage.style.display = 'block';
            return;
        } else {
            noPassesMessage.style.display = 'none';
        }

        this.parkingPasses.forEach(pass => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>PASS ACTIVE</strong> - Plate: ${pass.plate.toUpperCase()}
                (Vehicle: ${pass.makeModel})<br>
                Unit Visting: ${pass.unit} | Expires: ${this.formatTime(pass.expiryTime)}
            `;
            activePassesList.appendChild(listItem);
        });
    }

    handlePassRequest(e) {
        e.preventDefault();

        const duration = parseInt(document.getElementById('passDuration').value, 10);
        // Calculate expiry time (duration is in hours)
        const expiryTime = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

        const newPass = {
            id: Date.now(),
            plate: document.getElementById('plate').value.trim(),
            makeModel: document.getElementById('makeModel').value.trim(),
            unit: document.getElementById('passUnit').value.trim(),
            duration: duration,
            expiryTime: expiryTime
        };

        this.parkingPasses.unshift(newPass);
        this.saveToLocalStorage();
        this.renderParkingPasses();
        
        this.renderPassPreview(newPass);

        e.target.reset();
    }
    
    // --- Modal Contact Logic ---

    handleConciergeEmail(e) {
        e.preventDefault();
        
        const name = document.getElementById('modalName').value;
        const subject = document.getElementById('modalSubject').value;
        
        console.log("Concierge Email Submitted:", { name, subject });

        alert(`Message sent to Concierge! We received your request: "${subject}" from ${name}. We will respond soon to your email.`);
        
        document.getElementById('concierge-email-form').reset();
        closeModal('concierge-modal');
    }
}

// Global functions for modal control (called directly from HTML onclick attributes)
function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make global functions available to the browser's window object for HTML onclick
    window.openModal = openModal;
    window.closeModal = closeModal;
    
    new VisitorApp();
});