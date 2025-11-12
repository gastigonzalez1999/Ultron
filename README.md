# Ultron - AI-Powered Paydock Flow Testing Assistant

An intelligent testing platform for Paydock API flows, featuring AI-powered flow generation, visual flow editing, and comprehensive testing capabilities for payments, subscriptions, customers, and more.

## Features

### AI-Powered Flow Generation
- **Natural Language Flow Creation**: Describe flows in plain English
- **Smart Flow Suggestions**: AI analyzes and improves existing flows
- **Natural Language Execution**: Modify flows using conversational commands
- **Intelligent Error Handling**: AI suggests fixes for common issues

### Visual Flow Editor
- **Drag & Drop Interface**: Create flows visually with react-flow
- **Step-by-Step Execution**: Execute flows one step at a time
- **Real-time Debugging**: Visual highlighting of current execution step
- **Branching Logic**: Support for conditional flows with if/else paths
- **Undo/Redo**: Full history management with keyboard shortcuts

### Environment Management
- **Multi-Environment Support**: Local development and staging-11 environments
- **Secure Configuration**: Environment-specific API keys and settings
- **Template System**: Pre-built flow templates for common scenarios
- **Variable Substitution**: Dynamic values using `{{variable_name}}` syntax

### Comprehensive Testing
- **Paydock API Integration**: Full support for all Paydock endpoints
- **Payment Testing**: Cards, wallets, subscriptions, and more
- **3DS Authentication**: Complete 3D Secure flow testing
- **Webhook Testing**: End-to-end webhook verification
- **Error Scenario Testing**: Comprehensive failure mode testing

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and react-flow
- **Backend**: NestJS with TypeScript and OpenAI integration
- **AI**: OpenAI GPT-4 for flow generation and suggestions
- **Flow Engine**: Custom execution engine with branching support
- **Environment Management**: Secure multi-environment configuration

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for AI features)
- Paydock API credentials

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd Ultron
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Backend configuration
   cp backend/env.example backend/.env
   # Edit backend/.env with your Paydock and OpenAI credentials

   # Required variables:
   # - PAYDOCK_LOCAL_API_KEY (for local development)
   # - PAYDOCK_STAGING_API_KEY (for staging-11 environment)
   # - OPENAI_API_KEY (optional, for AI features)
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Development Commands

- **Frontend only**: `npm run dev:frontend`
- **Backend only**: `npm run dev:backend`
- **Build**: `npm run build`

## Usage Guide

### 1. AI-Powered Flow Generation

**Create flows with natural language:**
```
"Create a flow to test customer creation and charging"
"Generate a subscription test with webhook verification"
"Test the complete payment flow with error handling"
```

**Get AI suggestions for existing flows:**
- Load any flow
- Click "AI Suggestions" button
- Apply improvements automatically

**Modify flows with natural language:**
- Click "Natural Language" button
- Type: "Change amount to $50" or "Add error handling"
- AI modifies the flow accordingly

### 2. Visual Flow Editor

**Create flows visually:**
- Drag and drop steps from the sidebar
- Connect steps with edges
- Configure conditions and branching
- Use templates for quick start

**Execute and debug:**
- Run entire flows or step-by-step
- Visual highlighting shows current step
- Real-time execution results
- Error handling and retry logic

### 3. Environment Management

**Configure environments:**
- Local development: `http://localhost:1337`
- Staging-11: `https://apista-11.paydock.com`
- Environment-specific API keys and settings

**Use templates:**
- Pre-built flows for common scenarios
- Customizable with your gateway IDs
- Save and share custom templates

## Configuration

### Required Environment Variables

**Backend (`backend/.env`):**
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Paydock API Configuration
PAYDOCK_LOCAL_BASE_URL=http://localhost:1337
PAYDOCK_LOCAL_API_KEY=your_local_paydock_secret_key_here
PAYDOCK_STAGING_BASE_URL=https://apista-11.paydock.com
PAYDOCK_STAGING_API_KEY=your_staging_paydock_secret_key_here

# Gateway and Service IDs
GATEWAY_ID=your_gateway_id_here
MPGS_SERVICE=your_mpgs_gateway_id_here
GPAYMENTS_SERVICE=your_gpayments_service_id_here
FORTER_SERVICE_ID=your_forter_service_id_here
```

### Gateway Setup

Configure your Paydock gateway IDs for different payment methods:
- **MPGS**: Card payments and verification
- **GPayments**: 3DS authentication
- **Forter**: Fraud detection
- **Wallets**: Digital wallet payments

## Example Flows

### Basic Customer Flow
```json
{
  "steps": [
    {
      "description": "Create customer",
      "apiCall": {
        "method": "POST",
        "url": "{{baseUrl}}/v1/customers",
        "body": {
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com"
        }
      }
    },
    {
      "description": "Create charge",
      "apiCall": {
        "method": "POST",
        "url": "{{baseUrl}}/v1/charges",
        "body": {
          "amount": 1000,
          "currency": "USD",
          "customer_id": "{{customer_id}}"
        }
      }
    }
  ]
}
```

### Complex Branching Flow
- Conditional logic based on API responses
- Error handling with "else" paths
- Variable extraction and reuse
- Webhook verification steps

## API Endpoints

### Flow Management
- `POST /api/ask` - AI-powered flow generation
- `POST /api/ask/suggestions` - Get flow improvement suggestions
- `POST /api/ask/execute-natural-language` - Natural language flow modification

### Flow Execution
- `POST /api/execution/execute` - Execute complete flow
- `POST /api/execution/execute-step` - Execute single step
- `GET /api/execution/status` - Get execution status

### Environment Management
- `GET /api/environments` - Get available environments
- `POST /api/environments/switch` - Switch active environment

## Current Status

### Fully Implemented
- AI-powered flow generation and suggestions
- Visual flow editor with react-flow
- Multi-environment support (local, staging-11)
- Step-by-step execution and debugging
- Template system and variable substitution
- Undo/redo functionality
- Branching logic with conditional flows
- Paydock API integration
- Real-time execution feedback

### In Development
- Advanced flow templates
- Performance optimization
- Enhanced error handling
- Team collaboration features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Open a GitHub issue
- Check the documentation
- Contact the development team

## Related Links

- [Paydock API Documentation](https://docs.paydock.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Flow Documentation](https://reactflow.dev/)
