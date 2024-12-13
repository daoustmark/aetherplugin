require('dotenv').config();
const gmailService = require('../backend/gmail');
const logger = require('../utils/logger');

async function testGmailIntegration() {
  try {
    console.log('🚀 Starting Gmail API test...');
    
    // Test 1: Fetch unread emails
    console.log('\n📧 Fetching unread emails...');
    const emails = await gmailService.fetchUnreadEmails();
    console.log(`✅ Found ${emails.length} unread emails\n`);

    // Test 2: Display email details for the first 3 emails
    console.log('📝 Displaying details for first 3 emails:');
    const sampleEmails = emails.slice(0, 3);
    
    for (const email of sampleEmails) {
      console.log('\n------------------------');
      console.log('Subject:', email.subject);
      console.log('From:', email.from);
      console.log('Date:', email.date);
      console.log('Thread ID:', email.threadId);
      console.log('Body Preview:', email.body.substring(0, 100) + '...');
      console.log('------------------------');
    }

    console.log('\n✅ Gmail API test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Gmail API test failed', { error });
  }
}

// Run the test
testGmailIntegration(); 