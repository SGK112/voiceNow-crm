# 🎙️ Agent Studio Wizard - User Documentation

## Overview

The Agent Studio Wizard is a guided, multi-stage workflow for creating AI voice agents with ElevenLabs. It simplifies agent creation by breaking it down into 4 easy steps with inline documentation and helpful tooltips.

## How to Access

1. Navigate to **Agent Studio** from the sidebar
2. Click the **"Use Guided Wizard"** button (gradient purple/blue button in top right)
3. You'll be taken to `/app/agent-studio/new`

## The 4 Stages

### Stage 1: Voice Selection 🎤

**Purpose**: Choose the perfect AI voice for your agent

**What You'll See**:
- A filterable voice library browser
- Over 5,000 voices across 29 languages
- Preview buttons to hear each voice
- Filters for language, gender, accent, and age

**How to Use**:
1. Use filters to narrow down voices:
   - **Language**: Filter by supported languages (English, Spanish, French, etc.)
   - **Gender**: Male, Female, or Neutral
   - **Accent**: American, British, Australian, etc.
   - **Search**: Type to search voice names

2. Preview voices:
   - Click the **Play** button on any voice card
   - Listen to the sample
   - Click **Pause** to stop

3. Select your voice:
   - Click the **"Select"** button on your chosen voice
   - You'll see a green confirmation showing your selection
   - Click **"Change Voice"** if you want to pick a different one

4. Click **"Next"** to proceed to configuration

**Pro Tips**:
- Choose a voice that matches your brand personality
- Consider your target audience's location (accents matter!)
- Preview multiple voices before deciding
- Professional voices work best for business applications

---

### Stage 2: Agent Configuration ⚙️

**Purpose**: Define your agent's personality, behavior, and language

**What You'll Configure**:

#### 1. **Agent Name** (Required)
- Give your agent a descriptive name
- Examples:
  - "Customer Support Agent"
  - "Sales Qualification Bot"
  - "Appointment Scheduler"
  - "Lead Capture Assistant"

#### 2. **Primary Language** (Required)
- Select the default language for your agent
- **Important**: Your agent will automatically detect and respond in ALL 29 supported languages
- The primary language is just a fallback
- Supported languages include:
  - 🇺🇸 English, 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German, 🇮🇹 Italian, 🇵🇹 Portuguese
  - 🇵🇱 Polish, 🇮🇳 Hindi, 🇯🇵 Japanese, 🇨🇳 Chinese, 🇰🇷 Korean, 🇳🇱 Dutch
  - 🇹🇷 Turkish, 🇸🇪 Swedish, 🇮🇩 Indonesian, 🇵🇭 Filipino, 🇺🇦 Ukrainian
  - 🇬🇷 Greek, 🇨🇿 Czech, 🇷🇴 Romanian, 🇩🇰 Danish, 🇧🇬 Bulgarian
  - 🇲🇾 Malay, 🇸🇰 Slovak, 🇸🇦 Arabic, 🇮🇳 Tamil, 🇫🇮 Finnish, 🇷🇺 Russian, 🇳🇴 Norwegian

#### 3. **System Prompt** (Required)
This is the **most important** field! It defines how your agent behaves.

**Good System Prompt Example**:
```
You are a friendly customer support agent for Acme Corp, a home remodeling company.

Your role is to:
- Help customers with product questions
- Check order status
- Process returns and exchanges
- Schedule appointments for consultations

Always be polite, helpful, and professional. If you don't know something, offer to connect them with a specialist. Never make promises about pricing without checking first.
```

**What to Include**:
- Agent's role and purpose
- Company/brand name
- What the agent CAN do
- What the agent CANNOT do
- Tone and personality guidelines
- Handling instructions for common scenarios

**What NOT to Do**:
- ❌ "You are a helpful assistant" (too vague)
- ❌ Short, generic prompts
- ❌ Missing context about your business

#### 4. **First Message** (Greeting)
- What your agent says when someone first calls/contacts them
- Keep it friendly and clear
- Examples:
  - "Hello! I'm Sarah from Acme Corp. How can I help you today?"
  - "Hi there! Thanks for calling. I'm here to assist with any questions about our services."
  - "Good day! I'm your virtual assistant. What brings you here today?"

#### 5. **Advanced Settings** (Optional)
Click to expand:

**Temperature** (0 to 1):
- `0.0-0.3`: Very focused, predictable, factual (good for support/FAQ)
- `0.4-0.7`: Balanced creativity and consistency (recommended)
- `0.8-1.0`: More creative and varied (good for sales/engagement)

