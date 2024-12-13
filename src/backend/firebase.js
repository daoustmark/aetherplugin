const admin = require('firebase-admin');
const serviceAccount = require('../../firebase-key.json'); // Adjust path if necessary

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

module.exports = admin;
