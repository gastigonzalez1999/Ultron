import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface TestStep {
  step: number;
  description: string;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  dashboardAction?: string;
  documentation?: string;
  outgoingEdges?: FlowEdge[];
}

export interface FlowEdge {
  targetStep: number;
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
    stepNumber: number;
  };
  isElse?: boolean;
  label?: string;
}

export interface FlowSuggestion {
  type: 'improvement' | 'warning' | 'optimization' | 'security';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedCode?: any;
}

export interface DebugAnalysis {
  rootCause: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFixes: DebugFix[];
  relatedIssues: string[];
  preventionTips: string[];
  stepNumber?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface DebugFix {
  title: string;
  description: string;
  codeExample?: any;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  type: 'code' | 'configuration' | 'data' | 'process';
}

export interface DebugPrediction {
  issue: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  description: string;
  preventionSteps: string[];
}

export interface ExecutionResult {
  step: number;
  description: string;
  result: {
    success: boolean;
    statusCode?: number;
    response?: any;
    error?: string;
    duration?: number;
    timestamp: Date;
  };
  apiCall?: any;
  dashboardAction?: string;
}

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.logger.log('OpenAI client initialized successfully');
    } else {
      this.logger.warn('OPENAI_API_KEY not found - AI features will be disabled');
    }
  }

  async processPrompt(prompt: string): Promise<{ response: string; testSteps?: TestStep[] }> {
    if (!this.openai) {
      return {
        response: `🤖 **AI Assistant Temporarily Unavailable**

I'm currently running without AI capabilities because no OpenAI API key is configured.

**To enable AI features:**
1. Add your OpenAI API key to the \`.env\` file:
   \`\`\`env
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

2. Restart the backend server

**For now, you can:**
- Use the **Flow Templates** below to test common Paydock flows
- Manually create test steps
- Execute existing test flows

Would you like me to show you some example flow templates?`,
      };
    }

    try {
      const systemPrompt = `You are a fintech QA assistant that generates executable test flows for Paydock API testing.

When given a flow description, generate a JSON array of test steps that can be executed directly.

**Flow Structure:**
Each step should have:
- step: sequential number (1, 2, 3...)
- description: clear description of what this step does
- apiCall: (optional) API call details
  - method: HTTP method (GET, POST, PUT, DELETE)
  - url: full API endpoint URL
  - headers: object with headers (include x-user-secret-key: {{secretKey}})
  - body: (optional) request body for POST/PUT
- dashboardAction: (optional) manual dashboard action description
- outgoingEdges: (optional) array of edges for branching
  - targetStep: which step to go to next
  - condition: (optional) condition to evaluate
    - field: response field to check (e.g., "resource.data.status")
    - operator: equals, not_equals, contains, greater_than, less_than
    - value: expected value
    - stepNumber: which step's response to check
  - isElse: (optional) if true, this is the "else" path
  - label: (optional) human-readable label

**Common Paydock Endpoints:**
- Customers: POST {{baseUrl}}/v1/customers
- Charges: POST {{baseUrl}}/v1/charges
- Subscriptions: POST {{baseUrl}}/v1/subscriptions
- Vault Tokens: POST {{baseUrl}}/v1/vault/payment_sources
- Webhooks: POST {{baseUrl}}/v1/notifications

**Response Format:**
Return a JSON object with:
{
  "response": "Markdown explanation of the generated flow",
  "testSteps": [array of test steps]
}

**Example Flow:**
For "test customer creation and charge":
{
  "response": "I've generated a flow to test customer creation and charging...",
  "testSteps": [
    {
      "step": 1,
      "description": "Create a new customer",
      "apiCall": {
        "method": "POST",
        "url": "{{baseUrl}}/v1/customers",
        "headers": {
          "x-user-secret-key": "{{secretKey}}",
          "Content-Type": "application/json"
        },
        "body": {
          "first_name": "John",
          "last_name": "Doe",
          "email": "john.doe@example.com"
        }
      },
      "outgoingEdges": [
        {
          "targetStep": 2,
          "label": "Customer created successfully"
        }
      ]
    },
    {
      "step": 2,
      "description": "Create a charge for the customer",
      "apiCall": {
        "method": "POST",
        "url": "{{baseUrl}}/v1/charges",
        "headers": {
          "x-user-secret-key": "{{secretKey}}",
          "Content-Type": "application/json"
        },
        "body": {
          "amount": 1000,
          "currency": "USD",
          "customer_id": "{{customer_id}}",
          "payment_source": {
            "type": "card",
            "card_number": "4111111111111111",
            "expire_month": 12,
            "expire_year": 2025,
            "card_ccv": "123"
          }
        }
      }
    }
  ]
}

Generate executable flows, not just text descriptions.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const parsed = JSON.parse(jsonStr);

        if (parsed.testSteps && Array.isArray(parsed.testSteps)) {
          return {
            response: parsed.response || aiResponse,
            testSteps: parsed.testSteps,
          };
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response as JSON, returning text only:', parseError);
      }

      return {
        response: aiResponse,
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return {
        response: `❌ **AI Service Error**

I encountered an error while processing your request:

\`\`\`
${error.message}
\`\`\`

**Troubleshooting:**
- Check your OpenAI API key is valid
- Ensure you have sufficient API credits
- Try again in a few moments

You can still use the flow templates below for testing.`,
      };
    }
  }

  async suggestFlowImprovements(flow: TestStep[]): Promise<FlowSuggestion[]> {
    if (!this.openai) {
      return [{
        type: 'warning',
        title: 'AI Not Available',
        description: 'OpenAI API key not configured. Cannot provide flow suggestions.',
        priority: 'medium'
      }];
    }

    try {
      const systemPrompt = `You are a fintech QA expert analyzing Paydock API test flows.

Analyze the provided flow and suggest improvements in the following areas:

1. **Error Handling**: Missing error scenarios, retry logic, timeout handling
2. **Security**: Authentication, data validation, sensitive data handling
3. **Performance**: Optimization opportunities, parallel execution, caching
4. **Best Practices**: API usage patterns, response validation, logging
5. **Completeness**: Missing steps, edge cases, validation steps

**Response Format:**
Return a JSON array of suggestions:
[
  {
    "type": "improvement|warning|optimization|security",
    "title": "Short title",
    "description": "Detailed explanation",
    "priority": "low|medium|high",
    "suggestedCode": {optional step object}
  }
]

**Focus on practical, actionable improvements that will make the flow more robust and reliable.**`;

      const flowDescription = JSON.stringify(flow, null, 2);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this flow and suggest improvements:\n\n${flowDescription}` },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'No suggestions available.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const suggestions = JSON.parse(jsonStr);

        if (Array.isArray(suggestions)) {
          return suggestions;
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse suggestions as JSON:', parseError);
      }

      return [{
        type: 'improvement',
        title: 'Flow Analysis Complete',
        description: aiResponse,
        priority: 'medium'
      }];
    } catch (error) {
      this.logger.error('Error generating flow suggestions:', error);
      return [{
        type: 'warning',
        title: 'Analysis Failed',
        description: `Failed to analyze flow: ${error.message}`,
        priority: 'medium'
      }];
    }
  }

  async executeFlowWithNaturalLanguage(flow: TestStep[], instruction: string): Promise<{ modifiedFlow: TestStep[]; explanation: string }> {
    if (!this.openai) {
      return {
        modifiedFlow: flow,
        explanation: 'AI not available. Cannot modify flow with natural language.'
      };
    }

    try {
      const systemPrompt = `You are a fintech QA assistant that modifies Paydock API test flows based on natural language instructions.

Given a flow and an instruction, modify the flow accordingly. Common modifications include:

1. **Data Changes**: "Use John Doe instead of Jane Smith"
2. **Amount Changes**: "Change amount to $50"
3. **Error Scenarios**: "Add a failed payment test"
4. **Timing**: "Add a 2-second delay between steps"
5. **Validation**: "Add response validation for status codes"

**Response Format:**
Return a JSON object:
{
  "explanation": "What changes were made",
  "modifiedFlow": [array of modified test steps]
}

**Important:**
- Preserve the original flow structure
- Only modify what's specified in the instruction
- Keep all existing branching logic
- Maintain step numbering`;

      const flowDescription = JSON.stringify(flow, null, 2);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Flow:\n${flowDescription}\n\nInstruction: ${instruction}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Could not modify flow.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const result = JSON.parse(jsonStr);

        if (result.modifiedFlow && Array.isArray(result.modifiedFlow)) {
          return {
            modifiedFlow: result.modifiedFlow,
            explanation: result.explanation || 'Flow modified successfully.'
          };
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse modified flow as JSON:', parseError);
      }

      return {
        modifiedFlow: flow,
        explanation: aiResponse
      };
    } catch (error) {
      this.logger.error('Error modifying flow with natural language:', error);
      return {
        modifiedFlow: flow,
        explanation: `Failed to modify flow: ${error.message}`
      };
    }
  }

  async analyzeFlowFailure(executionResults: ExecutionResult[], flow: TestStep[]): Promise<DebugAnalysis> {
    if (!this.openai) {
      return {
        rootCause: 'AI Not Available',
        explanation: 'OpenAI API key not configured. Cannot analyze flow failure.',
        severity: 'medium',
        suggestedFixes: [],
        relatedIssues: [],
        preventionTips: []
      };
    }

    try {
      const systemPrompt = `You are a fintech QA debugging expert analyzing Paydock API flow failures.

Analyze the execution results and flow to identify:
1. **Root Cause**: What actually caused the failure
2. **Explanation**: Clear, technical explanation of the issue
3. **Severity**: Impact level (low, medium, high, critical)
4. **Suggested Fixes**: Specific, actionable solutions
5. **Related Issues**: Common problems that might be related
6. **Prevention Tips**: How to avoid this issue in the future

**Common Paydock API Issues:**
- Authentication errors (401, 403)
- Validation errors (400, 422)
- Rate limiting (429)
- Server errors (500, 502, 503)
- Network timeouts
- Data format issues
- Missing required fields

**Response Format:**
Return a JSON object:
{
  "rootCause": "Brief description of the main issue",
  "explanation": "Detailed technical explanation",
  "severity": "low|medium|high|critical",
  "suggestedFixes": [
    {
      "title": "Fix title",
      "description": "What this fix does",
      "codeExample": {optional code},
      "priority": "immediate|high|medium|low",
      "type": "code|configuration|data|process"
    }
  ],
  "relatedIssues": ["list of related problems"],
  "preventionTips": ["how to prevent this"],
  "stepNumber": 3,
  "errorCode": "HTTP_400",
  "errorMessage": "Specific error message"
}

**Focus on practical, actionable debugging insights.**`;

      const executionData = JSON.stringify(executionResults, null, 2);
      const flowData = JSON.stringify(flow, null, 2);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Execution Results:\n${executionData}\n\nFlow:\n${flowData}` },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Could not analyze failure.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const analysis = JSON.parse(jsonStr);

        if (analysis.rootCause && analysis.explanation) {
          return analysis;
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse debug analysis as JSON:', parseError);
      }

      return {
        rootCause: 'Analysis Failed',
        explanation: aiResponse,
        severity: 'medium',
        suggestedFixes: [],
        relatedIssues: [],
        preventionTips: []
      };
    } catch (error) {
      this.logger.error('Error analyzing flow failure:', error);
      return {
        rootCause: 'Analysis Error',
        explanation: `Failed to analyze flow failure: ${error.message}`,
        severity: 'medium',
        suggestedFixes: [],
        relatedIssues: [],
        preventionTips: []
      };
    }
  }

  async predictFlowIssues(flow: TestStep[]): Promise<DebugPrediction[]> {
    if (!this.openai) {
      return [{
        issue: 'AI Not Available',
        probability: 'medium',
        impact: 'medium',
        description: 'OpenAI API key not configured. Cannot predict issues.',
        preventionSteps: []
      }];
    }

    try {
      const systemPrompt = `You are a fintech QA expert predicting potential issues in Paydock API flows.

Analyze the flow and predict potential problems before execution:

**Common Issues to Look For:**
1. **Authentication**: Missing or invalid API keys
2. **Validation**: Invalid data formats, missing required fields
3. **Rate Limiting**: Too many requests, no delays
4. **Network**: Timeouts, connection issues
5. **Data Dependencies**: Steps that depend on previous step results
6. **Error Handling**: Missing error scenarios
7. **Performance**: Slow operations, no caching
8. **Security**: Sensitive data exposure

**Response Format:**
Return a JSON array of predictions:
[
  {
    "issue": "Brief description of potential issue",
    "probability": "low|medium|high",
    "impact": "low|medium|high",
    "description": "Detailed explanation",
    "preventionSteps": ["step 1", "step 2", "step 3"]
  }
]

**Focus on realistic, actionable predictions.**`;

      const flowDescription = JSON.stringify(flow, null, 2);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this flow for potential issues:\n\n${flowDescription}` },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Could not predict issues.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const predictions = JSON.parse(jsonStr);

        if (Array.isArray(predictions)) {
          return predictions;
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse predictions as JSON:', parseError);
      }

      return [{
        issue: 'Prediction Failed',
        probability: 'medium',
        impact: 'medium',
        description: aiResponse,
        preventionSteps: []
      }];
    } catch (error) {
      this.logger.error('Error predicting flow issues:', error);
      return [{
        issue: 'Prediction Error',
        probability: 'medium',
        impact: 'medium',
        description: `Failed to predict issues: ${error.message}`,
        preventionSteps: []
      }];
    }
  }

  async suggestDebuggingSteps(error: string, context: any): Promise<DebugFix[]> {
    if (!this.openai) {
      return [{
        title: 'AI Not Available',
        description: 'OpenAI API key not configured. Cannot suggest debugging steps.',
        priority: 'medium',
        type: 'process'
      }];
    }

    try {
      const systemPrompt = `You are a fintech QA debugging expert providing step-by-step debugging guidance.

Given an error and context, provide specific debugging steps:

**Debugging Approach:**
1. **Isolate the Problem**: Identify which step/component is failing
2. **Check Configuration**: Verify settings, credentials, environment
3. **Validate Data**: Check input data, formats, required fields
4. **Test Connectivity**: Verify network, API endpoints, timeouts
5. **Review Logs**: Check error messages, status codes, response data
6. **Reproduce**: Create minimal test case to reproduce issue
7. **Fix and Verify**: Apply fix and test thoroughly

**Response Format:**
Return a JSON array of debugging steps:
[
  {
    "title": "Step title",
    "description": "What to do and why",
    "codeExample": {optional code},
    "priority": "immediate|high|medium|low",
    "type": "code|configuration|data|process"
  }
]

**Provide practical, actionable debugging steps.**`;

      const contextData = JSON.stringify(context, null, 2);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Error: ${error}\n\nContext:\n${contextData}` },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Could not suggest debugging steps.';

      try {
        const jsonMatch = aiResponse.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        const steps = JSON.parse(jsonStr);

        if (Array.isArray(steps)) {
          return steps;
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse debugging steps as JSON:', parseError);
      }

      return [{
        title: 'Debugging Failed',
        description: aiResponse,
        priority: 'medium',
        type: 'process'
      }];
    } catch (error) {
      this.logger.error('Error suggesting debugging steps:', error);
      return [{
        title: 'Debugging Error',
        description: `Failed to suggest debugging steps: ${error.message}`,
        priority: 'medium',
        type: 'process'
      }];
    }
  }
}

async function executeTestFlow(steps: TestStep[]) {
  for (const step of steps) {
    if (step.apiCall) {
      const response = await fetch(step.apiCall.url, {
        method: step.apiCall.method,
        headers: step.apiCall.headers,
        body: step.apiCall.body ? JSON.stringify(step.apiCall.body) : undefined
      });

      // Show results, validate, continue to next step
    }
  }
}
