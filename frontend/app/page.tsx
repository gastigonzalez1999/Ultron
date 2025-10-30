'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Copy, Check, BarChart3, Lightbulb, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DarkModeToggle from '../components/DarkModeToggle';
import EnvironmentSelector from '../components/EnvironmentSelector';
import RequestPreview from '../components/RequestPreview';
import ExecutionResults from '../components/ExecutionResults';
import ErrorDisplay from '../components/ErrorDisplay';
import { buildApiUrl } from '../lib/api';

import TestResultManager from '../components/TestResultManager';
import ResultComparison from '../components/ResultComparison';
import FlowSuggestions from '../components/FlowSuggestions';
import NaturalLanguageExecution from '../components/NaturalLanguageExecution';
import AIDebuggingModal from '../components/AIDebuggingModal';
import DebuggingButton from '../components/DebuggingButton';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FlowTemplateDrawer from '../components/FlowTemplateDrawer';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  testSteps?: TestStep[];
}

interface TestStep {
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
  // New branching system
  outgoingEdges?: FlowEdge[];
}

// Interface for outgoing edges with conditions
interface FlowEdge {
  targetStep: number; // Which step this edge leads to
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
    stepNumber: number; // Which step's response to check
  };
  isElse?: boolean; // If true, this is the "else" path (no condition or condition is "else")
  label?: string; // Human-readable label for the edge
}

interface ExecutionResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

