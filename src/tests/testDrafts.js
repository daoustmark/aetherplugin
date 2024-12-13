require('dotenv').config();
const gmailService = require('../backend/gmail');
const claudeService = require('../backend/claude');
const logger = require('../utils/logger');

async function testDraftGeneration() {
  try {
    console.log('🚀 Starting Draft Generation Test...\n');

    // Step 1: Fetch emails that need responses
    console.log('📧 Fetching unread emails...');
    const emails = await gmailService.fetchUnreadEmails();
    console.log(`✅ Found ${emails.length} unread emails\n`);

    // Step 2: Categorize emails
    console.log('🤖 Categorizing emails...');
    const categorizedEmails = await claudeService.categorizeEmails(emails.slice(0, 5));
    const needsResponse = categorizedEmails.filter(e => e.category === 'Needs Response');
    console.log(`✅ Found ${needsResponse.length} emails needing response\n`);

    if (needsResponse.length === 0) {
      console.log('❌ No emails need response. Test complete.');
      return;
    }

    // Debug: Log the first email that needs response
    console.log('First email needing response:', JSON.stringify(needsResponse[0], null, 2));

    // Step 3: Generate draft responses
    console.log('📝 Generating draft responses...');
    const drafts = await claudeService.generateBatchDraftResponses(needsResponse);
    console.log(`✅ Generated ${drafts.length} draft responses\n`);

    // Debug: Log the first draft
    console.log('First draft:', JSON.stringify(drafts[0], null, 2));

    // Step 4: Create drafts in Gmail
    console.log('💌 Creating drafts in Gmail...');
    for (const draft of drafts) {
      console.log('\nCreating draft with:', JSON.stringify({
        subject: draft.subject,
        originalEmail: {
          from: draft.originalEmail.from,
          replyTo: draft.originalEmail.replyTo,
          to: draft.originalEmail.to
        }
      }, null, 2));

      const createdDraft = await gmailService.createDraft(draft);
      console.log('\n------------------------');
      console.log('Draft created for:', draft.subject);
      console.log('Preview:', draft.body.substring(0, 100) + '...');
      console.log('Draft ID:', createdDraft.id);
      console.log('------------------------');
    }

    console.log('\n📈 Summary:');
    console.log(`Total emails processed: ${emails.length}`);
    console.log(`Emails needing response: ${needsResponse.length}`);
    console.log(`Drafts generated and saved: ${drafts.length}`);

    console.log('\n✅ Draft generation test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logger.error('Draft generation test failed', { error });
  }
}

// Run the test
testDraftGeneration(); 