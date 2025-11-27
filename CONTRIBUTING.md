# Contributing to VoiceNow CRM

First off, thank you for considering contributing to VoiceNow CRM! It's people like you that make VoiceNow CRM such a great tool.

## 🌟 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed** and what you expected to see
- **Include details about your configuration and environment**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List some examples** of how it would be used

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding style** of the project
3. **Add tests** for any new features
4. **Update documentation** as needed
5. **Ensure the test suite passes**
6. **Make sure your code lints**
7. **Issue the pull request**

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Git

### Setup Steps

1. Fork and clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/voiceflow-crm.git
   cd voiceflow-crm
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`

4. Start the development server
   ```bash
   npm run dev
   ```

## 📝 Coding Guidelines

### JavaScript/React Style

- Use **ES6+ features** (arrow functions, destructuring, etc.)
- Use **functional components** with hooks instead of class components
- Follow **camelCase** for variables and functions
- Follow **PascalCase** for components
- Use **meaningful variable names**

```javascript
// Good
const handleUserLogin = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

// Bad
const func1 = async (c) => {
  const r = await api.post('/auth/login', c);
  return r.data;
};
```

### Component Structure

```javascript
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const MyComponent = ({ prop1, prop2 }) => {
  // Hooks first
  const [state, setState] = useState(null);

  useEffect(() => {
    // Side effects
  }, []);

  // Helper functions
  const handleClick = () => {
    // Handle click
  };

  // Return JSX
  return (
    <div>
      {/* Component content */}
    </div>
  );
};

MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number
};

export default MyComponent;
```

### Backend Code Style

- Use **async/await** instead of callbacks
- Add **error handling** to all routes
- Use **try-catch blocks** appropriately
- Return **consistent response formats**

```javascript
// Good
router.post('/api/resource', protect, async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data is required'
      });
    }

    const result = await Service.create(data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resource',
      error: error.message
    });
  }
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Test edge cases and error conditions

```javascript
describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };
    const user = await UserService.create(userData);

    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });

  it('should throw error for invalid email', async () => {
    const userData = { email: 'invalid-email', name: 'Test User' };

    await expect(UserService.create(userData)).rejects.toThrow();
  });
});
```

## 📖 Documentation

- Update the README.md if you change functionality
- Add JSDoc comments for new functions
- Update API documentation for new endpoints
- Include inline comments for complex logic

```javascript
/**
 * Authenticates a user and returns a JWT token
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{token: string, user: Object}>} Authentication result
 * @throws {Error} If credentials are invalid
 */
async function authenticateUser(email, password) {
  // Implementation
}
```

## 🔀 Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests after the first line

```bash
# Good
git commit -m "Add user authentication feature

- Implement JWT token generation
- Add login and registration endpoints
- Create protected route middleware

Closes #123"

# Bad
git commit -m "fixed stuff"
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(auth): add Google OAuth integration

- Add Google OAuth strategy
- Create callback route
- Update login page with Google button

Closes #456
```

## 🏷️ Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/what-changed` - Code refactoring
- `test/what-added` - Test additions/updates

## ✅ Pull Request Checklist

Before submitting your PR, make sure:

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code commented, particularly in complex areas
- [ ] Documentation updated (if needed)
- [ ] No new warnings generated
- [ ] Tests added for new features
- [ ] All tests passing
- [ ] PR title is clear and descriptive
- [ ] PR description explains what and why

## 🚀 Release Process

1. Version bump in `package.json`
2. Update CHANGELOG.md
3. Create a release branch
4. Tag the release
5. Deploy to production

## 💬 Communication

- **GitHub Issues** - Bug reports and feature requests
- **Pull Requests** - Code review and discussion
- **Discord** - Real-time chat and community support
- **Email** - help.remodely@gmail.com

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (coming soon)

## ❓ Questions?

Feel free to:
- Open an issue with the `question` label
- Join our Discord community
- Email us at help.remodely@gmail.com

Thank you for contributing to VoiceNow CRM! 🎉
