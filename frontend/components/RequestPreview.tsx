'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, Play, AlertTriangle, Edit3, Save, X, RotateCcw, Plus } from 'lucide-react';
import MermaidChart from './MermaidChart';
import FlowVisualEditor from './FlowVisualEditor';
import React from 'react';
import { buildApiUrl } from '../lib/api';

interface ApiCall {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

interface RequestPreviewProps {
  testSteps: any[];
  onExecute: (modifiedSteps?: any[]) => void;
  isExecuting: boolean;
  editMode?: boolean;
  flowVariables?: Record<string, any>;
  onCurrentStepChange?: (stepNumber: number | null) => void;
}

interface Template {
  name: string;
  description: string;
  steps: any[];
}

interface Variable {
  name: string;
  value: any;
  source: string; // "step_1_response", "manual", etc.
  stepNumber: number;
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

// Error Boundary for catching React child errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('React ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 text-red-800 p-4 rounded">
          <strong>React ErrorBoundary caught error:</strong>
          <pre>{String(this.state.error)}</pre>
          {this.state.error && this.state.error.stack && <pre>{this.state.error.stack}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RequestPreview({ testSteps, onExecute, isExecuting, editMode = false, flowVariables = {}, onCurrentStepChange }: RequestPreviewProps) {
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [modifiedSteps, setModifiedSteps] = useState<any[]>(testSteps);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramCode, setDiagramCode] = useState('');
  const [showVisualEditor, setShowVisualEditor] = useState(false);

  // Step-by-step execution state
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [stepResults, setStepResults] = useState<any[]>([]);
  const [isExecutingStep, setIsExecutingStep] = useState(false);
  const [nextSteps, setNextSteps] = useState<number[]>([]);

  const conditionOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
  ];

  // Update modifiedSteps when testSteps change
  useEffect(() => {
    setModifiedSteps(testSteps);
  }, [testSteps]);

