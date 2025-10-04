// renderer.js - Renderer Process
const { ipcRenderer } = require('electron');

let savedRequests = [];
let isRequesting = false;
let currentAuth = { type: 'none' };

// Load saved requests from localStorage
function loadSavedRequests() {
  try {
    const saved = localStorage.getItem('savedRequests');
    savedRequests = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading saved requests:', e);
    savedRequests = [];
  }
}

// Save requests to localStorage
function saveSavedRequests() {
  try {
    localStorage.setItem('savedRequests', JSON.stringify(savedRequests));
  } catch (e) {
    console.error('Error saving requests:', e);
  }
}

// Tab switching functionality
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const parent = tab.parentElement;
    const container = parent.nextElementSibling;
    const targetId = tab.dataset.tab;

    // Update tab active states
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update content active states
    container.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(targetId);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});

// Add header row
function addHeaderRow(key = '', value = '') {
  const headersList = document.getElementById('headersList');
  const row = document.createElement('div');
  row.className = 'header-row';
  row.innerHTML = `
    <input type="text" placeholder="Header name (e.g., Authorization)" value="${escapeHtml(key)}">
    <input type="text" placeholder="Header value" value="${escapeHtml(value)}">
    <button onclick="this.parentElement.remove()">Remove</button>
  `;
  headersList.appendChild(row);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add header button
document.getElementById('addHeaderBtn').addEventListener('click', () => {
  addHeaderRow();
});

// Initialize with Content-Type header
addHeaderRow('Content-Type', 'application/json');

// Send request button
document.getElementById('sendBtn').addEventListener('click', async () => {
  if (isRequesting) return;
  
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value.trim();
  const body = document.getElementById('requestBody').value.trim();

  if (!url) {
    alert('Please enter a URL');
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    alert('Please enter a valid URL (must include http:// or https://)');
    return;
  }

  // Collect headers
  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) {
      headers[key] = value;
    }
  });

  // Update UI to loading state
  isRequesting = true;
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  
  document.getElementById('statusBadge').innerHTML = 
    '<span class="status-badge status-info">Sending...</span>';
  document.getElementById('responseInfo').style.display = 'none';
  document.getElementById('responseBody').textContent = 'Waiting for response...';

  try {
    const response = await ipcRenderer.invoke('make-request', {
      method,
      url,
      headers,
      body: body || undefined
    });

    displayResponse(response);
  } catch (error) {
    displayError(error);
  } finally {
    isRequesting = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
});

// Display response
function displayResponse(response) {
  // Status badge
  let statusClass = 'status-info';
  if (response.error) {
    statusClass = 'status-error';
  } else if (response.status >= 200 && response.status < 300) {
    statusClass = 'status-success';
  } else if (response.status >= 400) {
    statusClass = 'status-error';
  }
  
  document.getElementById('statusBadge').innerHTML = 
    `<span class="status-badge ${statusClass}">${response.status} ${response.statusText}</span>`;

  // Response info
  const responseInfo = document.getElementById('responseInfo');
  responseInfo.style.display = 'flex';
  responseInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">Status:</span>
      <span>${response.status} ${response.statusText}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Time:</span>
      <span>${response.duration}ms</span>
    </div>
    <div class="info-item">
      <span class="info-label">Size:</span>
      <span>${formatBytes(response.size || response.data.length)}</span>
    </div>
  `;

  // Response body - try to format as JSON
  const responseBody = document.getElementById('responseBody');
  try {
    const parsed = JSON.parse(response.data);
    responseBody.textContent = JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON, display as-is
    responseBody.textContent = response.data || '(Empty response)';
  }

  // Response headers
  const responseHeaders = document.getElementById('responseHeaders');
  if (response.headers && Object.keys(response.headers).length > 0) {
    responseHeaders.textContent = JSON.stringify(response.headers, null, 2);
  } else {
    responseHeaders.textContent = '(No headers)';
  }
}

// Display error
function displayError(error) {
  document.getElementById('statusBadge').innerHTML = 
    '<span class="status-badge status-error">Error</span>';
  
  const responseInfo = document.getElementById('responseInfo');
  responseInfo.style.display = 'flex';
  responseInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">Error:</span>
      <span>${error.message || 'Unknown error'}</span>
    </div>
  `;
  
  document.getElementById('responseBody').textContent = 
    `Request failed:\n${error.message || error}`;
  document.getElementById('responseHeaders').textContent = '(No headers)';
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Save request button
document.getElementById('saveBtn').addEventListener('click', () => {
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value.trim();
  const body = document.getElementById('requestBody').value.trim();

  if (!url) {
    alert('Please enter a URL to save');
    return;
  }

  // Collect headers
  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) {
      headers[key] = value;
    }
  });

  // Generate default name
  const urlParts = url.split('/');
  const defaultName = `${method} ${urlParts[urlParts.length - 1] || urlParts[2] || 'request'}`;
  const name = prompt('Enter a name for this request:', defaultName);
  
  if (!name) return;

  // Save request
  savedRequests.push({
    id: Date.now(),
    name,
    method,
    url,
    headers,
    body
  });

  saveSavedRequests();
  renderSavedRequests();
  alert('Request saved successfully!');
});

// Render saved requests
function renderSavedRequests() {
  const list = document.getElementById('savedRequestsList');
  const savedTab = document.querySelector('.tab[data-tab="saved"]');
  
  // Update tab count
  savedTab.textContent = `Saved (${savedRequests.length})`;
  
  if (savedRequests.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved requests yet.<br>Save a request to access it later.</div>';
    return;
  }

  list.innerHTML = savedRequests.map(req => {
    const methodClass = `method-${req.method.toLowerCase()}`;
    return `
      <div class="saved-request">
        <div onclick="loadRequest(${req.id})" style="flex: 1; cursor: pointer;">
          <span class="saved-request-method ${methodClass}">${req.method}</span>
          <span>${escapeHtml(req.name)}</span>
        </div>
        <button class="delete-saved" onclick="deleteRequest(${req.id}); event.stopPropagation();">Delete</button>
      </div>
    `;
  }).join('');
}

// Load a saved request
window.loadRequest = (id) => {
  const req = savedRequests.find(r => r.id === id);
  if (!req) return;

  // Load method and URL
  document.getElementById('method').value = req.method;
  document.getElementById('url').value = req.url;
  document.getElementById('requestBody').value = req.body || '';

  // Clear and load headers
  document.getElementById('headersList').innerHTML = '';
  if (req.headers && Object.keys(req.headers).length > 0) {
    Object.entries(req.headers).forEach(([key, value]) => {
      addHeaderRow(key, value);
    });
  } else {
    addHeaderRow('Content-Type', 'application/json');
  }

  // Switch to headers tab
  document.querySelector('.tab[data-tab="headers"]').click();
};

// Delete a saved request
window.deleteRequest = (id) => {
  if (!confirm('Are you sure you want to delete this request?')) return;
  
  savedRequests = savedRequests.filter(r => r.id !== id);
  saveSavedRequests();
  renderSavedRequests();
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to send request
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    document.getElementById('sendBtn').click();
  }
});

// Initialize
loadSavedRequests();
renderSavedRequests();