**Max Tokens** (100 to 2000):
- Controls response length
- Lower = shorter, concise responses
- Higher = longer, detailed responses
- Recommended: 500 for most use cases

**When to Click Next**:
- Agent name is filled
- System prompt is complete
- First message is set
- You've reviewed advanced settings (if needed)

---

### Stage 3: Knowledge Base 📚

**Purpose**: Give your agent access to information and data

**What You Can Add**:

#### Option 1: Upload Documents 📄
Upload files to give your agent knowledge:

**Supported Formats**:
- PDF files (.pdf)
- Word documents (.doc, .docx)
- Text files (.txt)
- Spreadsheets (.csv, .xls, .xlsx)

**What to Upload**:
- Price lists
- Product catalogs
- FAQs
- Company policies
- Service menus
- Technical specifications
- User manuals

**How to Upload**:
1. Click **"Choose File"**
2. Select your document
3. Wait for upload to complete
4. You'll see it in the "Added Knowledge Bases" list

#### Option 2: Add Website URLs 🌐
Scrape content from any public website:

**Examples**:
- Your company website
- Product pages
- Blog articles
- Documentation pages
- Help centers

**How to Add**:
1. Enter the full URL (e.g., `https://example.com`)
2. Click **"Add URL"**
3. The system will scrape and process the content

**Best Practices**:
- Use specific pages, not just the homepage
- Ensure the website is publicly accessible
- Avoid pages behind logins

#### Option 3: Import Google Sheets 📊
Connect data from Google Sheets:

**Use Cases**:
- Product inventory
- Pricing tables
- Service listings
- Team availability
- Location information

**How it Works** (Coming Soon):
1. Click **"Connect Sheets"**
2. Authenticate with Google
3. Select your spreadsheet
4. Data syncs automatically

#### Managing Knowledge Bases
- View all added knowledge in the list
- Remove any by clicking the **X** button
- Add multiple sources (recommended!)

**Why This Matters**:
- Agents with knowledge give accurate, specific answers
- Without knowledge, agents can only provide general responses
- More context = better customer experience

**This Stage is Optional**:
- You can skip it and add knowledge later
- But it's highly recommended for production agents

---

### Stage 4: Test & Deploy 🚀

**Purpose**: Test your agent and deploy to production

**What You'll See**:

#### Agent Summary
Review your configuration:
- Agent name
- Selected voice
- Primary language
- Number of knowledge bases added

**Double-check everything before deploying!**

#### Test Options

You have 3 ways to test:

##### 1. Test Call ☎️
Receive a live phone call from your agent:

1. Select **"Test Call"**
2. Enter your phone number (format: +1 555-123-4567)
3. Click **"Call Me Now"**
4. Answer the phone and have a conversation
5. Evaluate the agent's performance

**What to Test**:
- Voice quality
- Response accuracy
- Conversation flow
- Knowledge base integration

##### 2. Test SMS 💬
Send a test text message:

1. Select **"Test SMS"**
2. Enter your phone number
3. Write a test message (optional)
4. Click **"Send Test SMS"**
5. Check your phone for the message

**Use Case**: Test SMS notifications or text-based interactions

##### 3. Test Email ✉️
Send a test email:

1. Select **"Test Email"**
2. Enter your email address
3. Write a test message (optional)
4. Click **"Send Test Email"**
5. Check your inbox

**Use Case**: Test email follow-ups or agent-triggered emails

#### Deploy Your Agent

When you're ready:

1. Review all settings one final time
2. Complete at least one test
3. Click **"Deploy Agent"** (green button)
4. Your agent is now live and ready to use!

**After Deployment**:
- You'll be redirected to the agent detail page
- The agent will appear in your Agent Studio dashboard
- You can make calls, check analytics, and manage settings

---

## Understanding the Progress Indicator

At the top of the wizard, you'll see 4 circles representing each stage:

- **Gray circle**: Not started
- **Purple circle with ring**: Current stage
- **Green circle with checkmark**: Completed stage
- **Green line**: Completed connection

You can see your progress at a glance!

---

## Help & Documentation

### Toggling Help
- Click **"Show/Hide Help"** in the top right
- Blue help panels appear under the progress indicator
- Each stage has specific guidance

### Inline Tooltips
Look for these throughout the wizard:
- ℹ️ Blue info boxes with pro tips
- ⚠️ Yellow warning boxes with important notes
- ✅ Green success messages when actions complete

---

## Common Questions

### Q: Can I save my progress and come back later?
**A**: Currently, the wizard must be completed in one session. However, you can always edit agents after creation.