  const toggleDetails = (stepNumber: number) => {
    setShowDetails(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const copyToClipboard = async (text: string, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatApiCall = (apiCall: ApiCall) => {
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

  const handleStepUpdate = (stepNumber: number, field: string, value: any) => {
    setModifiedSteps(prev => prev.map(step => {
      if (step.step === stepNumber) {
        if (field === 'apiCall') {
          return { ...step, apiCall: { ...step.apiCall, ...value } };
        } else {
          return { ...step, [field]: value };
        }
      }
      return step;
    }));
  };

  const handleApiCallUpdate = (stepNumber: number, field: string, value: any) => {
    setModifiedSteps(prev => prev.map(step => {
      if (step.step === stepNumber && step.apiCall) {
        return {
          ...step,
          apiCall: { ...step.apiCall, [field]: value }
        };
      }
      return step;
    }));
  };

  const saveChanges = (stepNumber: number) => {
    // Implementation of saveChanges method
  };

  const resetChanges = (stepNumber: number) => {
    setModifiedSteps(prev => prev.map(step => {
      if (step.step === stepNumber) {
        return testSteps.find(originalStep => originalStep.step === stepNumber) || step;
      }
      return step;
    }));
  };

  const handleExecute = () => {
    onExecute(modifiedSteps);
  };

  const getStepIcon = (step: any) => {
    if (step.apiCall) {
      return '🌐';
    } else if (step.dashboardAction) {
      return '📊';
    } else {
      return '📝';
    }
  };

  const hasChanges = () => {
    return JSON.stringify(modifiedSteps) !== JSON.stringify(testSteps);
  };

  // Add step
  const addStep = () => {
    const nextStep = (modifiedSteps[modifiedSteps.length - 1]?.step || 0) + 1;
    setModifiedSteps(prev => [
      ...prev,
      {
        step: nextStep,
        description: '',
        apiCall: { method: 'POST', url: '', headers: {}, body: {} },
      },
    ]);
  };

  // Remove step
  const removeStep = (stepNumber: number) => {
    setModifiedSteps(prev => prev.filter(step => step.step !== stepNumber));
  };

  // Move step up/down
  const moveStep = (index: number, direction: 'up' | 'down') => {
    setModifiedSteps(prev => {
      const arr = [...prev];
      if (direction === 'up' && index > 0) {
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      } else if (direction === 'down' && index < arr.length - 1) {
        [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      }
      // Re-number steps
      return arr.map((step, i) => ({ ...step, step: i + 1 }));
    });
  };

  // Save custom flow
  const saveCustomFlow = () => {
    const name = prompt('Enter a name for your custom flow:');
    if (!name) return;
    const description = prompt('Enter a description (optional):') || '';
    const customFlows = JSON.parse(localStorage.getItem('ultron-custom-flows') || '[]');
    customFlows.unshift({ name, description, steps: modifiedSteps });
    localStorage.setItem('ultron-custom-flows', JSON.stringify(customFlows));
    alert('Custom flow saved!');
  };

  // Load available templates for combining
  const loadTemplates = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/flows/templates'));
      if (response.ok) {
        const templates = await response.json();
        setAvailableTemplates(templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Combine selected steps from template
  const combineWithTemplate = async () => {
    if (!selectedTemplate || selectedSteps.length === 0) return;

    try {
      const response = await fetch(buildApiUrl(`/api/flows/template/${encodeURIComponent(selectedTemplate)}`));
      if (response.ok) {
        const template = await response.json();
        const stepsToAdd = template.steps.filter((_: any, index: number) => selectedSteps.includes(index));

        // Renumber the steps to continue from current flow
        const nextStepNumber = modifiedSteps.length + 1;
        const renumberedSteps = stepsToAdd.map((step: any, index: number) => ({
          ...step,
          step: nextStepNumber + index
        }));

        setModifiedSteps(prev => [...prev, ...renumberedSteps]);
        setShowCombineModal(false);
        setSelectedTemplate('');
        setSelectedSteps([]);
      }
    } catch (error) {
      console.error('Error combining template:', error);
    }
  };

    // Extract variables from a response
  const extractVariables = (response: any, stepNumber: number): Variable[] => {
    const extracted: Variable[] = [];

    if (!response) return extracted;

    // Paydock response structure: { resource: { data: { _id: "...", type: "..." } } }
    if (response.resource && response.resource.data) {
      const data = response.resource.data;

      // Extract the main ID (_id field)
      if (data._id) {
        const resourceType = data.type || 'resource';
        extracted.push({
          name: `${resourceType}_id`,
          value: data._id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      // Extract specific IDs based on resource type
      if (data.type === 'customer' && data._id) {
        extracted.push({
          name: 'customer_id',
          value: data._id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      if (data.type === 'charge' && data._id) {
        extracted.push({
          name: 'charge_id',
          value: data._id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      if (data.type === 'subscription' && data._id) {
        extracted.push({
          name: 'subscription_id',
          value: data._id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      if (data.type === 'vault_token' && data._id) {
        extracted.push({
          name: 'vault_token',
          value: data._id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }
            // For vault token creation responses, extract vault_token from data.vault_token
      if (data.vault_token) {
        extracted.push({
          name: 'vault_token',
          value: data.vault_token,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      // Extract payment source tokens from customer creation responses
      if (data.payment_sources && Array.isArray(data.payment_sources) && data.payment_sources.length > 0) {
        const paymentSource = data.payment_sources[0]; // Get the first payment source
        if (paymentSource.ref_token) {
          extracted.push({
            name: 'ref_token',
            value: paymentSource.ref_token,
            source: `step_${stepNumber}_response`,
            stepNumber
          });
        }
        if (paymentSource.vault_token) {
          extracted.push({
            name: 'vault_token',
            value: paymentSource.vault_token,
            source: `step_${stepNumber}_response`,
            stepNumber
          });
        }
      }

      // For one-time token creation responses, extract token from data (which is a string)
      if (response.resource.type === 'token' && typeof data === 'string') {
        extracted.push({
          name: 'one_time_token',
          value: data,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }

      // Extract other common fields
      if (data.gateway_id) {
        extracted.push({
          name: 'gateway_id',
          value: data.gateway_id,
          source: `step_${stepNumber}_response`,
          stepNumber
        });
      }
    }

    return extracted;
  };

  // Substitute variables in text
  const substituteVariables = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return flowVariables[varName] ? String(flowVariables[varName]) : match;
    });
  };

  // Convert flowVariables to Variable array for display
  const getVariablesForDisplay = (): Variable[] => {
    return Object.entries(flowVariables).map(([name, value]) => ({
      name,
      value,
      source: 'execution',
      stepNumber: 0
    }));
  };

  // Generate Mermaid diagram code from steps
  const generateMermaidDiagram = () => {
    if (modifiedSteps.length === 1) {
      // Add a dummy node and edge so Mermaid renders
      const step = modifiedSteps[0];
      return `graph TD\nA[Start] --> S${step.step}[\"Step ${step.step}: ${step.description.replace(/\"/g, '')}\"]\n`;
    }

    let code = 'graph TD\n';

    // Add all nodes
    for (let i = 0; i < modifiedSteps.length; i++) {
      const step = modifiedSteps[i];
      const nodeId = `S${step.step}`;
      code += `  ${nodeId}[\"Step ${step.step}: ${step.description.replace(/\"/g, '')}\"]\n`;
    }

    // Add edges based on outgoingEdges or fallback to sequential
    for (let i = 0; i < modifiedSteps.length; i++) {
      const step = modifiedSteps[i];

      if (step.outgoingEdges && step.outgoingEdges.length > 0) {
        // Use the new branching system
        step.outgoingEdges.forEach((edge: FlowEdge, edgeIdx: number) => {
          const sourceId = `S${step.step}`;
          const targetId = `S${edge.targetStep}`;

          if (edge.isElse) {
            // Else path - dashed line
            code += `  ${sourceId} -. \"${edge.label || 'else'}\" .-> ${targetId}\n`;
          } else if (edge.condition) {
            // Conditional path - solid line with condition
            const conditionText = edge.label || `${edge.condition.field} ${edge.condition.operator} ${edge.condition.value}`;
            code += `  ${sourceId} -- \"${conditionText}\" --> ${targetId}\n`;
          } else {
            // Default path (no condition)
            code += `  ${sourceId} -- \"${edge.label || 'default'}\" --> ${targetId}\n`;
          }
        });
      } else if (i > 0) {
        // Fallback to sequential execution for backward compatibility
        const prevStep = modifiedSteps[i - 1];
        if (step.condition && step.condition.stepNumber) {
          // Legacy condition support
          code += `  S${step.condition.stepNumber} -- \"${step.condition.field} ${step.condition.operator} ${step.condition.value}\" --> S${step.step}\n`;
        } else {
          // Normal sequential flow
          code += `  S${prevStep.step} --> S${step.step}\n`;
        }
      }
    }

    return code;
  };

  // Step-by-step execution handlers
  const handleStartStepByStep = () => {
    setStepByStepMode(true);
    setCurrentStepIndex(0);
    setStepResults([]);
    setNextSteps([]);
    onCurrentStepChange?.(testSteps[0]?.step || null);
  };

  const handleStopStepByStep = () => {
    setStepByStepMode(false);
    setCurrentStepIndex(null);
    setStepResults([]);
    setNextSteps([]);
    onCurrentStepChange?.(null);
  };

  const handleExecuteStep = async () => {
    if (currentStepIndex === null || currentStepIndex >= testSteps.length || isExecutingStep) {
      return;
    }

    const step = testSteps[currentStepIndex];
    setIsExecutingStep(true);

    try {
      const response = await fetch(buildApiUrl('/api/execution/execute-step'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step,
          previousResults: stepResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Step execution failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Add the result to our step results
      setStepResults(prev => [...prev, data.result]);
      setNextSteps(data.nextSteps);

      // Move to next step if available
      if (data.nextSteps.length > 0) {
        const nextStepIndex = testSteps.findIndex(s => s.step === data.nextSteps[0]);
        if (nextStepIndex !== -1) {
          setCurrentStepIndex(nextStepIndex);
          onCurrentStepChange?.(testSteps[nextStepIndex].step);
        } else {
          // No more steps to execute
          setCurrentStepIndex(null);
          onCurrentStepChange?.(null);
        }
      } else {
        // No next steps available
        setCurrentStepIndex(null);
        onCurrentStepChange?.(null);
      }
    } catch (error) {
      console.error('Step execution error:', error);
      // Handle error - maybe show in UI
    } finally {
      setIsExecutingStep(false);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex === null || currentStepIndex >= testSteps.length - 1) {
      return;
    }
    setCurrentStepIndex(currentStepIndex + 1);
    onCurrentStepChange?.(testSteps[currentStepIndex + 1].step);
  };

  const handlePreviousStep = () => {
    if (currentStepIndex === null || currentStepIndex <= 0) {
      return;
    }
    setCurrentStepIndex(currentStepIndex - 1);
    onCurrentStepChange?.(testSteps[currentStepIndex - 1].step);
  };

  if (testSteps.length === 0) {
    return null;
  }
  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Request Preview
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review and edit what will be executed ({modifiedSteps.length} step{modifiedSteps.length !== 1 ? 's' : ''})
                {hasChanges() && (
                  <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                    • Modified
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 overflow-x-auto">
            {editMode && (
              <>
                <button
                  onClick={() => setShowVariablesModal(true)}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg shadow text-sm font-semibold"
                >
                  Variables ({Object.keys(flowVariables).length})
                </button>
                <button
                  onClick={() => setShowVisualEditor(true)}
                  className="px-4 py-2 bg-pink-700 hover:bg-pink-800 text-white rounded-lg shadow text-sm font-semibold"
                >
                  Visual Editor
                </button>
                <button
                  onClick={() => {
                    setDiagramCode(generateMermaidDiagram());
                    setShowDiagramModal(true);
                  }}
                  className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg shadow text-sm font-semibold"
                >
                  Visual Diagram
                </button>
                <button
                  onClick={saveCustomFlow}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg shadow text-sm font-semibold"
                >
                  Save Flow
                </button>
              </>
            )}

            {/* Step-by-Step Controls */}
            {!stepByStepMode ? (
              <button
                onClick={handleStartStepByStep}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow text-sm font-semibold"
                disabled={testSteps.length === 0}
              >
                🔍 Step-by-Step
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousStep}
                  disabled={currentStepIndex === null || currentStepIndex <= 0}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  ⬅️ Previous
                </button>
                <button
                  onClick={handleExecuteStep}
                  disabled={currentStepIndex === null || isExecutingStep}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  {isExecutingStep ? '⏳ Executing...' : '▶️ Execute Step'}
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={currentStepIndex === null || currentStepIndex >= testSteps.length - 1}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  Next ➡️
                </button>
                <button
                  onClick={handleStopStepByStep}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  🛑 Stop
                </button>
              </div>
            )}

            {!stepByStepMode && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isExecuting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                } text-white shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Execute All</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Visual Editor Modal */}
        {showVisualEditor && (
          <FlowVisualEditor
            steps={modifiedSteps}
            onChange={setModifiedSteps}
            open={showVisualEditor}
            onClose={() => setShowVisualEditor(false)}
          />
        )}

        {/* Variables Modal */}
        {showVariablesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Flow Variables
              </h3>

              <div className="space-y-4">
                            {/* Available Variables */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Available Variables</h4>
                  {Object.keys(flowVariables).length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No variables available yet. Variables will be extracted from API responses after execution.</p>
                  ) : (
                    <div className="space-y-2">
                      {getVariablesForDisplay().map((variable) => (
                        <div key={variable.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {`{{${variable.name}}}`}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {variable.value} (from {variable.source})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variable Usage Info */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Variable Usage</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Variables are automatically extracted from API responses. Use them in URLs and request bodies with double curly braces syntax.
                  </p>
                </div>

                {/* Usage Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to Use Variables</h4>
                                   <p className="text-sm text-blue-800 dark:text-blue-200">
                     Use variables in URLs and request bodies with double curly braces: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{`{{variable_name}}`}</code>
                   </p>
                   <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                     Example: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{`/v1/charges/{{charge_id}}/capture`}</code>
                   </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowVariablesModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Combine Template Modal */}
        {showCombineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Combine with Template
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      setSelectedSteps([]);
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose a template...</option>
                    {availableTemplates.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Steps to Add
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableTemplates
                        .find(t => t.name === selectedTemplate)
                        ?.steps.map((step, index) => (
                          <label key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                            <input
                              type="checkbox"
                              checked={selectedSteps.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSteps(prev => [...prev, index]);
                                } else {
                                  setSelectedSteps(prev => prev.filter(i => i !== index));
                                }
                              }}
                              className="rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                Step {index + 1}: {step.description}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {step.apiCall?.method} {step.apiCall?.url}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCombineModal(false);
                    setSelectedTemplate('');
                    setSelectedSteps([]);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={combineWithTemplate}
                  disabled={!selectedTemplate || selectedSteps.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  Add Selected Steps
                </button>
              </div>
            </div>
          </div>
        )}

        {showDiagramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Flow Diagram</h3>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded mb-4 overflow-x-auto">
                <MermaidChart code={diagramCode} />
              </div>
              <button
                onClick={() => setShowDiagramModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Step-by-Step Status */}
        {stepByStepMode && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Step-by-Step Mode
                </span>
                {currentStepIndex !== null && (
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    Current: Step {testSteps[currentStepIndex]?.step} - {testSteps[currentStepIndex]?.description}
                  </span>
                )}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {stepResults.length} of {testSteps.length} steps completed
              </div>
            </div>
            {nextSteps.length > 0 && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Next possible steps: {nextSteps.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Step Results Display */}
        {stepByStepMode && stepResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Step Results</h3>
            <div className="space-y-3">
              {stepResults.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg mb-2 ${result.result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-lg">{result.result.success ? '✅' : '⚡'}</span>
                    <span className={`font-semibold ${result.result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{result.result.success ? 'Success' : 'Execution Error'}</span>
                  </div>
                  {!result.result.success && (
                    <div className="mb-2 text-sm text-red-700 dark:text-red-300">
                      {typeof result.result.error === 'object'
                        ? result.result.error?.message || JSON.stringify(result.result.error)
                        : result.result.error || 'Unknown error'}
                    </div>
                  )}
                  {!result.result.success && result.result.response && (
                    <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto mt-2">
                      {typeof result.result.response === 'string' ? result.result.response : JSON.stringify(result.result.response, null, 2)}
                    </pre>
                  )}
                  {!result.result.success && (
                    <button className="mt-2 px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow">Retry</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {modifiedSteps.map((step, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Step Header */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg flex-shrink-0">
                    {typeof getStepIcon(step) === 'object' ? JSON.stringify(getStepIcon(step)) : String(getStepIcon(step))}
                  </span>
                  <div className="w-32 flex-shrink-0 border border-red-500">
                    {editMode ? (
                      <input
                        type="text"
                        value={typeof step.description === 'object' ? JSON.stringify(step.description) : String(step.description)}
                        onChange={e => handleStepUpdate(step.step, 'description', e.target.value)}
                        className="font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base w-full truncate"
                        placeholder="Step description"
                        title={typeof step.description === 'object' ? JSON.stringify(step.description) : String(step.description)}
                        style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                      />
                    ) : (
                      <div
                        className="font-medium text-gray-900 dark:text-white w-full truncate"
                        style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                        title={
                          typeof step.description === 'object'
                            ? JSON.stringify(step.description)
                            : String(step.description)
                        }
                      >
                        Step{' '}
                        {typeof step.step === 'object'
                          ? JSON.stringify(step.step)
                          : String(step.step)}
                        :{' '}
                        {typeof step.description === 'object'
                          ? JSON.stringify(step.description)
                          : String(step.description)}
                        {step.label !== undefined &&
                          (typeof step.label === 'object'
                            ? ` | Label: ${JSON.stringify(step.label)}`
                            : ` | Label: ${String(step.label)}`)}
                        {step.icon !== undefined &&
                          (typeof step.icon === 'object'
                            ? ` | Icon: ${JSON.stringify(step.icon)}`
                            : ` | Icon: ${String(step.icon)}`)}
                        {step.error !== undefined &&
                          (typeof step.error === 'object'
                            ? ` | Error: ${JSON.stringify(step.error)}`
                            : ` | Error: ${String(step.error)}`)}
                        {step.response !== undefined &&
                          (typeof step.response === 'object'
                            ? ` | Response: ${JSON.stringify(step.response)}`
                            : ` | Response: ${String(step.response)}`)}
                      </div>
                    )}
                  </div>
                </div>
                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleDetails(step.step)}
                  className="ml-2 p-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  aria-label={showDetails[step.step] ? 'Hide details' : 'Show details'}
                >
                  {showDetails[step.step] ? '▼' : '▶'}
                </button>
                {editMode && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => moveStep(index, 'up')} className="p-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600">↑</button>
                    <button onClick={() => moveStep(index, 'down')} className="p-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600">↓</button>
                    <button onClick={() => removeStep(step.step)} className="p-1 text-xs bg-red-700 text-white rounded hover:bg-red-800">Remove</button>
                  </div>
                )}
              </div>
              {/* Expanded Details */}
              {showDetails[step.step] && (
                <ErrorBoundary>
                  <div className="p-4 space-y-4">
                    {/* API Call Details */}
                    {step.apiCall && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <span className="mr-2">🌐</span>
                          API Call Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Method:</span>
                            <span className={`px-2 py-1 rounded text-xs font-mono ${
                              step.apiCall.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              step.apiCall.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              step.apiCall.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              step.apiCall.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {typeof step.apiCall.method === 'string' ? step.apiCall.method : JSON.stringify(step.apiCall.method)}
                            </span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300 mt-1">URL:</span>
                            <code className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs break-all">
                              {typeof step.apiCall.url === 'string' ? step.apiCall.url : JSON.stringify(step.apiCall.url)}
                            </code>
                          </div>
                          {step.apiCall.headers && Object.keys(step.apiCall.headers).length > 0 && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Headers:</span>
                              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs mt-1 overflow-x-auto">
                                {JSON.stringify(step.apiCall.headers, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.apiCall.body && Object.keys(step.apiCall.body).length > 0 && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Body:</span>
                              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs mt-1 overflow-x-auto">
                                {JSON.stringify(step.apiCall.body, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Response Data */}
                    {step.response && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
                          <span className="mr-2">✅</span>
                          Response Data
                        </h4>
                        <div className="space-y-2">
                          {typeof step.response === 'object' ? (
                            <div>
                              {/* Response Metadata */}
                              <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  {step.response.duration && (
                                    <div><span className="font-medium">Duration:</span> {step.response.duration}ms</div>
                                  )}
                                  {step.response.timestamp && (
                                    <div><span className="font-medium">Timestamp:</span> {new Date(step.response.timestamp).toLocaleString()}</div>
                                  )}
                                  {step.response.success !== undefined && (
                                    <div><span className="font-medium">Success:</span>
                                      <span className={`ml-1 px-1 py-0.5 rounded ${
                                        step.response.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      }`}>
                                        {step.response.success ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status */}
                              {step.response.status && (
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium text-green-800 dark:text-green-200">Status:</span>
                                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                                    step.response.status >= 200 && step.response.status < 300 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    step.response.status >= 400 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  }`}>
                                    {step.response.status}
                                  </span>
                                </div>
                              )}

                              {/* Error Information */}
                              {step.response.error && (
                                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</h5>
                                  {typeof step.response.error === 'object' ? (
                                    <div className="space-y-1 text-sm">
                                      {step.response.error.message && (
                                        <div><span className="font-medium">Message:</span> {step.response.error.message}</div>
                                      )}
                                      {step.response.error.code && (
                                        <div><span className="font-medium">Code:</span> {step.response.error.code}</div>
                                      )}
                                      {step.response.error.status_code && (
                                        <div><span className="font-medium">Status Code:</span> {step.response.error.status_code}</div>
                                      )}
                                      {step.response.error.status_code_description && (
                                        <div><span className="font-medium">Description:</span> {step.response.error.status_code_description}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm">{String(step.response.error)}</div>
                                  )}
                                </div>
                              )}

                              {/* Resource Data */}
                              {step.response.resource && step.response.resource.data && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Resource Data:</h5>
                                  <div className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                      {step.response.resource.data._id && (
                                        <div><span className="font-medium">ID:</span> {step.response.resource.data._id}</div>
                                      )}
                                      {step.response.resource.data.type && (
                                        <div><span className="font-medium">Type:</span> {step.response.resource.data.type}</div>
                                      )}
                                      {step.response.resource.data.status && (
                                        <div><span className="font-medium">Status:</span>
                                          <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                                            step.response.resource.data.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            step.response.resource.data.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                          }`}>
                                            {step.response.resource.data.status}
                                          </span>
                                        </div>
                                      )}
                                      {step.response.resource.data.amount && (
                                        <div><span className="font-medium">Amount:</span> {step.response.resource.data.amount} {step.response.resource.data.currency}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Full Response JSON */}
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-medium text-green-800 dark:text-green-200 hover:text-green-900 dark:hover:text-green-100">
                                  View Full Response JSON
                                </summary>
                                <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs mt-2 overflow-x-auto">
                                  {JSON.stringify(step.response, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ) : (
                            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                              {String(step.response)}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Information */}
                    {step.error && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center">
                          <span className="mr-2">❌</span>
                          Error Information
                        </h4>
                        <div className="space-y-2">
                          {typeof step.error === 'object' ? (
                            <div className="space-y-2">
                              {step.error.message && (
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
                                  <span className="font-medium text-red-800 dark:text-red-200">Message:</span>
                                  <div className="text-red-700 dark:text-red-300 mt-1">{step.error.message}</div>
                                </div>
                              )}
                              {step.error.code && (
                                <div><span className="font-medium text-red-800 dark:text-red-200">Code:</span> {step.error.code}</div>
                              )}
                              {step.error.name && (
                                <div><span className="font-medium text-red-800 dark:text-red-200">Type:</span> {step.error.name}</div>
                              )}

                              {/* Error Suggestions */}
                              {step.error.message && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Troubleshooting Suggestions:</h5>
                                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    {step.error.message.toLowerCase().includes('transaction declined') && (
                                      <>
                                        <div>• <strong>Card Issue:</strong> Try using a different test card number</div>
                                        <div>• <strong>Test Cards:</strong> Use Paydock's test card numbers (e.g., 4111111111111111)</div>
                                        <div>• <strong>Amount:</strong> Try a smaller amount (e.g., $1.00)</div>
                                        <div>• <strong>Currency:</strong> Ensure the currency matches your gateway configuration</div>
                                      </>
                                    )}
                                    {step.error.message.toLowerCase().includes('invalid card') && (
                                      <>
                                        <div>• <strong>Card Number:</strong> Use a valid test card number (16 digits)</div>
                                        <div>• <strong>Expiry:</strong> Ensure card expiry date is in the future</div>
                                        <div>• <strong>CVV:</strong> Use a 3-4 digit CVV code</div>
                                      </>
                                    )}
                                    {step.error.message.toLowerCase().includes('authentication') && (
                                      <>
                                        <div>• <strong>API Keys:</strong> Check your Paydock API keys are correct</div>
                                        <div>• <strong>Environment:</strong> Ensure you're using the right environment (test/production)</div>
                                        <div>• <strong>Permissions:</strong> Verify your API keys have the required permissions</div>
                                      </>
                                    )}
                                    {step.error.message.toLowerCase().includes('gateway') && (
                                      <>
                                        <div>• <strong>Gateway Status:</strong> Check if the payment gateway is available</div>
                                        <div>• <strong>Configuration:</strong> Verify gateway settings in your Paydock dashboard</div>
                                        <div>• <strong>Test Mode:</strong> Ensure you're using test credentials for development</div>
                                      </>
                                    )}
                                    {step.error.message.toLowerCase().includes('validation') && (
                                      <>
                                        <div>• <strong>Required Fields:</strong> Check all required fields are provided</div>
                                        <div>• <strong>Data Format:</strong> Ensure data is in the correct format</div>
                                        <div>• <strong>Field Values:</strong> Verify field values meet validation requirements</div>
                                      </>
                                    )}
                                    {!step.error.message.toLowerCase().includes('transaction declined') &&
                                     !step.error.message.toLowerCase().includes('invalid card') &&
                                     !step.error.message.toLowerCase().includes('authentication') &&
                                     !step.error.message.toLowerCase().includes('gateway') &&
                                     !step.error.message.toLowerCase().includes('validation') && (
                                      <>
                                        <div>• <strong>Check Logs:</strong> Review server logs for more detailed error information</div>
                                        <div>• <strong>API Documentation:</strong> Consult Paydock API documentation for this endpoint</div>
                                        <div>• <strong>Test Environment:</strong> Try the request in a test environment first</div>
                                        <div>• <strong>Contact Support:</strong> If the issue persists, contact Paydock support</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}

                              {step.error.stack && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-sm font-medium text-red-800 dark:text-red-200">
                                    Stack Trace
                                  </summary>
                                  <pre className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-xs mt-1 overflow-x-auto">
                                    {step.error.stack}
                                  </pre>
                                </details>
                              )}
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium text-red-800 dark:text-red-200">
                                  Full Error Object
                                </summary>
                                <pre className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-xs mt-1 overflow-x-auto">
                                  {JSON.stringify(step.error, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ) : (
                            <div className="text-red-700 dark:text-red-300">{String(step.error)}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documentation */}
                    {step.documentation && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                          <span className="mr-2">📚</span>
                          Documentation
                        </h4>
                        <p className="text-blue-800 dark:text-blue-200 text-sm">
                          {typeof step.documentation === 'string' ? step.documentation : JSON.stringify(step.documentation)}
                        </p>
                      </div>
                    )}

                    {/* Copy Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(step, null, 2), step.step)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs flex items-center space-x-1"
                      >
                        {copiedStep === step.step ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </ErrorBoundary>
              )}

              {/* Step Dependencies, Conditions, and Branching */}
              {(step.dependsOn || step.outgoingEdges || step.retryConfig) && (
                <div className="space-y-2">
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dependencies</h4>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        Depends on steps: {step.dependsOn.join(', ')}
                      </div>
                    </div>
                  )}

                  {step.outgoingEdges && step.outgoingEdges.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Outgoing Paths</h4>
                      <div className="space-y-2">
                        {step.outgoingEdges.map((edge: FlowEdge, idx: number) => (
                          <div key={idx} className="text-sm p-3 rounded border-l-4" style={{
                            backgroundColor: edge.isElse ? '#fef3c7' : '#dbeafe',
                            borderLeftColor: edge.isElse ? '#f59e0b' : '#3b82f6',
                            color: edge.isElse ? '#92400e' : '#1e40af'
                          }}>
                            <div className="font-medium">
                              {edge.isElse ? 'Else Path' : 'Conditional Path'} → Step {edge.targetStep}
                            </div>
                            {edge.label && <div className="text-xs opacity-75">Label: {edge.label}</div>}
                            {edge.condition && (
                              <div className="text-xs mt-1">
                                If step {edge.condition.stepNumber}.{edge.condition.field} {edge.condition.operator} "{edge.condition.value}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy condition support for backward compatibility */}
                  {step.condition && !step.outgoingEdges && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Condition</h4>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                        Only execute if step {step.condition.stepNumber}.{step.condition.field} {step.condition.operator} "{step.condition.value}"
                      </div>
                    </div>
                  )}

                  {step.retryConfig && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Retry Configuration</h4>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-3 rounded">
                        Max attempts: {step.retryConfig.maxAttempts} | Delay: {step.retryConfig.delayMs}ms | Backoff: {step.retryConfig.backoffMultiplier}x
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editMode && index > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Condition (optional)</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm">Run this step only if</span>
                    <select
                      value={step.condition?.stepNumber || ''}
                      onChange={e => {
                        const stepNumber = Number(e.target.value);
                        handleStepUpdate(step.step, 'condition', {
                          ...step.condition,
                          stepNumber,
                        });
                      }}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Select previous step...</option>
                      {modifiedSteps.slice(0, index).map(prevStep => (
                        <option key={prevStep.step} value={prevStep.step}>
                          Step {prevStep.step}: {prevStep.description}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={step.condition?.field || ''}
                      onChange={e => handleStepUpdate(step.step, 'condition', {
                        ...step.condition,
                        field: e.target.value,
                      })}
                      placeholder="Field (e.g. status)"
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm w-32"
                    />
                    <select
                      value={step.condition?.operator || ''}
                      onChange={e => handleStepUpdate(step.step, 'condition', {
                        ...step.condition,
                        operator: e.target.value,
                      })}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Operator</option>
                      {conditionOperators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={step.condition?.value || ''}
                      onChange={e => handleStepUpdate(step.step, 'condition', {
                        ...step.condition,
                        value: e.target.value,
                      })}
                      placeholder="Value"
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm w-32"
                    />
                    <button
                      onClick={() => handleStepUpdate(step.step, 'condition', undefined)}
                      className="ml-2 px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800"
                      title="Remove condition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {editMode && (
            <div className="flex justify-end mt-4">
              <button
                onClick={addStep}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow text-sm font-semibold"
              >
                + Add Step
              </button>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> This will execute real API calls. Make sure you're using the correct environment and have proper permissions.
              {hasChanges() && (
                <span className="block mt-1 font-medium">
                  • You have made modifications to the original requests. These changes will be used for execution.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
