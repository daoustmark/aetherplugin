document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const autoProcess = document.getElementById('autoProcess');
  const notifyProcessed = document.getElementById('notifyProcessed');
  const notifyDrafts = document.getElementById('notifyDrafts');
  const updateInterval = document.getElementById('updateInterval');
  const writingStyle = document.getElementById('writingStyle');
  const customRules = document.getElementById('customRules');
  const knowledgeEntries = document.getElementById('knowledgeEntries');
  const addRuleBtn = document.getElementById('addRuleBtn');
  const addEntryBtn = document.getElementById('addEntryBtn');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  // Load saved settings
  loadSettings();

  // Event listeners for dynamic elements
  addRuleBtn.addEventListener('click', () => addCustomRule());
  addEntryBtn.addEventListener('click', () => addKnowledgeEntry());
  saveBtn.addEventListener('click', saveSettings);

  // Load settings from storage
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        // Default values
        autoProcess: false,
        notifyProcessed: true,
        notifyDrafts: true,
        updateInterval: '60',
        writingStyle: '',
        customRules: [''],
        knowledgeEntries: [{ topic: '', response: '' }]
      });

      // Apply settings to UI
      autoProcess.checked = settings.autoProcess;
      notifyProcessed.checked = settings.notifyProcessed;
      notifyDrafts.checked = settings.notifyDrafts;
      updateInterval.value = settings.updateInterval;
      writingStyle.value = settings.writingStyle;

      // Load custom rules
      customRules.innerHTML = '';
      settings.customRules.forEach(rule => {
        if (rule) addCustomRule(rule);
      });

      // Load knowledge entries
      knowledgeEntries.innerHTML = '';
      settings.knowledgeEntries.forEach(entry => {
        if (entry.topic || entry.response) {
          addKnowledgeEntry(entry);
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showSaveStatus('Error loading settings', false);
    }
  }

  // Save settings to storage
  async function saveSettings() {
    try {
      saveBtn.disabled = true;
      showSaveStatus('Saving...');

      // Collect custom rules
      const rules = Array.from(customRules.children).map(rule => {
        const input = rule.querySelector('input');
        return input ? input.value : '';
      }).filter(Boolean);

      // Collect knowledge entries
      const entries = Array.from(knowledgeEntries.children).map(entry => {
        const inputs = entry.querySelectorAll('input, textarea');
        return inputs.length === 2 ? {
          topic: inputs[0].value,
          response: inputs[1].value
        } : null;
      }).filter(Boolean);

      // Save to chrome.storage.sync
      await chrome.storage.sync.set({
        autoProcess: autoProcess.checked,
        notifyProcessed: notifyProcessed.checked,
        notifyDrafts: notifyDrafts.checked,
        updateInterval: updateInterval.value,
        writingStyle: writingStyle.value,
        customRules: rules,
        knowledgeEntries: entries
      });

      // Notify background script of settings change
      chrome.runtime.sendMessage({
        type: 'settingsUpdated',
        settings: {
          autoProcess: autoProcess.checked,
          updateInterval: parseInt(updateInterval.value)
        }
      });

      showSaveStatus('Settings saved successfully', true);
    } catch (error) {
      console.error('Error saving settings:', error);
      showSaveStatus('Error saving settings', false);
    } finally {
      saveBtn.disabled = false;
    }
  }

  // Add a new custom rule input
  function addCustomRule(value = '') {
    const ruleElement = document.createElement('div');
    ruleElement.className = 'flex items-start space-x-4';
    ruleElement.innerHTML = `
      <div class="flex-grow">
        <input type="text" class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
               value="${value}"
               placeholder="Example: Always mark emails from example@domain.com as 'Needs Response'">
      </div>
      <button class="text-red-600 hover:text-red-800 delete-rule">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;

    // Add delete handler
    ruleElement.querySelector('.delete-rule').addEventListener('click', () => {
      ruleElement.remove();
    });

    customRules.appendChild(ruleElement);
  }

  // Add a new knowledge entry
  function addKnowledgeEntry(entry = { topic: '', response: '' }) {
    const entryElement = document.createElement('div');
    entryElement.className = 'flex items-start space-x-4';
    entryElement.innerHTML = `
      <div class="flex-grow">
        <input type="text" class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-2" 
               value="${entry.topic}"
               placeholder="Topic or keyword">
        <textarea class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  rows="3" 
                  placeholder="Response template or information">${entry.response}</textarea>
      </div>
      <button class="text-red-600 hover:text-red-800 delete-entry">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;

    // Add delete handler
    entryElement.querySelector('.delete-entry').addEventListener('click', () => {
      entryElement.remove();
    });

    knowledgeEntries.appendChild(entryElement);
  }

  // Show save status message
  function showSaveStatus(message, success = true) {
    saveStatus.textContent = message;
    saveStatus.className = `text-sm ${success ? 'text-green-600' : 'text-red-600'}`;
    
    if (success) {
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 3000);
    }
  }
}); 