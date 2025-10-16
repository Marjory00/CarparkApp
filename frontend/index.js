document.addEventListener('DOMContentLoaded', () => {
  const visitorForm = document.getElementById('visitor-form');
  const parkingForm = document.getElementById('parking-form');
  const logBody = document.getElementById('visitor-log-body');
  const activePassesList = document.getElementById('active-passes-list');
  const noVisitorsMessage = document.getElementById('no-visitors');
  const noPassesMessage = document.getElementById('no-passes');
  
  // Initialize storage for two feature sets
  let visitors = JSON.parse(localStorage.getItem('apolloVisitors')) || [];
  let parkingPasses = JSON.parse(localStorage.getItem('apolloParkingPasses')) || [];

  // --- Utility Functions ---

  const saveToLocalStorage = () => {
    localStorage.setItem('apolloVisitors', JSON.stringify(visitors));
    localStorage.setItem('apolloParkingPasses', JSON.stringify(parkingPasses));
  };

  const formatTime = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // --- Tab Logic ---
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Remove 'active' from all buttons and contents
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add 'active' to the clicked button and corresponding content
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // --- Visitor Log Logic (Updated) ---

  const renderVisitorLog = () => {
    logBody.innerHTML = '';
    const activeVisitors = visitors.filter(v => !v.checkOutTime);
    // Show active visitors first, followed by the last 5 checked out visitors
    const checkedOutVisitors = visitors.filter(v => v.checkOutTime).slice(0, 5); 

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
      
      // Cells
      row.insertCell().textContent = visitor.name;
      row.insertCell().textContent = visitor.unit;
      row.insertCell().textContent = visitor.type;
      row.insertCell().textContent = formatTime(new Date(visitor.checkInTime));
      row.insertCell().textContent = visitor.checkOutTime ? formatTime(new Date(visitor.checkOutTime)) : '—';
      
      // Passes and Notes are combined for a clean table view
      const passesText = [visitor.guestPass ? `GP: ${visitor.guestPass}` : null].filter(Boolean).join(' / ') || '—';
      row.insertCell().textContent = passesText;

      // Action button
      const actionCell = row.insertCell();
      if (!visitor.checkOutTime) {
        const checkOutBtn = document.createElement('button');
        checkOutBtn.className = 'check-out-btn';
        checkOutBtn.textContent = 'Check Out';
        checkOutBtn.addEventListener('click', () => checkOutVisitor(visitor.id));
        actionCell.appendChild(checkOutBtn);
      } else {
        actionCell.textContent = 'Completed';
      }
    });
  };

  visitorForm.addEventListener('submit', (e) => {
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

    visitors.unshift(newVisitor); 
    saveToLocalStorage();
    renderVisitorLog();

    visitorForm.reset();
  });

  const checkOutVisitor = (id) => {
    const visitorIndex = visitors.findIndex(v => v.id === id);
    if (visitorIndex !== -1 && !visitors[visitorIndex].checkOutTime) {
      visitors[visitorIndex].checkOutTime = new Date().toISOString();
      saveToLocalStorage();
      renderVisitorLog();
    }
  };

  // --- Parking Pass Logic (New Feature) ---

  const renderParkingPasses = () => {
    activePassesList.innerHTML = '';
    const now = Date.now();
    
    // Filter out expired passes
    parkingPasses = parkingPasses.filter(p => new Date(p.expiryTime).getTime() > now);
    saveToLocalStorage();

    if (parkingPasses.length === 0) {
        noPassesMessage.style.display = 'block';
        return;
    } else {
        noPassesMessage.style.display = 'none';
    }

    parkingPasses.forEach(pass => {
      const listItem = document.createElement('li');
      const expiry = new Date(pass.expiryTime);
      listItem.innerHTML = `
        <strong>PASS ACTIVE - Plate: ${pass.plate.toUpperCase()}</strong>
        (Vehicle: ${pass.makeModel})<br>
        Unit Visting: ${pass.unit} | Expires: ${formatTime(expiry)}
      `;
      activePassesList.appendChild(listItem);
    });
  };

  parkingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const duration = parseInt(document.getElementById('passDuration').value, 10);
    const expiryTime = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(); // Current time + duration hours

    const newPass = {
      id: Date.now(),
      plate: document.getElementById('plate').value.trim(),
      makeModel: document.getElementById('makeModel').value.trim(),
      unit: document.getElementById('passUnit').value.trim(),
      duration: duration,
      expiryTime: expiryTime
    };

    parkingPasses.unshift(newPass);
    saveToLocalStorage();
    renderParkingPasses();

    alert(`Digital Parking Pass Requested! Plate ${newPass.plate.toUpperCase()} is valid until ${formatTime(new Date(expiryTime))}.`);
    parkingForm.reset();
  });


  // --- Initial Setup ---
  renderVisitorLog();
  renderParkingPasses();
});