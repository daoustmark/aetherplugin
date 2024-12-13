const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
);

// Scopes we need for Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose'
];

async function authenticate(code = null) {
  if (!code) {
    // Generate URL for initial authentication
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return url;
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
}

module.exports = { authenticate };
