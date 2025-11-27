# n8n-nodes-voiceflow

This is an n8n community node that provides VoiceNow CRM integration with n8n.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Features

- **Inbound Call Trigger**: Trigger workflows when calls are received on your Twilio numbers
- **Phone Number Dropdown**: Select from your existing Twilio phone numbers with a simple dropdown
- **Automatic Data Extraction**: Extract customer information, transcripts, and call details
- **No Manual Configuration**: Pre-configured to work with your VoiceNow CRM instance

## Installation

### In n8n Cloud

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-voiceflow` and click install

### In self-hosted n8n

Navigate to your n8n installation directory and run:

```bash
npm install n8n-nodes-voiceflow
```

Then restart n8n.

### Manual Installation (Development)

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Link the package: `npm link`
5. In your n8n installation: `npm link n8n-nodes-voiceflow`
6. Restart n8n

## Configuration

1. In n8n, go to **Credentials > New Credential**
2. Search for "VoiceNow CRM API"
3. Enter your VoiceNow CRM details:
   - **API URL**: Your VoiceFlow instance URL (e.g., `https://remodely.ai`)
   - **API Key**: Your API key from VoiceFlow Settings > API Keys

## Usage

### Inbound Call Trigger

1. Add the "VoiceFlow Inbound Call" node to your workflow
2. Select your VoiceFlow API credentials
3. Choose a phone number from the dropdown
4. Select what data you want to extract from calls
5. Connect other nodes to process the call data
6. Activate your workflow

When a call is received on the selected number, the workflow will trigger with the call data.

## Example Workflows

### Save Lead and Notify Team

```
Inbound Call → Save Lead to CRM → Send Slack Message → Create Follow-up Task
```

### Route High-Value Leads

```
Inbound Call → IF (budget >= $20k) → Send SMS to Sales Manager
                                   → Create High-Priority Task
```

## License

[MIT](LICENSE.md)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [VoiceNow CRM Documentation](https://remodely.ai/docs)
