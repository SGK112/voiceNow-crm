# VoiceNow CRM by Remodely.ai

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)

> AI-powered voice agents with visual workflow automation. Transform your business communication.

VoiceNow CRM is an open-source platform that combines ElevenLabs' advanced AI voice technology with n8n-style visual workflow automation and a powerful CRM system. Build intelligent voice agents that can qualify leads, book appointments, and provide customer support 24/7 - all without writing code.

## 🌟 Features

- **🤖 AI Voice Agents**: One-click agent creation with ElevenLabs integration
- **🔄 Visual Workflows**: Drag-and-drop workflow builder powered by n8n
- **📊 Built-in CRM**: Lead management, pipeline tracking, and deal analytics
- **⚡ Quick Testing**: Instant test calls to verify agent behavior
- **🔗 Integrations**: Stripe, Twilio, Google Calendar, QuickBooks, and more
- **💬 Team Collaboration**: Built-in messaging with Slack integration
- **📈 Analytics**: Real-time call tracking and performance metrics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- Redis server
- ElevenLabs API key
- Twilio account (optional, for phone numbers)
- Stripe account (optional, for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voiceflow-crm.git
   cd voiceflow-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string
   REDIS_URL=your_redis_url

   # ElevenLabs
   ELEVENLABS_API_KEY=your_elevenlabs_api_key

   # Authentication
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Optional Services
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   STRIPE_SECRET_KEY=your_stripe_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API on `http://localhost:5001`
   - Frontend on `http://localhost:5173`

5. **Open your browser**

   Navigate to `http://localhost:5173` to see the app!

## 📚 Documentation

- **[Development Guide](DEVELOPMENT.md)** - Technical documentation for developers
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines
- **[API Documentation](docs/API.md)** - REST API reference
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Redis** for caching
- **JWT** for authentication
- **Stripe** for payments

### AI & Automation
- **ElevenLabs** - AI voice technology
- **n8n** - Workflow automation
- **OpenAI/Gemini** - Conversational AI

## 📦 Project Structure

```
voiceflow-crm/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context
│   │   └── styles/       # CSS files
│   └── public/           # Static assets
├── backend/              # Node.js backend
│   ├── controllers/      # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── middleware/      # Express middleware
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repository

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 🧪 Testing

```bash
# Run backend tests
npm run test

# Run frontend tests
npm run test:frontend

# Run all tests
npm run test:all
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io/) for amazing voice AI technology
- [n8n](https://n8n.io/) for workflow automation inspiration
- [Stripe](https://stripe.com/) for payment processing
- All our amazing [contributors](https://github.com/yourusername/voiceflow-crm/graphs/contributors)

## 💬 Community & Support

- **Discord**: [Join our community](https://discord.gg/voiceflow-crm)
- **Twitter**: [@RemodelAI](https://twitter.com/RemodelAI)
- **Email**: help.remodely@gmail.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/voiceflow-crm/issues)

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Self-hosted deployment guides
- [ ] Webhook marketplace
- [ ] API client libraries (Python, JavaScript, Go)
- [ ] Enterprise SSO support

## ⚡ Quick Links

- [Live Demo](https://demo.remodely.ai)
- [Documentation](https://docs.remodely.ai)
- [API Reference](https://api.remodely.ai/docs)
- [Blog](https://blog.remodely.ai)

---

<p align="center">
  Made with ❤️ by the Remodely.ai team and contributors
</p>

<p align="center">
  <a href="https://github.com/yourusername/voiceflow-crm/stargazers">⭐ Star us on GitHub</a>
</p>