### Q: What happens if I make a mistake?
**A**: You can always go back using the **"Back"** button, or edit the agent after deployment.

### Q: How many languages does my agent support?
**A**: All agents support **29 languages with automatic detection**. The primary language is just a fallback.

### Q: Do I need to add knowledge bases?
**A**: It's optional but **highly recommended**. Agents with knowledge provide much better, more accurate responses.

### Q: Can I change the voice after deployment?
**A**: Yes! Edit the agent from the Agent Studio dashboard and select a new voice.

### Q: How do I know if my agent is working?
**A**: Use the **Test Call** feature in Stage 4. Have a real conversation with your agent before deploying.

---

## Best Practices

### Voice Selection
✅ **DO**:
- Preview multiple voices
- Match voice to brand personality
- Consider target audience demographics

❌ **DON'T**:
- Rush the selection
- Choose based on name alone
- Ignore accent considerations

### System Prompt
✅ **DO**:
- Be specific about the agent's role
- Include company/product context
- Define boundaries (what NOT to do)
- Use examples of good responses
- Keep it clear and concise

❌ **DON'T**:
- Write vague, generic prompts
- Forget to mention your business
- Make it too long (keep under 500 words)
- Use jargon without explanation

### Knowledge Base
✅ **DO**:
- Upload your most current price lists
- Add FAQs and common questions
- Include product/service details
- Use multiple sources

❌ **DON'T**:
- Upload confidential information
- Use outdated documents
- Forget to update when things change
- Rely on one source only

### Testing
✅ **DO**:
- Test with real scenarios
- Ask common customer questions
- Try edge cases
- Get feedback from team members

❌ **DON'T**:
- Skip testing
- Test only basic questions
- Deploy without verifying knowledge
- Forget to test different languages

---

## Troubleshooting

### "Can't proceed to next stage"
**Problem**: Next button is disabled

**Solutions**:
- **Stage 1**: Make sure you selected a voice
- **Stage 2**: Fill in all required fields (name and prompt)
- **Stage 3**: This stage is optional, you can skip
- **Stage 4**: This is the final stage

### "Voice preview not working"
**Problem**: Can't hear voice samples

**Solutions**:
- Check your device volume
- Ensure browser allows audio playback
- Try a different voice
- Refresh the page

### "File upload failed"
**Problem**: Document upload doesn't complete

**Solutions**:
- Check file size (must be under 50MB)
- Verify file format (PDF, DOC, DOCX, TXT, CSV, XLS, XLSX only)
- Try a smaller file
- Check internet connection

### "Test call not received"
**Problem**: Phone doesn't ring during test

**Solutions**:
- Verify phone number format (+1 555-123-4567)
- Check if phone can receive calls
- Wait 30 seconds, calls can take time
- Check spam/blocked numbers
- Ensure you have active phone service

---

## Technical Details

### Multi-Language Support
- **29 languages** supported via ElevenLabs
- **Automatic language detection** enabled by default
- Agent responds in detected language
- Falls back to primary language if detection fails

### Knowledge Base Processing
- Documents are processed using RAG (Retrieval-Augmented Generation)
- Content is chunked and embedded for semantic search
- Agent searches knowledge in real-time during conversations
- Supports both exact and semantic matching

### Security & Privacy
- All data encrypted in transit and at rest
- Knowledge bases are user-specific (not shared)
- Call recordings can be disabled
- Comply with GDPR and privacy regulations

---

## Support

Need help? Here's how to get support:

1. **In-App Help**: Click the help button (?) throughout the wizard
2. **Documentation**: Visit `/docs` for comprehensive guides
3. **Support Ticket**: Navigate to Settings > Support
4. **Community**: Join our Discord for tips and best practices

---

## Next Steps After Creation

Once your agent is deployed:

1. **Monitor Performance**:
   - Check call analytics
   - Review conversation transcripts
   - Track success metrics

2. **Optimize**:
   - Update knowledge bases
   - Refine system prompt based on conversations
   - Adjust temperature if needed
   - Add more test scenarios

3. **Scale**:
   - Create additional agents for different use cases
   - Set up workflows and automations
   - Integrate with CRM and other tools
   - Add team members

4. **Maintain**:
   - Update knowledge quarterly (or as needed)
   - Review and improve prompts monthly
   - Test regularly with new scenarios
   - Keep pricing and info current

---

## Version History

**v1.0.0** - Initial release
- 4-stage wizard workflow
- Voice library browser
- Multi-language configuration
- Knowledge base integration
- Test call/SMS/email features
- Inline documentation and help

---

*Happy Agent Building! 🎉*
