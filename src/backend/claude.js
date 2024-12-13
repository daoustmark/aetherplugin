const axios = require('axios');
const logger = require('../utils/logger');
const { APIError } = require('../utils/errorHandler');

class ClaudeService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.CLAUDE_API_KEY
      }
    });
  }

  async categorizeEmails(emails, batchSize = 10) {
    try {
      // Split emails into batches
      const batches = this._createBatches(emails, batchSize);
      const results = [];

      for (const batch of batches) {
        const batchResults = await this._processBatch(batch);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      logger.error('Error in email categorization:', error);
      throw new APIError('Failed to categorize emails', 500, error);
    }
  }

  async _processBatch(emails) {
    const prompt = this._createBatchPrompt(emails);
    
    try {
      const response = await this.client.post('/messages', {
        model: process.env.CLAUDE_MODEL,
        max_tokens: 1500,
        system: "You are an email categorization assistant. You analyze emails and categorize them based on whether they need a response, need attention, or can be archived. Always respond in valid JSON format.",
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
        throw new Error('Invalid API response structure');
      }

      return this._parseResponse(response.data.content[0].text, emails);
    } catch (error) {
      logger.error('Error processing batch:', error);
      throw new APIError('Failed to process email batch', 500, error);
    }
  }

  _createBatchPrompt(emails) {
    const emailsForPrompt = emails.map((email, index) => `
Email ${index + 1}:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body.substring(0, 500)}... // Truncated for length
---`).join('\n');

    return `Please categorize the following emails into three categories:
1. "Needs Response" - Emails that require a reply
2. "Needs Attention" - Emails that don't need a reply but contain important information
3. "Can Archive" - Non-essential emails that can be archived

For each email, provide the category and a brief reason why. Format your response as a JSON array with objects containing:
- emailIndex: number (1-based)
- category: string (one of the three categories)
- reason: string (brief explanation)

Here are the emails to categorize:

${emailsForPrompt}

Respond only with the JSON array, no other text.`;
  }

  _parseResponse(response, originalEmails) {
    try {
      let jsonStr = response;
      
      // If the response contains any text before or after the JSON array,
      // try to extract just the JSON array
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }

      const categorizations = JSON.parse(jsonStr);
      
      return categorizations.map(cat => ({
        ...cat,
        email: originalEmails[cat.emailIndex - 1]
      }));
    } catch (error) {
      logger.error('Error parsing Claude response:', error);
      throw new APIError('Failed to parse categorization response', 500, error);
    }
  }

  _createBatches(array, size) {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  async generateBatchDraftResponses(emails, userStyle = null) {
    try {
      const drafts = [];
      // Process drafts sequentially to maintain context
      for (const email of emails) {
        if (email.category === 'Needs Response') {
          const draft = await this.generateDraftResponse(email.email, userStyle);
          drafts.push(draft);
        }
      }
      return drafts;
    } catch (error) {
      logger.error('Error in batch draft generation:', error);
      throw new APIError('Failed to generate batch drafts', 500, error);
    }
  }

  async generateDraftResponse(email, userStyle = null) {
    try {
      logger.info('Generating draft response for email:', {
        id: email.id,
        subject: email.subject,
        from: email.from,
        to: email.to
      });

      const prompt = this._createDraftPrompt(email, userStyle);
      
      const response = await this.client.post('/messages', {
        model: process.env.CLAUDE_MODEL,
        max_tokens: 2000,
        system: "You are an email response assistant. Write professional, contextually appropriate email responses. Match the user's writing style if provided. Be concise but thorough.",
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      if (!response.data?.content?.[0]?.text) {
        throw new Error('Invalid API response structure');
      }

      const draft = {
        subject: this._generateReplySubject(email.subject),
        body: response.data.content[0].text.trim(),
        originalEmail: {
          id: email.id,
          threadId: email.threadId,
          subject: email.subject,
          from: email.from,
          to: email.to,
          replyTo: email.replyTo || email.from,
          date: email.date,
          body: email.body
        }
      };

      logger.info('Generated draft:', {
        subject: draft.subject,
        originalEmail: {
          from: draft.originalEmail.from,
          replyTo: draft.originalEmail.replyTo,
          to: draft.originalEmail.to
        }
      });

      return draft;
    } catch (error) {
      logger.error('Error generating draft response:', error);
      throw new APIError('Failed to generate draft response', 500, error);
    }
  }

  _createDraftPrompt(email, userStyle = null) {
    let prompt = `Please write a response to the following email:

Original Email:
From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

${email.threadId ? 'This email is part of a thread. Previous context:' + email.threadContext : ''}

Requirements:
1. Write a professional and appropriate response
2. Be concise but thorough
3. Address all points in the original email
4. Maintain a friendly but professional tone
`;

    if (userStyle) {
      prompt += `\nPlease match this writing style:
${userStyle}`;
    }

    prompt += '\n\nWrite only the email body, no subject line or other text.';

    return prompt;
  }

  _generateReplySubject(subject) {
    if (!subject) return 'Re: [No Subject]';
    
    // If subject already starts with Re:, don't add it again
    if (subject.toLowerCase().startsWith('re:')) {
      return subject;
    }
    
    return `Re: ${subject}`;
  }
}

module.exports = new ClaudeService(); 