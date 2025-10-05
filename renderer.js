// renderer.js - Renderer Process
const { ipcRenderer } = require('electron');

// State
let collections = [];
let savedRequests = [];
let expandedCollections = new Set();
let activeRequestId = null;
let isRequesting = false;

console.log('=== Renderer script loaded ===');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('=== DOM ready ===');
  initializeApp();
});

function initializeApp() {
  console.log('Initializing app...');
  
  // Load data from localStorage
  loadCollections();
  loadSavedRequests();
  
  console.log('Collections loaded:', collections);
  console.log('Requests loaded:', savedRequests);
  
  // Setup sidebar event listeners first (these stay persistent)
  setupSidebarListeners();
  
  // Check if we need onboarding
  if (collections.length === 0) {
    showOnboarding();
  } else {
    showMainApp();
    renderSidebar();
  }
}

// ============================================
// SIDEBAR LISTENERS (PERSISTENT)
// ============================================

function setupSidebarListeners() {
  console.log('Setting up sidebar listeners');
  
  const newCollectionBtn = document.getElementById('newCollectionBtn');
  if (newCollectionBtn) {
    newCollectionBtn.onclick = function() {
      console.log('New collection button clicked');
      const name = prompt('Enter collection name:');
      if (!name || !name.trim()) return;
      
      const newCollection = {
        id: Date.now(),
        name: name.trim()
      };
      
      collections.push(newCollection);
      expandedCollections.add(newCollection.id);
      
      console.log('Collection created:', newCollection);
      saveCollections();
      renderSidebar();
    };
  }
}

// ============================================
// ONBOARDING SCREEN
// ============================================

function showOnboarding() {
  console.log('Showing onboarding');
  
  const mainArea = document.querySelector('.main-area');
  mainArea.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #1e1e1e;">
      <div style="text-align: center; max-width: 500px; padding: 40px;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">🚀</h1>
        <h2 style="font-size: 24px; margin-bottom: 15px; color: #fff;">Welcome to PacketMan</h2>
        <p style="color: #888; margin-bottom: 30px; line-height: 1.6;">
          Let's get started by creating your first collection. Collections help you organize your API requests.
        </p>
        <div style="margin-bottom: 20px;">
          <input type="text" id="onboardingCollectionName" placeholder="Enter collection name (e.g., My API)" 
                 style="width: 100%; padding: 15px; font-size: 16px; background: #3c3c3c; border: 1px solid #555; color: #d4d4d4; border-radius: 4px;">
        </div>
        <button id="createFirstCollection" style="background: #0e639c; color: white; border: none; padding: 15px 40px; font-size: 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">
          Create Collection & Start
        </button>
        <p style="color: #666; margin-top: 20px; font-size: 12px;">
          You can create more collections later from the sidebar.
        </p>
      </div>
    </div>
  `;
  
  // Setup onboarding listeners
  setTimeout(() => {
    const btn = document.getElementById('createFirstCollection');
    const input = document.getElementById('onboardingCollectionName');
    
    if (btn) {
      btn.onclick = function() {
        const name = input.value.trim();
        if (!name) {
          alert('Please enter a collection name');
          input.focus();
          return;
        }
        
        const newCollection = {
          id: Date.now(),
          name: name
        };
        
        collections.push(newCollection);
        expandedCollections.add(newCollection.id);
        
        console.log('First collection created:', newCollection);
        saveCollections();
        
        showMainApp();
        renderSidebar();
      };
    }
    
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          btn.click();
        }
      });
      input.focus();
    }
  }, 100);
}

// ============================================
// MAIN APP SCREEN
// ============================================

function showMainApp() {
  console.log('Showing main app');
  
  const mainArea = document.querySelector('.main-area');
  mainArea.innerHTML = `
    <div class="request-section">
      <div class="url-bar">
        <select id="method">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
        <input type="text" id="url" placeholder="https://jsonplaceholder.typicode.com/posts/1">
        <button id="sendBtn">Send</button>
        <button id="saveBtn" style="background: #5a5a5a;">Save</button>
      </div>
    </div>

    <div class="main-content">
      <div class="request-panel">
        <div class="panel-header">Request Configuration</div>
        <div class="tabs">
          <button class="tab active" data-tab="headers">Headers</button>
          <button class="tab" data-tab="body">Body</button>
        </div>
        <div class="panel-content">
          <div id="headers" class="tab-content active">
            <div id="headersList"></div>
            <button class="add-header-btn" id="addHeaderBtn">+ Add Header</button>
          </div>
          <div id="body" class="tab-content">
            <textarea id="requestBody" placeholder='Enter request body (JSON, XML, text, etc.)&#10;&#10;Example:&#10;{&#10;  "title": "foo",&#10;  "body": "bar",&#10;  "userId": 1&#10;}'></textarea>
          </div>
        </div>
      </div>

      <div class="response-panel">
        <div class="panel-header">
          <span>Response</span>
          <div id="statusBadge"></div>
        </div>
        <div class="tabs">
          <button class="tab active" data-tab="response-body">Body</button>
          <button class="tab" data-tab="response-headers">Headers</button>
        </div>
        <div class="panel-content">
          <div id="response-body" class="tab-content active">
            <div class="response-info" id="responseInfo" style="display: none;"></div>
            <pre id="responseBody">Click "Send" to make a request and see the response here.

Try this test endpoint:
GET https://jsonplaceholder.typicode.com/posts/1</pre>
          </div>
          <div id="response-headers" class="tab-content">
            <pre id="responseHeaders">Response headers will appear here after sending a request.</pre>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Setup main app listeners
  setTimeout(() => {
    setupMainAppListeners();
    addHeaderRow('Content-Type', 'application/json');
  }, 100);
}

