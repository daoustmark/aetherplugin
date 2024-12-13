// Gmail interface integration
class GmailIntegration {
  constructor() {
    this.initialized = false;
    this.observer = null;
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    // Wait for Gmail interface to load
    const checkGmailReady = setInterval(() => {
      if (document.querySelector('.nH')) {
        clearInterval(checkGmailReady);
        this.setupInterface();
      }
    }, 100);

    this.initialized = true;
  }

  setupInterface() {
    // Add Aether toolbar button
    this.addToolbarButton();
    
    // Watch for email list changes
    this.observeEmailList();
  }

  addToolbarButton() {
    const toolbar = document.querySelector('.G-tF');
    if (!toolbar || document.getElementById('aether-btn')) return;

    const button = document.createElement('div');
    button.id = 'aether-btn';
    button.className = 'G-Ni J-J5-Ji';
    button.innerHTML = `
      <div class="T-I J-J5-Ji aether-process T-I-ax7 L3" role="button" style="user-select: none">
        <span class="text" style="margin-right: 5px">Process with Aether</span>
        <img src="${chrome.runtime.getURL('icons/icon16.png')}" style="width: 16px; height: 16px; vertical-align: middle">
      </div>
    `;

    button.addEventListener('click', () => this.handleProcessClick());
    toolbar.appendChild(button);
  }

  observeEmailList() {
    if (this.observer) return;

    const emailList = document.querySelector('.AO');
    if (!emailList) return;

    this.observer = new MutationObserver(() => {
      this.updateEmailLabels();
    });

    this.observer.observe(emailList, {
      childList: true,
      subtree: true
    });
  }

  async handleProcessClick() {
    const button = document.querySelector('.aether-process');
    if (!button) return;

    try {
      button.classList.add('T-I-JW'); // Add loading state
      
      // Send message to background script
      const result = await chrome.runtime.sendMessage({ action: 'processInbox' });
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Show success notification
      this.showNotification('Emails processed successfully', 'success');
    } catch (error) {
      console.error('Error processing emails:', error);
      this.showNotification('Failed to process emails', 'error');
    } finally {
      button.classList.remove('T-I-JW');
    }
  }

  updateEmailLabels() {
    // Find all email items in the list
    const emailItems = document.querySelectorAll('.zA');
    
    emailItems.forEach(item => {
      // Check if email has Aether labels
      const labels = item.querySelectorAll('.av');
      const hasAetherLabel = Array.from(labels).some(label => 
        ['Needs Response', 'Needs Attention', 'Can Archive'].includes(label.textContent.trim())
      );

      if (!hasAetherLabel) {
        // Add processing indicator if not already processed
        this.addProcessingIndicator(item);
      }
    });
  }

  addProcessingIndicator(emailItem) {
    if (emailItem.querySelector('.aether-indicator')) return;

    const indicator = document.createElement('div');
    indicator.className = 'aether-indicator';
    indicator.style.cssText = `
      display: inline-block;
      margin-left: 5px;
      padding: 0 5px;
      font-size: 11px;
      color: #666;
    `;
    indicator.textContent = 'Not processed';

    const subjectElement = emailItem.querySelector('.y6');
    if (subjectElement) {
      subjectElement.appendChild(indicator);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `aether-notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 4px;
      background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      z-index: 9999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize Gmail integration
new GmailIntegration(); 