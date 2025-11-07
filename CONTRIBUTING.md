# Contributing to Ultron

Thank you for your interest in contributing to Ultron! This document provides guidelines and instructions for contributing to the project.

## Development Workflow

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- OpenAI API key (optional, for AI features)
- Paydock API credentials (for testing)

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ultron.git
   cd ultron
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Set Up Environment**
   ```bash
   # Backend environment
   cp backend/env.example backend/.env
   # Edit backend/.env with your credentials
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

### Project Structure

```
ultron/
├── backend/          # NestJS backend API
│   ├── src/
│   │   ├── ask/      # AI-powered flow generation
│   │   ├── auth/     # Authentication service
│   │   ├── config/   # Environment configuration
│   │   ├── execution/# Flow execution engine
│   │   └── flows/    # Flow templates and management
│   └── package.json
├── frontend/         # Next.js frontend
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utility functions
│   └── package.json
└── package.json      # Root workspace config
```

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

3. **Test Your Changes**
   - Test backend: `cd backend && npm test`
   - Test frontend: `cd frontend && npm run build`
   - Manual testing with real API calls

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Follow conventional commit format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

5. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

#### TypeScript/JavaScript
- Use TypeScript for type safety
- Use meaningful variable and function names
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises
- Handle errors appropriately

#### React Components
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper TypeScript interfaces for props

#### Backend Services
- Follow NestJS conventions
- Use dependency injection
- Add proper logging for debugging
- Validate input data
- Handle errors gracefully

### Testing Guidelines

- Write unit tests for utility functions
- Test API endpoints with real scenarios
- Test error cases and edge conditions
- Verify environment switching works correctly
- Test variable substitution in flows

### Pull Request Process

1. **Before Submitting**
   - Ensure code builds without errors
   - Test your changes thoroughly
   - Update README if needed
   - Add comments to complex code

2. **PR Description**
   - Describe what changes you made
   - Explain why the changes were needed
   - List any breaking changes
   - Include screenshots for UI changes

3. **Review Process**
   - Address reviewer feedback
   - Make requested changes
   - Keep discussion professional and constructive

### Reporting Issues

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Error messages or logs
- Screenshots if applicable

### Feature Requests

For feature requests, please:
- Describe the feature clearly
- Explain the use case
- Provide examples if possible
- Discuss potential implementation

### Questions?

If you have questions:
- Check existing issues and discussions
- Read the README and documentation
- Open a new issue with the "question" label

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

Thank you for contributing to Ultron!