function setupMainAppListeners() {
  console.log('Setting up main app listeners');
  
  // Send button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.onclick = sendRequest;
    console.log('Send button listener attached');
  }
  
  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.onclick = saveRequest;
    console.log('Save button listener attached');
  }
  
  // Add header button
  const addHeaderBtn = document.getElementById('addHeaderBtn');
  if (addHeaderBtn) {
    addHeaderBtn.onclick = function() {
      addHeaderRow();
    };
    console.log('Add header button listener attached');
  }
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = function() {
      const parent = tab.parentElement;
      const container = parent.nextElementSibling;
      const targetId = tab.dataset.tab;

      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      container.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    };
  });
  
  console.log('Tab listeners attached');
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

function loadCollections() {
  try {
    const saved = localStorage.getItem('packetman_collections');
    console.log('Loading from localStorage:', saved);
    
    if (saved) {
      collections = JSON.parse(saved);
      console.log('Parsed collections:', collections);
    } else {
      collections = [];
      console.log('No saved collections found');
    }
  } catch (e) {
    console.error('Error loading collections:', e);
    collections = [];
  }
}

function saveCollections() {
  try {
    const json = JSON.stringify(collections);
    localStorage.setItem('packetman_collections', json);
    console.log('Saved to localStorage:', json);
    
    // Verify save
    const verify = localStorage.getItem('packetman_collections');
    console.log('Verification:', verify);
  } catch (e) {
    console.error('Error saving collections:', e);
    alert('Failed to save collection: ' + e.message);
  }
}

function loadSavedRequests() {
  try {
    const saved = localStorage.getItem('packetman_requests');
    if (saved) {
      savedRequests = JSON.parse(saved);
    } else {
      savedRequests = [];
    }
  } catch (e) {
    console.error('Error loading requests:', e);
    savedRequests = [];
  }
}

function saveSavedRequests() {
  try {
    const json = JSON.stringify(savedRequests);
    localStorage.setItem('packetman_requests', json);
    console.log('Requests saved:', json);
  } catch (e) {
    console.error('Error saving requests:', e);
    alert('Failed to save request: ' + e.message);
  }
}

// ============================================
// SIDEBAR RENDERING
// ============================================

function renderSidebar() {
  console.log('Rendering sidebar with', collections.length, 'collections');
  
  const sidebar = document.getElementById('sidebarContent');
  if (!sidebar) {
    console.error('Sidebar element not found!');
    return;
  }
  
  if (collections.length === 0) {
    sidebar.innerHTML = '<div class="empty-state">No collections yet.<br>Create one to get started!</div>';
    return;
  }
  
  let html = '';
  
  collections.forEach(collection => {
    const isExpanded = expandedCollections.has(collection.id);
    const collectionRequests = savedRequests.filter(r => r.collectionId === collection.id);
    
    html += '<div class="collection-item">';
    html += '  <div class="collection-header ' + (isExpanded ? 'expanded' : '') + '" onclick="window.toggleCollection(' + collection.id + ')">';
    html += '    <span class="collection-icon ' + (isExpanded ? 'expanded' : '') + '">▶</span>';
    html += '    <span class="collection-name">' + escapeHtml(collection.name) + '</span>';
    html += '    <div class="collection-actions">';
    html += '      <button class="icon-btn" onclick="event.stopPropagation(); window.addRequestToCollection(' + collection.id + ')" title="Add Current Request">+</button>';
    html += '      <button class="icon-btn" onclick="event.stopPropagation(); window.renameCollection(' + collection.id + ')" title="Rename">✎</button>';
    html += '      <button class="icon-btn" onclick="event.stopPropagation(); window.deleteCollection(' + collection.id + ')" title="Delete">×</button>';
    html += '    </div>';
    html += '  </div>';
    
    html += '  <div class="request-list ' + (isExpanded ? 'expanded' : '') + '">';
    
    if (collectionRequests.length === 0) {
      html += '<div class="empty-state" style="padding: 15px; font-size: 11px;">No requests yet. Click + above to add one.</div>';
    } else {
      collectionRequests.forEach(req => {
        const methodColors = {
          GET: '#61affe', POST: '#49cc90', PUT: '#fca130',
          PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7'
        };
        const color = methodColors[req.method] || '#888';
        const isActive = activeRequestId === req.id;
        
        html += '<div class="request-item ' + (isActive ? 'active' : '') + '" onclick="window.loadRequest(' + req.id + ')">';
        html += '  <div class="request-method" style="background: ' + color + '; color: #000;">' + req.method + '</div>';
        html += '  <div class="request-name">' + escapeHtml(req.name) + '</div>';
        html += '  <button class="icon-btn" onclick="event.stopPropagation(); window.deleteRequest(' + req.id + ')" title="Delete">×</button>';
        html += '</div>';
      });
    }
    
    html += '  </div>';
    html += '</div>';
  });
  
  sidebar.innerHTML = html;
  console.log('Sidebar rendered');
}

