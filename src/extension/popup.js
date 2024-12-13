// DOM Elements
const elements = {
  connectionStatus: {
    indicator: document.querySelector('#connectionStatus span:first-child'),
    text: document.querySelector('#connectionStatus span:last-child')
  },
  statistics: {
    needsResponse: document.getElementById('needsResponse'),
    needsAttention: document.getElementById('needsAttention'),
    archived: document.getElementById('archived')
  },
  buttons: {
    processInbox: document.getElementById('processInbox'),
    generateDrafts: document.getElementById('generateDrafts')
  }
};

// Update UI state
function updateConnectionStatus(isConnected) {
  elements.connectionStatus.indicator.className = `h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`;
  elements.connectionStatus.text.textContent = isConnected ? 'Connected' : 'Disconnected';
  
  // Update button states
  elements.buttons.processInbox.disabled = !isConnected;
  elements.buttons.generateDrafts.disabled = !isConnected;
  
  if (!isConnected) {
    elements.buttons.processInbox.classList.add('opacity-50', 'cursor-not-allowed');
    elements.buttons.generateDrafts.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    elements.buttons.processInbox.classList.remove('opacity-50', 'cursor-not-allowed');
    elements.buttons.generateDrafts.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function updateStatistics(stats) {
  elements.statistics.needsResponse.textContent = stats.needsResponse;
  elements.statistics.needsAttention.textContent = stats.needsAttention;
  elements.statistics.archived.textContent = stats.archived;
}

// Button click handlers
async function handleProcessInbox() {
  try {
    elements.buttons.processInbox.disabled = true;
    elements.buttons.processInbox.textContent = 'Processing...';
    
    const response = await chrome.runtime.sendMessage({ action: 'processInbox' });
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Success feedback
    elements.buttons.processInbox.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    elements.buttons.processInbox.classList.add('bg-green-600');
    elements.buttons.processInbox.textContent = 'Processed!';
    
    setTimeout(() => {
      elements.buttons.processInbox.classList.remove('bg-green-600');
      elements.buttons.processInbox.classList.add('bg-blue-600', 'hover:bg-blue-700');
      elements.buttons.processInbox.textContent = 'Process Inbox';
      elements.buttons.processInbox.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Process inbox error:', error);
    elements.buttons.processInbox.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    elements.buttons.processInbox.classList.add('bg-red-600');
    elements.buttons.processInbox.textContent = 'Error!';
    
    setTimeout(() => {
      elements.buttons.processInbox.classList.remove('bg-red-600');
      elements.buttons.processInbox.classList.add('bg-blue-600', 'hover:bg-blue-700');
      elements.buttons.processInbox.textContent = 'Process Inbox';
      elements.buttons.processInbox.disabled = false;
    }, 2000);
  }
}

async function handleGenerateDrafts() {
  try {
    elements.buttons.generateDrafts.disabled = true;
    elements.buttons.generateDrafts.textContent = 'Generating...';
    
    const response = await chrome.runtime.sendMessage({ action: 'generateDrafts' });
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Success feedback
    elements.buttons.generateDrafts.classList.remove('bg-green-600', 'hover:bg-green-700');
    elements.buttons.generateDrafts.classList.add('bg-blue-600');
    elements.buttons.generateDrafts.textContent = 'Generated!';
    
    setTimeout(() => {
      elements.buttons.generateDrafts.classList.remove('bg-blue-600');
      elements.buttons.generateDrafts.classList.add('bg-green-600', 'hover:bg-green-700');
      elements.buttons.generateDrafts.textContent = 'Generate Drafts';
      elements.buttons.generateDrafts.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Generate drafts error:', error);
    elements.buttons.generateDrafts.classList.remove('bg-green-600', 'hover:bg-green-700');
    elements.buttons.generateDrafts.classList.add('bg-red-600');
    elements.buttons.generateDrafts.textContent = 'Error!';
    
    setTimeout(() => {
      elements.buttons.generateDrafts.classList.remove('bg-red-600');
      elements.buttons.generateDrafts.classList.add('bg-green-600', 'hover:bg-green-700');
      elements.buttons.generateDrafts.textContent = 'Generate Drafts';
      elements.buttons.generateDrafts.disabled = false;
    }, 2000);
  }
}

// Event listeners
elements.buttons.processInbox.addEventListener('click', handleProcessInbox);
elements.buttons.generateDrafts.addEventListener('click', handleGenerateDrafts);

// Message listeners
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'connectionUpdate':
      updateConnectionStatus(message.isConnected);
      break;
    case 'statisticsUpdate':
      updateStatistics(message.statistics);
      break;
  }
});

// Initialize
async function initialize() {
  try {
    // Get initial connection status
    const connectionResponse = await chrome.runtime.sendMessage({ action: 'checkConnection' });
    updateConnectionStatus(connectionResponse.isConnected);
    
    // Get initial statistics
    const statisticsResponse = await chrome.runtime.sendMessage({ action: 'getStatistics' });
    updateStatistics(statisticsResponse);
  } catch (error) {
    console.error('Initialization error:', error);
    updateConnectionStatus(false);
  }
}

// Start initialization when popup opens
initialize(); 