const express = require('express');
const { google } = require('googleapis');
const { authenticate } = require('./src/backend/auth');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

app.get('/auth/google', async (req, res) => {
  try {
    const url = await authenticate();
    res.redirect(url);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const auth = await authenticate(code);
    res.send('Authentication successful! You can close this window.');
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send('Authentication callback failed');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