// ============================================
// WINDOW FUNCTIONS (for onclick)
// ============================================

window.toggleCollection = function(collectionId) {
  console.log('Toggle collection:', collectionId);
  if (expandedCollections.has(collectionId)) {
    expandedCollections.delete(collectionId);
  } else {
    expandedCollections.add(collectionId);
  }
  renderSidebar();
};

window.renameCollection = function(collectionId) {
  console.log('Rename collection:', collectionId);
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;
  
  const newName = prompt('Enter new name:', collection.name);
  if (!newName || !newName.trim()) return;
  
  collection.name = newName.trim();
  saveCollections();
  renderSidebar();
};

window.deleteCollection = function(collectionId) {
  console.log('Delete collection:', collectionId);
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;
  
  const requestCount = savedRequests.filter(r => r.collectionId === collectionId).length;
  const message = requestCount > 0
    ? 'Delete "' + collection.name + '" and its ' + requestCount + ' request(s)?'
    : 'Delete "' + collection.name + '"?';
  
  if (!confirm(message)) return;
  
  collections = collections.filter(c => c.id !== collectionId);
  savedRequests = savedRequests.filter(r => r.collectionId !== collectionId);
  expandedCollections.delete(collectionId);
  
  saveCollections();
  saveSavedRequests();
  
  if (collections.length === 0) {
    showOnboarding();
  } else {
    renderSidebar();
  }
};

window.addRequestToCollection = function(collectionId) {
  console.log('Add request to collection:', collectionId);
  
  const method = document.getElementById('method');
  const url = document.getElementById('url');
  const body = document.getElementById('requestBody');
  
  if (!method || !url || !body) {
    alert('Please make sure you have the main app loaded');
    return;
  }
  
  const urlValue = url.value.trim();
  if (!urlValue) {
    alert('Please enter a URL first');
    return;
  }
  
  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) headers[key] = value;
  });
  
  const urlParts = urlValue.split('/');
  const defaultName = method.value + ' ' + (urlParts[urlParts.length - 1] || urlParts[2] || 'request');
  const name = prompt('Enter request name:', defaultName);
  
  if (!name || !name.trim()) return;
  
  const newRequest = {
    id: Date.now(),
    collectionId: collectionId,
    name: name.trim(),
    method: method.value,
    url: urlValue,
    headers: headers,
    body: body.value.trim()
  };
  
  savedRequests.push(newRequest);
  console.log('Request saved:', newRequest);
  
  saveSavedRequests();
  expandedCollections.add(collectionId);
  renderSidebar();
  
  alert('Request saved!');
};

window.loadRequest = function(id) {
  console.log('Load request:', id);
  const req = savedRequests.find(r => r.id === id);
  if (!req) return;

  activeRequestId = id;

  document.getElementById('method').value = req.method;
  document.getElementById('url').value = req.url;
  document.getElementById('requestBody').value = req.body || '';

  const headersList = document.getElementById('headersList');
  headersList.innerHTML = '';
  
  if (req.headers && Object.keys(req.headers).length > 0) {
    Object.entries(req.headers).forEach(([key, value]) => {
      addHeaderRow(key, value);
    });
  } else {
    addHeaderRow('Content-Type', 'application/json');
  }

  renderSidebar();
};

window.deleteRequest = function(id) {
  console.log('Delete request:', id);
  if (!confirm('Delete this request?')) return;
  
  savedRequests = savedRequests.filter(r => r.id !== id);
  if (activeRequestId === id) {
    activeRequestId = null;
  }
  saveSavedRequests();
  renderSidebar();
};

// ============================================
// REQUEST FUNCTIONS
// ============================================