interface TestStepExecution {
  step: number;
  description: string;
  result: ExecutionResult;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  dashboardAction?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [executionResults, setExecutionResults] = useState<TestStepExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEnvironment, setCurrentEnvironment] = useState('local');
  const [showComparison, setShowComparison] = useState(false);
  const [savedResults, setSavedResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [flowVariables, setFlowVariables] = useState<Record<string, any>>({});

  // AI Features State
  const [showFlowSuggestions, setShowFlowSuggestions] = useState(false);
  const [flowSuggestions, setFlowSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showNaturalLanguageExecution, setShowNaturalLanguageExecution] = useState(false);
  const [isLoadingNaturalLanguage, setIsLoadingNaturalLanguage] = useState(false);
  const [lastNaturalLanguageResult, setLastNaturalLanguageResult] = useState<any>(null);

  // AI Debugging State
  const [showAIDebugging, setShowAIDebugging] = useState(false);
  const [isAnalyzingDebug, setIsAnalyzingDebug] = useState(false);
  const [debugMode, setDebugMode] = useState<'analysis' | 'prediction' | 'debugging'>('analysis');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/ask'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        testSteps: data.testSteps,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Extract test steps if they exist in the response
      if (data.testSteps && Array.isArray(data.testSteps)) {
        setTestSteps(data.testSteps);
        setEditMode(true); // Enable edit mode for AI-generated flows
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ **Request Failed**

I encountered an error while processing your request:

\`\`\`
${errorMessage}
\`\`\`

Please try again or check your configuration.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract variables from API response
  const extractVariablesFromResponse = (response: any, stepNumber: number): Record<string, any> => {
    const extracted: Record<string, any> = {};

    if (!response || !response.success || !response.response) return extracted;

    // Paydock response structure: { resource: { data: { _id: "...", type: "..." } } }
    if (response.response.resource && response.response.resource.data) {
      const data = response.response.resource.data;

      // Extract the main ID (_id field)
      if (data._id) {
        const resourceType = response.response.resource.type || 'resource';
        extracted[`${resourceType}_id`] = data._id;
      }

      // Extract 3DS-specific fields for all 3DS responses
      if (data._3ds) {
        if (data._3ds.id) {
          extracted['3ds_id'] = data._3ds.id;
        }
        if (data._3ds.token) {
          extracted['3ds_token'] = data._3ds.token;
        }
      }

      // Extract specific IDs based on resource type
      if (data.type === 'customer' && data._id) {
        extracted['customer_id'] = data._id;
      }

      // Handle different charge types (charge, financial, 3ds)
      if ((data.type === 'charge' || data.type === 'financial' || data.type === '3ds') && data._id) {
        extracted['charge_id'] = data._id;
      }

      if (data.type === 'subscription' && data._id) {
        extracted['subscription_id'] = data._id;
      }

      if (data.type === 'vault_token' && data._id) {
        extracted['vault_token'] = data._id;
      }
            // For vault token creation responses, extract vault_token from data.vault_token
      if (data.vault_token) {
        extracted['vault_token'] = data.vault_token;
      }

      // Extract payment source tokens from customer creation responses
      if (data.payment_sources && Array.isArray(data.payment_sources) && data.payment_sources.length > 0) {
        const paymentSource = data.payment_sources[0]; // Get the first payment source
        if (paymentSource.ref_token) {
          extracted['ref_token'] = paymentSource.ref_token;
        }
        if (paymentSource.vault_token) {
          extracted['vault_token'] = paymentSource.vault_token;
        }
      }

      // For one-time token creation responses, extract token from data (which is a string)
      if (response.response.resource.type === 'token' && typeof data === 'string') {
        extracted['one_time_token'] = data;
      }

      // Extract other common fields
      if (data.gateway_id) {
        extracted['gateway_id'] = data.gateway_id;
      }
    }

    return extracted;
  };

  const handleExecute = async (modifiedSteps?: TestStep[]) => {
    const stepsToExecute = modifiedSteps || testSteps;
    if (stepsToExecute.length === 0 || isExecuting) return;

    setIsExecuting(true);
    setExecutionResults([]);
    setError(null);
    setFlowVariables({}); // Reset variables

    try {
      const response = await fetch(buildApiUrl('/api/execution/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testSteps: stepsToExecute }),
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setExecutionResults(data.results);

      // Extract variables from successful responses
      const newVariables: Record<string, any> = {};
      data.results.forEach((result: TestStepExecution) => {
        if (result.result.success) {
          const stepVariables = extractVariablesFromResponse(result.result, result.step);
          Object.assign(newVariables, stepVariables);
        }
      });
      setFlowVariables(newVariables);

      // Add execution summary to messages
      const successfulSteps = data.results.filter((r: TestStepExecution) => r.result.success).length;
      const failedSteps = data.results.filter((r: TestStepExecution) => !r.result.success).length;

      // Build variables summary
      const variablesSummary = Object.keys(newVariables).length > 0
        ? `\n**Extracted Variables:**\n${Object.entries(newVariables).map(([key, value]) => `- \`${key}\`: \`${value}\``).join('\n')}`
        : '';

      const summaryMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: `## Execution Complete ${failedSteps === 0 ? '✅' : '⚠️'}

**Summary:**
- Total Steps: ${data.summary.totalSteps}
- Successful: ${data.summary.successfulSteps} ✅
- Failed: ${data.summary.failedSteps} ❌
- Total Duration: ${data.summary.totalDuration}ms${variablesSummary}

${failedSteps > 0 ? `
**Failed Steps:**
${data.results.filter((r: TestStepExecution) => !r.result.success).map((result: TestStepExecution) => `
- **Step ${result.step}:** ${result.description}
  - Error: ${result.result.error || 'Unknown error'}
`).join('\n')}
` : ''}

View detailed results below.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: `❌ **Execution Failed**

I encountered an error while executing your test steps:

\`\`\`
${errorMessage}
\`\`\`

Please check your configuration and try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRetryStep = async (stepNumber: number) => {
    const stepToRetry = testSteps.find(step => step.step === stepNumber);
    if (!stepToRetry) return;

    try {
      const response = await fetch(buildApiUrl('/api/execution/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testSteps: [stepToRetry] }),
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const newResult = data.results[0];

      // Update the specific step result
      setExecutionResults(prev =>
        prev.map(result =>
          result.step === stepNumber ? newResult : result
        )
      );
    } catch (error) {
      console.error('Retry error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

    const handleRetryAll = async () => {
    const failedSteps = testSteps.filter(step =>
      executionResults.find(result => result.step === step.step && !result.result.success)
    );

    if (failedSteps.length === 0) return;

    try {
      const response = await fetch(buildApiUrl('/api/execution/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testSteps: failedSteps }),
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const newResults = data.results;

      // Update the failed step results
      setExecutionResults(prev =>
        prev.map(result => {
          const newResult = newResults.find((r: TestStepExecution) => r.step === result.step);
          return newResult || result;
        })
      );
    } catch (error) {
      console.error('Retry all error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

    const loadFlowTemplate = async (templateName: string) => {
    try {

      // Check if this is a custom flow
      if (templateName.startsWith('custom:')) {
        const customFlowName = templateName.replace('custom:', '');
        const saved = localStorage.getItem('ultron-custom-flows');
        if (saved) {
          const customFlows = JSON.parse(saved);
          const customFlow = customFlows.find((flow: any) => flow.name === customFlowName);

          if (customFlow) {
            setTestSteps(customFlow.steps);
            setEditMode(true); // Enable edit mode for custom flows

            const templateMessage: Message = {
              id: Date.now().toString(),
              type: 'assistant',
              content: `⚙️ **Custom Flow Loaded: ${customFlow.name}**

**Description:** ${customFlow.description}

**Steps:** ${customFlow.steps.length} step${customFlow.steps.length !== 1 ? 's' : ''}

You can now edit this custom flow or execute it when ready.`,
              timestamp: new Date(),
            };

            setMessages(prev => [...prev, templateMessage]);
            return;
          }
        }
        throw new Error(`Custom flow "${customFlowName}" not found`);
      }

      // Load built-in template
      const response = await fetch(buildApiUrl(`/api/flows/template/${encodeURIComponent(templateName)}`));

      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
      }

      const template = await response.json();

      if (template && template.steps) {
        // Set the test steps directly from the template
        setTestSteps(template.steps);
        setEditMode(false); // Disable edit mode for built-in templates

        // Add a message showing the template was loaded
        const templateMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `📋 **${template.name} Template Loaded**

        **Description:** ${template.description}

        **Steps:** ${template.steps.length} step${template.steps.length !== 1 ? 's' : ''}

        You can now review the request preview below and execute the flow when ready.`,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, templateMessage]);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const loadSavedResult = (result: any) => {
    setTestSteps(result.testSteps);
    setExecutionResults(result.executionResults);
    setCurrentEnvironment(result.environment);

    const loadMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `📋 **Loaded Test Result: ${result.name}**

**Description:** ${result.description}
**Environment:** ${result.environment}
**Date:** ${new Date(result.timestamp).toLocaleString()}
**Results:** ${result.summary.successfulSteps}/${result.summary.totalSteps} successful

The test steps and results have been loaded. You can review them below.`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, loadMessage]);
  };

  const loadSavedResults = () => {
    try {
      const saved = localStorage.getItem('ultron-test-results');
      if (saved) {
        const parsed = JSON.parse(saved);
        const results = parsed.map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }));
        setSavedResults(results);
      }
    } catch (error) {
      console.error('Error loading saved results:', error);
    }
  };

  // AI Flow Suggestions
  const handleGetFlowSuggestions = async () => {
    if (testSteps.length === 0) {
      setError('No flow to analyze. Please create or load a flow first.');
      return;
    }

    setIsLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/ask/suggestions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flow: testSteps }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const suggestions = await response.json();
      setFlowSuggestions(suggestions);
      setShowFlowSuggestions(true);
    } catch (error) {
      console.error('Error getting flow suggestions:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.suggestedCode) {
      // Apply the suggested code to the flow
      const modifiedSteps = [...testSteps];

      if (Array.isArray(suggestion.suggestedCode)) {
        // Replace entire flow
        setTestSteps(suggestion.suggestedCode);
      } else if (suggestion.suggestedCode.step) {
        // Replace specific step
        const stepIndex = modifiedSteps.findIndex(s => s.step === suggestion.suggestedCode.step);
        if (stepIndex !== -1) {
          modifiedSteps[stepIndex] = suggestion.suggestedCode;
          setTestSteps(modifiedSteps);
        }
      }
    }
  };

  // Natural Language Execution
  const handleNaturalLanguageExecution = async (instruction: string) => {
    if (testSteps.length === 0) {
      setError('No flow to modify. Please create or load a flow first.');
      return;
    }

    setIsLoadingNaturalLanguage(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/ask/execute-natural-language'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flow: testSteps,
          instruction: instruction
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setLastNaturalLanguageResult(result);

      // Apply the modified flow
      if (result.modifiedFlow && Array.isArray(result.modifiedFlow)) {
        setTestSteps(result.modifiedFlow);
      }
    } catch (error) {
      console.error('Error executing natural language:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoadingNaturalLanguage(false);
    }
  };

  // AI Debugging Handlers
  const handleAnalyzeFailure = () => {
    setDebugMode('analysis');
    setShowAIDebugging(true);
  };

  const handlePredictIssues = () => {
    setDebugMode('prediction');
    setShowAIDebugging(true);
  };

  const handleGetDebugSteps = () => {
    setDebugMode('debugging');
    setShowAIDebugging(true);
  };

  useEffect(() => {
    loadSavedResults();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatApiCall = (apiCall: TestStep['apiCall']) => {
    if (!apiCall) return '';

    const headers = Object.entries(apiCall.headers)
      .map(([key, value]) => `  "${key}": "${value}"`)
      .join(',\n');

    const body = apiCall.body ? `\n  "body": ${JSON.stringify(apiCall.body, null, 2)}` : '';

    return `curl -X ${apiCall.method} "${apiCall.url}" \\
  -H "Content-Type: application/json" \\
  -H ${Object.entries(apiCall.headers)
    .filter(([key]) => key !== 'Content-Type')
    .map(([key, value]) => `"${key}: ${value}"`)
    .join(' \\\n  -H ')}${body ? ` \\\n  -d '${JSON.stringify(apiCall.body)}'` : ''}`;
  };

  const renderTestSteps = (testSteps: TestStep[]) => {
    return (
      <div className="mt-4 space-y-6">
        <h3 className="text-lg font-semibold text-white mb-3">Test Steps:</h3>
        {testSteps.map((step, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white mb-2">{step.description}</h4>
                {step.apiCall && (
                  <div className="mb-3 w-full max-w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-200">API Call:</span>
                      <button
                        onClick={() => copyToClipboard(formatApiCall(step.apiCall), `api-${index}`)}
                        className="flex items-center space-x-1 text-xs text-primary-400 hover:text-primary-200"
                      >
                        {copiedId === `api-${index}` ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy cURL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-800 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto border border-gray-700 w-full max-w-full">
                      <pre className="whitespace-pre-wrap">{formatApiCall(step.apiCall)}</pre>
                    </div>
                  </div>
                )}
                {step.dashboardAction && (
                  <div className="bg-blue-900/30 border border-blue-800 rounded-md p-3 mt-2">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                        📊
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-100">Dashboard Action:</span>
                        <p className="text-sm text-blue-50 mt-1">{step.dashboardAction}</p>
                      </div>
                    </div>
                  </div>
                )}
                {step.documentation && (
                  <div className="bg-yellow-900/30 border border-yellow-800 rounded-md p-3 mt-2">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">
                        📚
                      </div>
                      <div>
                        <span className="text-sm font-medium text-yellow-100">Documentation:</span>
                        <p className="text-sm text-yellow-50 mt-1">{step.documentation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessage = (message: Message, idx: number) => {
    const isUser = message.type === 'user';
    const prevIsUser = idx > 0 ? messages[idx - 1].type === 'user' : false;
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${!isUser && prevIsUser ? 'mt-8' : 'mt-4'} mb-2`}
      >
        <div
          className={`text-base ${
            isUser
              ? 'bg-primary-600 text-white rounded-2xl px-5 py-3 shadow-md max-w-xl mr-4'
              : 'bg-gray-800/80 text-gray-100 rounded-2xl px-6 py-5 border border-gray-700 shadow-lg max-w-2xl'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed text-gray-100">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                div: ({ children }) => <div className="prose prose-invert max-w-none text-gray-100">{children}</div>,
                pre: ({ node, ...props }) => <pre {...props} className="bg-gray-800 rounded-lg p-4 overflow-x-auto" />,
                code: ({ node, ...props }) => <code {...props} className="text-green-400 font-mono text-sm" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {message.testSteps && renderTestSteps(message.testSteps)}
          <div className="text-xs opacity-70 mt-2 text-gray-200">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Ultron</h1>
          <button
            className="ml-2 px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded shadow text-sm font-medium"
            onClick={() => setDrawerOpen(true)}
          >
            Browse Templates
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <EnvironmentSelector />
          <DarkModeToggle />
        </div>
      </div>
      {/* Drawer */}
      <FlowTemplateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectTemplate={loadFlowTemplate}
      />
      {/* Main Content: Chat, Results, etc. */}
      <main className="flex-1 flex flex-col items-center w-full px-2 md:px-0">
        {/* Test Results Manager */}
        <div className="w-full max-w-3xl mt-6">
          <TestResultManager
            currentTestSteps={testSteps}
            currentResults={executionResults}
            currentEnvironment={currentEnvironment}
            onLoadResult={loadSavedResult}
          />
        </div>
        {/* Error Display */}
        {error && (
          <div className="w-full max-w-2xl mt-4">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {/* Execution Results */}
        {executionResults.length > 0 && (
          <div className="w-full max-w-3xl mt-6">
            <ExecutionResults
              results={executionResults}
              onRetryStep={handleRetryStep}
              onRetryAll={handleRetryAll}
            />
          </div>
        )}
        {/* Request Preview & Execute Button */}
        {testSteps.length > 0 && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex justify-end mb-2 space-x-2">
              {/* AI Debugging Button */}
              <DebuggingButton
                onAnalyzeFailure={handleAnalyzeFailure}
                onPredictIssues={handlePredictIssues}
                onGetDebugSteps={handleGetDebugSteps}
                hasExecutionData={executionResults.length > 0}
                hasError={!!error}
                isAnalyzing={isAnalyzingDebug}
              />

              {/* AI Flow Suggestions */}
              <button
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded shadow text-sm font-medium flex items-center space-x-1"
                onClick={handleGetFlowSuggestions}
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Lightbulb className="w-3 h-3" />
                )}
                <span>AI Suggestions</span>
              </button>

              {/* Natural Language Execution */}
              <button
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded shadow text-sm font-medium flex items-center space-x-1"
                onClick={() => setShowNaturalLanguageExecution(true)}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Natural Language</span>
              </button>

              <button
                className="px-4 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded shadow text-sm font-medium"
                onClick={() => setEditMode(true)}
              >
                Duplicate & Edit
              </button>
            </div>
            <RequestPreview
              testSteps={testSteps}
              onExecute={handleExecute}
              isExecuting={isExecuting}
              editMode={editMode}
              flowVariables={flowVariables}
            />
          </div>
        )}
        {/* Chat Messages */}
        <div className="w-full max-w-2xl flex-1 overflow-y-auto mt-6 mb-4">
          {messages.map((message, idx) => renderMessage(message, idx))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl flex items-center space-x-2 mb-8"
        >
          <textarea
            className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-800 text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[48px] max-h-40"
            placeholder="Type your message or describe a test flow..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </main>

      {/* AI Flow Suggestions Modal */}
      {showFlowSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <FlowSuggestions
              suggestions={flowSuggestions}
              onApplySuggestion={handleApplySuggestion}
              onDismiss={() => setShowFlowSuggestions(false)}
              isLoading={isLoadingSuggestions}
            />
          </div>
        </div>
      )}

      {/* Natural Language Execution Modal */}
      {showNaturalLanguageExecution && (
        <NaturalLanguageExecution
          onExecute={handleNaturalLanguageExecution}
          onClose={() => setShowNaturalLanguageExecution(false)}
          isLoading={isLoadingNaturalLanguage}
          lastResult={lastNaturalLanguageResult}
        />
      )}

      {/* AI Debugging Modal */}
      {showAIDebugging && (
        <AIDebuggingModal
          isOpen={showAIDebugging}
          onClose={() => setShowAIDebugging(false)}
          flow={testSteps}
          executionResults={executionResults}
          currentError={error || undefined}
        />
      )}
    </div>
  );
}
