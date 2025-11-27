# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of VoiceNow CRM seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do:

- Email us at **help.remodely@gmail.com** with the subject line "SECURITY: [Brief Description]"
- Provide detailed steps to reproduce the vulnerability
- Include the potential impact of the vulnerability
- Suggest a fix if possible

### Please Don't:

- Open a public GitHub issue for security vulnerabilities
- Publicly disclose the vulnerability before we've had a chance to address it
- Attempt to exploit the vulnerability beyond what is necessary to demonstrate it

## Response Timeline

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a more detailed response within 7 days
- We will work to fix verified vulnerabilities as quickly as possible
- We will notify you when the vulnerability is fixed

## Security Best Practices

### For Users

1. **Keep your installation updated** - Always use the latest version
2. **Use strong passwords** - Enable 2FA if available
3. **Protect your API keys** - Never commit them to version control
4. **Use HTTPS** - Always use secure connections in production
5. **Review access logs** - Monitor for suspicious activity

### For Contributors

1. **Never commit secrets** - Use environment variables
2. **Sanitize user input** - Prevent XSS and injection attacks
3. **Validate all data** - Both client and server-side
4. **Use parameterized queries** - Prevent SQL injection
5. **Keep dependencies updated** - Run `npm audit` regularly

## Security Features

### Authentication
- JWT-based authentication
- Google OAuth 2.0 support
- Password hashing with bcrypt
- Session management with Redis

### Data Protection
- Encryption in transit (TLS/HTTPS)
- Encryption at rest for sensitive data
- Environment variable protection
- API key rotation support

### Access Control
- Role-based access control (RBAC)
- User permission levels
- API rate limiting
- Request validation

### Monitoring
- Audit logs for sensitive operations
- Failed login attempt tracking
- Suspicious activity detection
- Error logging without exposing sensitive data

## Vulnerability Disclosure Policy

- We request that you give us reasonable time to investigate and address the vulnerability
- We will acknowledge your contribution in our security advisories
- We may offer a bounty for significant vulnerabilities (case-by-case basis)

## Security Updates

Security updates will be released as patch versions and announced via:
- GitHub Security Advisories
- Email to registered users
- Discord community announcements
- Release notes in CHANGELOG.md

## Contact

For security-related questions or concerns:
- **Email**: help.remodely@gmail.com
- **Subject**: "SECURITY: [Your Topic]"

## Hall of Fame

We appreciate the efforts of security researchers who help us keep VoiceNow CRM secure. Contributors who report valid security issues will be listed here (with their permission):

<!-- This section will be updated as we receive security reports -->

---

Thank you for helping keep VoiceNow CRM and our users safe!
