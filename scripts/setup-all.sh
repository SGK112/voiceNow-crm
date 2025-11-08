#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   VoiceFlow CRM - Complete Setup Script                   ║"
echo "║   Creates ElevenLabs Agents + N8N Master Workflows        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "📂 Project root: $PROJECT_ROOT"
echo ""

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "❌ Error: .env file not found at $PROJECT_ROOT/.env"
    echo "Please create a .env file with your API credentials first."
    exit 1
fi

echo "✅ Found .env file"
echo ""

# Function to ask user for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    return 0
}

# Step 1: Setup ElevenLabs Agents
echo "═══════════════════════════════════════════════════════════"
echo "  Step 1: Create ElevenLabs AI Agents"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This will create 5 conversational AI agents in ElevenLabs:"
echo "  • Lead Generation Agent"
echo "  • Appointment Booking Agent"
echo "  • Collections Agent"
echo "  • Promotional Campaign Agent"
echo "  • Customer Support Agent"
echo ""

if confirm "Create ElevenLabs agents?"; then
    echo ""
    echo "🚀 Creating ElevenLabs agents..."
    node "$SCRIPT_DIR/setup-elevenlabs-agents.js"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ElevenLabs agents created successfully!"
        echo ""
        echo "⚠️  IMPORTANT: Update your .env file with the Agent IDs shown above"
        echo ""

        if confirm "Have you updated the .env file with Agent IDs?"; then
            echo "✅ Great! Continuing..."
        else
            echo "⚠️  Please update .env before proceeding to the next step"
            exit 0
        fi
    else
        echo "❌ Failed to create ElevenLabs agents"
        echo "Please check the error messages above and try again"
        exit 1
    fi
else
    echo "⏭️  Skipping ElevenLabs agent creation"
fi

echo ""
echo ""

# Step 2: Setup N8N Workflows
echo "═══════════════════════════════════════════════════════════"
echo "  Step 2: Create N8N Master Workflows"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This will create 5 master workflows in n8n cloud:"
echo "  • Master: Save Lead to CRM"
echo "  • Master: Send SMS After Call"
echo "  • Master: Book Appointment"
echo "  • Master: Slack Notification"
echo "  • Master: Send Follow-up Email"
echo ""

if confirm "Create n8n workflows?"; then
    echo ""
    echo "🚀 Creating n8n workflows..."
    node "$SCRIPT_DIR/setup-n8n-workflows.js"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ N8N workflows created successfully!"
    else
        echo "❌ Failed to create n8n workflows"
        echo "Please check the error messages above and try again"
        exit 1
    fi
else
    echo "⏭️  Skipping n8n workflow creation"
fi

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🎉 Setup Complete!                                       ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Final Steps:"
echo ""
echo "1. ElevenLabs Configuration:"
echo "   • Go to: https://elevenlabs.io/app/conversational-ai"
echo "   • For each agent, configure a phone number"
echo "   • Set webhook URL: https://your-domain.com/api/webhooks/elevenlabs/call-completed"
echo ""
echo "2. N8N Configuration:"
echo "   • Go to: https://remodely.app.n8n.cloud"
echo "   • Add credentials for: Twilio, Google Calendar, Slack, SendGrid"
echo "   • Activate each workflow (toggle switch)"
echo ""
echo "3. Test Your Setup:"
echo "   • Call one of your ElevenLabs phone numbers"
echo "   • Check your backend logs for webhook receipt"
echo "   • Verify workflow execution in n8n"
echo "   • Check that actions completed (Slack message, SMS, etc.)"
echo ""
echo "📚 For detailed instructions, see:"
echo "   • N8N_SETUP_GUIDE.md"
echo "   • README.md"
echo ""
echo "✨ Your multi-tenant AI CRM is ready to use!"
echo ""
