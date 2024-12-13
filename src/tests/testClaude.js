require('dotenv').config();
const gmailService = require('../backend/gmail');
const claudeService = require('../backend/claude');
const logger = require('../utils/logger');

async function testEmailCategorization() {
  try {
    console.log('🚀 Starting Email Categorization Test...\n');

    // Step 1: Fetch emails
    console.log('📧 Fetching unread emails...');
    const emails = await gmailService.fetchUnreadEmails();
    console.log(`✅ Found ${emails.length} unread emails\n`);

    // Step 2: Take a sample of 5 emails for testing
    const sampleEmails = emails.slice(0, 5);
    console.log(`📝 Testing with ${sampleEmails.length} sample emails...\n`);

    // Step 3: Categorize emails
    console.log('🤖 Categorizing emails using Claude...');
    const categorizedEmails = await claudeService.categorizeEmails(sampleEmails, 5);

    // Step 4: Apply labels
    console.log('\n🏷️  Applying labels to emails...');
    for (const result of categorizedEmails) {
      await gmailService.applyCategorizationLabel(result.email.id, result.category);
      console.log(`✅ Applied "${result.category}" to email: ${result.email.subject}`);
    }

    // Step 5: Display results
    console.log('\n📊 Categorization Results:');
    for (const result of categorizedEmails) {
      console.log('\n------------------------');
      console.log(`Email ${result.emailIndex}:`);
      console.log(`Subject: ${result.email.subject}`);
      console.log(`Category: ${result.category}`);
      console.log(`Reason: ${result.reason}`);
      console.log('------------------------');
    }

    // Step 6: Summary
    const categories = categorizedEmails.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Summary:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`${category}: ${count} emails`);
    });

    console.log('\n✅ Email categorization and labeling completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Email categorization test failed', { error });
  }
}

// Run the test
testEmailCategorization(); 