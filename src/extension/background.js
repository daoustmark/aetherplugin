// State management
const state = {
  isConnected: false,
  hasActiveConnections: false,
  statistics: {
    needsResponse: 0,
    needsAttention: 0,
    archived: 0
  },
  settings: {
    autoProcess: false,
    updateInterval: 60
  }
};

// Initialize connection to backend server
async function initializeConnection() {
  try {
    const response = await fetch('http://localhost:3000/api/status');
    const wasConnected = state.isConnected;
    state.isConnected = response.ok;
    
    // Only broadcast if connection status changed
    if (wasConnected !== state.isConnected && state.hasActiveConnections) {
      broadcastConnectionStatus();
    }
    
    // If we just connected, fetch initial statistics
    if (!wasConnected && state.isConnected) {
      await fetchStatistics().catch(() => {}); // Ignore errors on initial fetch
    }
  } catch (error) {
    console.debug('Backend not available:', error);
    const wasConnected = state.isConnected;
    state.isConnected = false;
    
    if (wasConnected && state.hasActiveConnections) {
      broadcastConnectionStatus();
    }
  }
}

// Broadcast connection status to all extension views
function broadcastConnectionStatus() {
  try {
    chrome.runtime.sendMessage({
      type: 'connectionUpdate',
      isConnected: state.isConnected
    }).catch(() => {
      // Message failed, likely no receivers
      state.hasActiveConnections = false;
    });
  } catch (error) {
    // Runtime not available or other error
    state.hasActiveConnections = false;
  }
}

// Process inbox emails
async function processInbox() {
  try {
    const response = await fetch('http://localhost:3000/api/process-inbox', {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to process inbox');
    }
    const result = await response.json();
    updateStatistics(result.statistics);
    return result;
  } catch (error) {
    console.error('Error processing inbox:', error);
    throw error;
  }
}

// Generate draft responses
async function generateDrafts() {
  try {
    const response = await fetch('http://localhost:3000/api/generate-drafts', {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to generate drafts');
    }
    const result = await response.json();
    updateStatistics(result.statistics);
    return result;
  } catch (error) {
    console.error('Error generating drafts:', error);
    throw error;
  }
}

// Update statistics
function updateStatistics(newStats) {
  Object.assign(state.statistics, newStats);
  if (state.hasActiveConnections) {
    chrome.runtime.sendMessage({
      type: 'statisticsUpdate',
      statistics: state.statistics
    }).catch(() => {
      state.hasActiveConnections = false;
    });
  }
}

// Fetch current statistics
async function fetchStatistics() {
  // Don't try to fetch if we're not connected
  if (!state.isConnected) {
    return state.statistics;
  }

  try {
    const response = await fetch('http://localhost:3000/api/statistics');
    if (!response.ok) {
      console.debug('Statistics endpoint not ready');
      return state.statistics;
    }
    const stats = await response.json();
    updateStatistics(stats);
    return stats;
  } catch (error) {
    console.debug('Could not fetch statistics:', error);
    return state.statistics;
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      autoProcess: false,
      updateInterval: 60
    });
    Object.assign(state.settings, settings);
    updateTimers();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Update timers based on settings
function updateTimers() {
  // Clear existing timers
  if (self.connectionTimer) {
    clearInterval(self.connectionTimer);
  }
  if (self.statisticsTimer) {
    clearInterval(self.statisticsTimer);
  }

  // Set new timers
  self.connectionTimer = setInterval(initializeConnection, 30000);
  
  // Only start statistics timer if we're connected
  if (state.isConnected) {
    self.statisticsTimer = setInterval(fetchStatistics, state.settings.updateInterval * 1000);
  }

  // Start auto-processing if enabled
  if (state.settings.autoProcess) {
    startAutoProcessing();
  } else {
    stopAutoProcessing();
  }
}

// Auto-processing functionality
function startAutoProcessing() {
  if (!self.autoProcessTimer) {
    self.autoProcessTimer = setInterval(async () => {
      if (state.isConnected) {
        try {
          await processInbox();
        } catch (error) {
          console.error('Auto-processing error:', error);
        }
      }
    }, 300000); // Check every 5 minutes
  }
}

function stopAutoProcessing() {
  if (self.autoProcessTimer) {
    clearInterval(self.autoProcessTimer);
    self.autoProcessTimer = null;
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Set active connections flag when receiving any message
  state.hasActiveConnections = true;

  switch (message.action) {
    case 'checkConnection':
      sendResponse({ isConnected: state.isConnected });
      break;
      
    case 'getStatistics':
      sendResponse(state.statistics);
      break;
      
    case 'processInbox':
      processInbox()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep the message channel open for async response
      
    case 'generateDrafts':
      generateDrafts()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true;
  }
});

// Listen for settings changes
chrome.runtime.onMessage.addListener(message => {
  // Set active connections flag when receiving any message
  state.hasActiveConnections = true;

  if (message.type === 'settingsUpdated') {
    Object.assign(state.settings, message.settings);
    updateTimers();
  }
});

// Initialize extension
async function initialize() {
  await loadSettings();
  await initializeConnection();
  await fetchStatistics();
}

// Start initialization
initialize();