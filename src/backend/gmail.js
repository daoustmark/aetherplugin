const { google } = require('googleapis');
const { getAuth } = require('./auth');
const logger = require('../utils/logger');

class GmailService {
  constructor() {
    this.gmail = null;
    this.labels = {
      NEEDS_RESPONSE: null,
      NEEDS_ATTENTION: null,
      CAN_ARCHIVE: null
    };
  }

  async initialize() {
    const auth = await getAuth();
    this.gmail = google.gmail({ version: 'v1', auth });
    await this.ensureLabelsExist();
  }

  async ensureLabelsExist() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const existingLabels = response.data.labels;
      const requiredLabels = {
        NEEDS_RESPONSE: 'Needs Response',
        NEEDS_ATTENTION: 'Needs Attention',
        CAN_ARCHIVE: 'Can Archive'
      };

      for (const [key, labelName] of Object.entries(requiredLabels)) {
        const existingLabel = existingLabels.find(l => l.name === labelName);
        if (existingLabel) {
          this.labels[key] = existingLabel.id;
        } else {
          const newLabel = await this.createLabel(labelName);
          this.labels[key] = newLabel.id;
        }
      }

      logger.info('Labels initialized:', this.labels);
    } catch (error) {
      logger.error('Error ensuring labels exist:', error);
      throw error;
    }
  }

  async fetchUnreadEmails() {
    try {
      if (!this.gmail) await this.initialize();
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 50
      });

      const messages = response.data.messages || [];
      const emails = await Promise.all(
        messages.map(msg => this.fetchEmailDetails(msg.id))
      );

      return emails;
    } catch (error) {
      console.error('Error fetching unread emails:', error);
      throw error;
    }
  }

  async fetchEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      // Fetch thread context if it exists
      let threadContext = '';
      if (response.data.threadId) {
        threadContext = await this.fetchThreadContext(response.data.threadId, messageId);
      }

      const emailData = this.parseEmailData(response.data);
      return {
        ...emailData,
        threadContext
      };
    } catch (error) {
      logger.error(`Error fetching email details for ${messageId}:`, error);
      throw error;
    }
  }

  async fetchThreadContext(threadId, currentMessageId) {
    try {
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId
      });

      // Filter out the current message and sort messages by date
      const otherMessages = response.data.messages
        .filter(msg => msg.id !== currentMessageId)
        .sort((a, b) => parseInt(a.internalDate) - parseInt(b.internalDate));

      // Build the context string from other messages
      let context = '';
      for (const message of otherMessages) {
        const emailData = this.parseEmailData(message);
        context += `\nOn ${emailData.date}, ${emailData.from} wrote:\n${emailData.body}\n`;
      }

      return context;
    } catch (error) {
      logger.error(`Error fetching thread context for ${threadId}:`, error);
      return ''; // Return empty string if we can't get thread context
    }
  }

  parseEmailData(message) {
    const headers = message.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const replyTo = headers.find(h => h.name === 'Reply-To')?.value;

    let body = '';
    if (message.payload.parts) {
      body = this._getBodyFromParts(message.payload.parts);
    } else if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    }

    // Clean up HTML content
    body = this._cleanHtmlContent(body);

    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      replyTo,
      date,
      body,
      labelIds: message.labelIds || []
    };
  }

  _getBodyFromParts(parts) {
    let plainText = '';
    let htmlText = '';

    for (const part of parts) {
      if (part.parts) {
        // Recursively process nested parts
        const nestedText = this._getBodyFromParts(part.parts);
        if (nestedText) {
          return nestedText;
        }
      }

      if (part.mimeType === 'text/plain' && part.body.data) {
        plainText = Buffer.from(part.body.data, 'base64').toString();
      } else if (part.mimeType === 'text/html' && part.body.data) {
        htmlText = Buffer.from(part.body.data, 'base64').toString();
      }
    }

    // Prefer plain text over HTML
    return plainText || this._cleanHtmlContent(htmlText) || '';
  }

  _cleanHtmlContent(html) {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');

    // Fix common HTML entities
    text = text.replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Remove any remaining encoded characters
    text = text.replace(/&#[0-9]+;/g, '');

    return text;
  }

  async createLabel(name) {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error creating label ${name}:`, error);
      throw error;
    }
  }

  async addLabel(messageId, labelId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
    } catch (error) {
      logger.error(`Error adding label to message ${messageId}:`, error);
      throw error;
    }
  }

  async applyCategorizationLabel(messageId, category) {
    if (!this.gmail) await this.initialize();
    
    const labelMap = {
      'Needs Response': this.labels.NEEDS_RESPONSE,
      'Needs Attention': this.labels.NEEDS_ATTENTION,
      'Can Archive': this.labels.CAN_ARCHIVE
    };

    const labelId = labelMap[category];
    if (!labelId) {
      throw new Error(`Invalid category: ${category}`);
    }

    await this.addLabel(messageId, labelId);
    
    // If it's "Can Archive", also archive the message
    if (category === 'Can Archive') {
      await this.archiveEmail(messageId);
    }
  }

  async archiveEmail(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX']
        }
      });
    } catch (error) {
      logger.error(`Error archiving message ${messageId}:`, error);
      throw error;
    }
  }

  async createDraft(draft) {
    try {
      if (!this.gmail) await this.initialize();

      // Extract email details from the draft object
      const { subject, body, originalEmail } = draft;
      
      // Create the email message
      const message = {
        raw: this._createEmailMessage({
          to: this._extractReplyToAddress(originalEmail),
          subject: subject || 'Re: No Subject',
          body: body || '',
          inReplyTo: originalEmail.id,
          references: originalEmail.threadId || originalEmail.id
        })
      };

      // Create the draft in Gmail
      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message
        }
      });

      logger.info('Draft created successfully:', {
        draftId: response.data.id,
        subject: subject
      });

      return response.data;
    } catch (error) {
      logger.error('Error creating draft:', error);
      throw error;
    }
  }

  _createEmailMessage({ to, subject, body, inReplyTo, references }) {
    const emailLines = [
      'From: me',
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${inReplyTo}`,
      `References: ${references}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ];

    const email = emailLines.join('\r\n');
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  _extractReplyToAddress(emailObj) {
    try {
      logger.info('Extracting reply address from:', {
        replyTo: emailObj.replyTo,
        from: emailObj.from,
        to: emailObj.to
      });

      // Try to get Reply-To header first, fall back to From
      let addressField = null;
      
      // Check each possible source for the email address
      const possibleSources = [
        emailObj.replyTo,
        emailObj.from,
        emailObj.to,
        typeof emailObj === 'string' ? emailObj : null
      ].filter(Boolean); // Remove null/undefined values

      logger.info('Possible email sources:', { possibleSources });

      // Use the first non-null source
      addressField = possibleSources[0];

      if (!addressField) {
        logger.error('No reply-to or from address found:', { emailObj });
        throw new Error('No valid reply address found in email');
      }

      // Convert to string and clean up HTML content if present
      addressField = String(addressField).replace(/<[^>]*>/g, '').trim();
      logger.info('Cleaned address field:', { addressField });

      // Extract email address from various formats:
      // 1. "Name <email@example.com>"
      // 2. "<email@example.com>"
      // 3. "email@example.com"
      // 4. "Name email@example.com"
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const match = addressField.match(emailRegex);

      if (!match) {
        logger.error('Could not extract email address from:', { addressField });
        throw new Error('Invalid email address format');
      }

      const extractedAddress = match[1];
      logger.info('Successfully extracted email address:', { extractedAddress });
      return extractedAddress;
    } catch (error) {
      logger.error('Error extracting reply address:', error);
      throw error;
    }
  }

  _createQuotedReply(originalEmail) {
    const lines = [
      '',
      `On ${originalEmail.date}, ${originalEmail.from} wrote:`,
      ...originalEmail.body.split('\n').map(line => `> ${line}`)
    ];
    return lines.join('\n');
  }
}

module.exports = new GmailService(); 