function saveRequest() {
  console.log('Save request clicked');
  
  if (collections.length === 0) {
    alert('Please create a collection first!');
    return;
  }
  
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value.trim();
  const body = document.getElementById('requestBody').value.trim();

  if (!url) {
    alert('Please enter a URL to save');
    return;
  }

  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) headers[key] = value;
  });

  let collectionOptions = 'Select a collection:\n\n';
  collections.forEach((col, index) => {
    collectionOptions += (index + 1) + '. ' + col.name + '\n';
  });
  
  const collectionChoice = prompt(collectionOptions);
  if (!collectionChoice) return;
  
  const collectionIndex = parseInt(collectionChoice) - 1;
  if (isNaN(collectionIndex) || collectionIndex < 0 || collectionIndex >= collections.length) {
    alert('Invalid collection number');
    return;
  }
  
  const collectionId = collections[collectionIndex].id;

  const urlParts = url.split('/');
  const defaultName = method + ' ' + (urlParts[urlParts.length - 1] || urlParts[2] || 'request');
  const name = prompt('Enter a name for this request:', defaultName);
  
  if (!name || !name.trim()) return;

  const newRequest = {
    id: Date.now(),
    collectionId: collectionId,
    name: name.trim(),
    method: method,
    url: url,
    headers: headers,
    body: body
  };
  
  savedRequests.push(newRequest);
  console.log('Request saved via Save button:', newRequest);
  
  saveSavedRequests();
  expandedCollections.add(collectionId);
  renderSidebar();
  
  alert('Request saved!');
}

async function sendRequest() {
  console.log('Send request clicked');
  
  if (isRequesting) return;
  
  const method = document.getElementById('method').value;
  const url = document.getElementById('url').value.trim();
  const body = document.getElementById('requestBody').value.trim();

  if (!url) {
    alert('Please enter a URL');
    return;
  }

  try {
    new URL(url);
  } catch (e) {
    alert('Please enter a valid URL (include http:// or https://)');
    return;
  }

  const headers = {};
  document.querySelectorAll('#headersList .header-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) headers[key] = value;
  });

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
      method: method,
      url: url,
      headers: headers,
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
}

function displayResponse(response) {
  let statusClass = 'status-info';
  if (response.error) {
    statusClass = 'status-error';
  } else if (response.status >= 200 && response.status < 300) {
    statusClass = 'status-success';
  } else if (response.status >= 400) {
    statusClass = 'status-error';
  }
  
  document.getElementById('statusBadge').innerHTML = 
    '<span class="status-badge ' + statusClass + '">' + response.status + ' ' + response.statusText + '</span>';

  const responseInfo = document.getElementById('responseInfo');
  responseInfo.style.display = 'flex';
  responseInfo.innerHTML = 
    '<div class="info-item"><span class="info-label">Status:</span><span>' + response.status + ' ' + response.statusText + '</span></div>' +
    '<div class="info-item"><span class="info-label">Time:</span><span>' + response.duration + 'ms</span></div>' +
    '<div class="info-item"><span class="info-label">Size:</span><span>' + formatBytes(response.size || response.data.length) + '</span></div>';

  const responseBody = document.getElementById('responseBody');
  try {
    const parsed = JSON.parse(response.data);
    responseBody.textContent = JSON.stringify(parsed, null, 2);
  } catch {
    responseBody.textContent = response.data || '(Empty response)';
  }

  const responseHeaders = document.getElementById('responseHeaders');
  if (response.headers && Object.keys(response.headers).length > 0) {
    responseHeaders.textContent = JSON.stringify(response.headers, null, 2);
  } else {
    responseHeaders.textContent = '(No headers)';
  }
}

function displayError(error) {
  document.getElementById('statusBadge').innerHTML = 
    '<span class="status-badge status-error">Error</span>';
  
  const responseInfo = document.getElementById('responseInfo');
  responseInfo.style.display = 'flex';
  responseInfo.innerHTML = 
    '<div class="info-item"><span class="info-label">Error:</span><span>' + (error.message || 'Unknown error') + '</span></div>';
  
  document.getElementById('responseBody').textContent = 
    'Request failed:\n' + (error.message || error);
  document.getElementById('responseHeaders').textContent = '(No headers)';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function addHeaderRow(key, value) {
  key = key || '';
  value = value || '';
  
  const headersList = document.getElementById('headersList');
  if (!headersList) {
    console.error('headersList not found');
    return;
  }
  
  const row = document.createElement('div');
  row.className = 'header-row';
  row.innerHTML = 
    '<input type="text" placeholder="Header name" value="' + escapeHtml(key) + '">' +
    '<input type="text" placeholder="Header value" value="' + escapeHtml(value) + '">' +
    '<button onclick="this.parentElement.remove()">Remove</button>';
  headersList.appendChild(row);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}