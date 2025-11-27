# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open-source release
- AI voice agent creation with ElevenLabs integration
- Visual workflow builder powered by n8n
- Built-in CRM with lead management and pipeline
- One-click agent templates (Sales, Appointment, Support, Lead Nurturing)
- Quick test call feature
- Google OAuth authentication
- Stripe payment integration
- Twilio phone number integration
- Team collaboration with built-in messaging
- Real-time call tracking and analytics
- Comprehensive documentation for contributors

### Features
- **Agent Management**: Create, edit, and deploy AI voice agents
- **Workflow Automation**: Drag-and-drop visual workflow builder
- **CRM**: Lead scoring, deal pipeline, contact management
- **Analytics**: Call logs, transcripts, sentiment analysis
- **Integrations**: Stripe, Twilio, Google Calendar, QuickBooks
- **Security**: JWT authentication, role-based access control

## [1.0.0] - 2025-01-15

### Added
- Initial release of VoiceNow CRM
- Core voice agent functionality
- Basic CRM features
- Payment processing with Stripe
- User authentication

---

## Release Process

1. Update version in `package.json`
2. Update this CHANGELOG.md
3. Create a new release branch: `git checkout -b release/vX.X.X`
4. Tag the release: `git tag vX.X.X`
5. Push tags: `git push origin vX.X.X`
6. Create GitHub release with release notes

[Unreleased]: https://github.com/yourusername/voiceflow-crm/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/voiceflow-crm/releases/tag/v1.0.0
