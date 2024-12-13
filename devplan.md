# Detailed Development Plan: Chrome Plugin for Email Categorization and Drafting (Aether Plugin)

This development plan ensures a modular, systematic approach for building the Chrome plugin, minimizing the risk of AI code generation losing context.

OUTPUT FULL FILES FOR COPYING AND PASTING. Do not create code fragments. I am not a developer, so if I need to set something up outside of my IDE, give me detailed instructions. Do not just tell me "set up firebase". Give me step by step instructions.

---

## Phase 1: Define Project Scope and Setup

1. **Write a Specification Document**
   - Clearly list plugin features:
     - Email categorization.
     - Email drafting with a user-specific style.
     - Writing style training using past emails.
     - Knowledge library integration.
     - User interface for settings and library management.
   - Define inputs and outputs for each feature.
     - **Inputs**: Gmail emails (subject, sender, body), user preferences, knowledge library.
     - **Outputs**: Labels applied to emails, drafts saved to Gmail, categorized email lists.

2. **Set Up Development Environment**
   - Install development tools:
     - **VS Code** or similar IDE.
     - Node.js and npm (for backend and package management).
     - Chrome Extension Developer Tools.
   - Create a GitHub repository for version control.

3. **Divide Development into Modules**
   - **Email Categorization**: Gmail API integration, calling Claude API for categorization.
   - **Draft Response Generation**: Prompt engineering, saving drafts via Gmail API.
   - **Style Training**: Fetching past emails, creating style guidelines.
   - **Knowledge Library**: UI for adding/searching knowledge, LangChain integration.
   - **User Interface**: Chrome extension UI with React.js or plain HTML/JS.

---

## Phase 2: Gmail API Integration

1. **Enable Gmail API**
   - Set up a Google Cloud project.
   - Enable Gmail API.
   - Obtain API credentials (client ID and secret).

2. **Build Gmail API Integration**
   - **Step 1**: Authenticate users via OAuth 2.0.
     - Use AI to write an authentication flow.
     - Save tokens securely for later API calls.
   - **Step 2**: Fetch emails.
     - Write a function to fetch unread emails using Gmail API.
   - **Step 3**: Apply Labels.
     - Implement functions to add labels ("Needs Response," "Needs Attention," "Can Archive").
   - **Step 4**: Save Drafts.
     - Write a function to save email drafts via Gmail API.

---

## Phase 3: Anthropic Claude API Integration

1. **Set Up API Key**
   - Obtain access to Claude API.
   - Configure authentication for API requests.

2. **Implement Categorization Logic**
   - Create a base prompt for email categorization:
     - Example: "Categorize the following email into one of three categories: 'Needs Response,' 'Needs Attention,' or 'Can Archive.' Use user preferences and conversational context where applicable."
   - Write a function to send email data to the Claude API and return the categorization.

3. **Implement Draft Response Logic**
   - Create a base prompt for drafting responses:
     - Example: "Draft a response to the following email in the CEO's style. Use previous thread content and knowledge library data if applicable."
   - Save drafts to Gmail using the Gmail API.

---

## Phase 4: Writing Style Training

1. **Fetch Sent Emails**
   - Use Gmail API to fetch a sample of 10,000 sent emails.

2. **Analyze Writing Style**
   - Write a script to extract patterns like:
     - Common greetings and sign-offs.
     - Sentence length, tone, and vocabulary.
   - Save extracted patterns as guidelines.

3. **Integrate Style Training**
   - Add these guidelines to the prompts used in Claude API calls for drafting responses.

---

## Phase 5: Knowledge Library Integration

1. **Create Library Storage**
   - Use Firebase Firestore to store:
     - Questions and answers.
     - Business-specific data.
     - Implement encryption for stored messages.

2. **Implement Library Search**
   - Integrate LangChain to enable semantic search.
   - Use a fallback mechanism to handle unmatched queries.

3. **Combine Library Data with Drafting**
   - If an email requires specific knowledge, include the search results in the Claude API prompt.

---

## Phase 6: Chrome Extension Development

1. **Setup Chrome Extension Manifest**
   - Write a `manifest.json` file (using Manifest V3).
   - Include permissions for Gmail API access and storage.

2. **Build the UI**
   - Use React.js or plain HTML/JS to create:
     - A dashboard for settings (categorization rules, library management).
     - A library editor for adding and searching entries.

3. **Background Scripts**
   - Write a script to run periodically:
     - Fetch new emails.
     - Call Claude API for categorization and drafts.
     - Save updates back to Gmail.

---

## Phase 7: Testing and Debugging

### User Testing Prompts
To test features in a live environment, use the following prompts:

1. **Email Categorization**:
   - Send a test email with varying content (e.g., a question, an announcement, a promotional email) and verify that the plugin correctly categorizes it into "Needs Response," "Needs Attention," or "Can Archive."
   - Example Prompt: "Does this email need a response, or should it be archived based on the user's preferences?"

2. **Draft Response Generation**:
   - Trigger the plugin to draft a response for an email labeled "Needs Response."
   - Review the draft for tone, structure, and content accuracy.
   - Example Prompt: "Draft a reply to this email using the writing style of the user and including details from the thread."

3. **Writing Style Training**:
   - Use the plugin to fetch sent emails and generate a style guide.
   - Send a test email requiring a response and verify if the draft matches the extracted style.
   - Example Prompt: "Does this draft match the style and tone of the user's past emails?"

4. **Knowledge Library Integration**:
   - Create entries in the knowledge library.
   - Send an email asking for specific business information and verify if the draft includes correct data from the library.
   - Example Prompt: "Include relevant details from the knowledge library in the draft for this email."

5. **Error Handling**:
   - Simulate API failures or incorrect inputs and check if user-friendly error messages are displayed.
   - Example Prompt: "What happens when the Claude API times out or fails to categorize an email?"

1. **Test Each Module Independently**
   - Categorization logic.
   - Draft response generation.
   - Gmail API integration.
   - Library search.

2. **End-to-End Testing**
   - Simulate real-world scenarios:
     - Categorize incoming emails.
     - Draft responses with library integration.

3. **Refine Prompts and Logic**
   - Iterate on Claude API prompts for better results.

---

## Phase 8: Deployment and Maintenance

1. **Package and Publish**
   - Package the extension for Chrome Web Store or distribute locally.

2. **Monitor and Update**
   - Add logging to identify categorization or drafting errors.
   - Provide a way for users to submit feedback and update preferences.

---

## Managing Context with AI

1. **Write Clear Instructions for Each Module**
   - Before asking AI to generate code, provide a summary of:
     - Inputs, outputs, and dependencies.
     - Example data for testing.

2. **Modularize Prompts**
   - Use self-contained prompts for each task (e.g., fetch emails, categorize, draft).
   - Keep a "master plan" handy to ensure AI-generated code aligns with overall goals.

3. **Review AI Code Carefully**
   - Test small code snippets before integrating them into the larger system.

---

This plan is structured to help manage complexity and ensure a smooth development process. Let me know if refinements or additional details are needed.

