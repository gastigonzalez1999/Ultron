import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  Position,
  NodeMouseHandler,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { buildApiUrl } from '../lib/api';

interface Step {
  step: number;
  description: string;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  outgoingEdges?: FlowEdge[];
}

interface FlowEdge {
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

interface FlowTemplate {
  name: string;
  description: string;
  steps: Step[];
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  useCase: string;
}

interface FlowVisualEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
  open: boolean;
  onClose: () => void;
  currentStepNumber?: number | null;
}

const nodeWidth = 250;
const nodeHeight = 80;

const ensureApiCallDefaults = (apiCall?: Partial<Step['apiCall']>): Step['apiCall'] => ({
  method: apiCall?.method || 'POST',
  url: apiCall?.url || '',
  headers: apiCall?.headers || {},
  body: apiCall?.body,
});

// Helper to get available vault tokens from env
const getVaultTokens = () => {
  const tokens: { key: string; value: string; type: 'literal' | 'variable' }[] = [];
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_VAULT_TOKEN) {
      tokens.push({ key: 'VAULT_TOKEN', value: process.env.NEXT_PUBLIC_VAULT_TOKEN, type: 'literal' });
    }
    if (process.env.NEXT_PUBLIC_VAULT_TOKEN_INBUILD_3DS) {
      tokens.push({ key: 'VAULT_TOKEN_INBUILD_3DS', value: process.env.NEXT_PUBLIC_VAULT_TOKEN_INBUILD_3DS, type: 'literal' });
    }
    // Add variable options for runtime substitution
    tokens.push({ key: '{{vaultToken}}', value: '{{vaultToken}}', type: 'variable' });
    tokens.push({ key: '{{vaultTokenInbuild3ds}}', value: '{{vaultTokenInbuild3ds}}', type: 'variable' });
  }
  return tokens;
};

const FlowVisualEditor: React.FC<FlowVisualEditorProps> = ({ steps, onChange, open, onClose, currentStepNumber }) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editStep, setEditStep] = useState<Step | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Edge editor state
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [currentEdge, setCurrentEdge] = useState<FlowEdge | null>(null);
  const [edgeSourceStep, setEdgeSourceStep] = useState<number | null>(null);

  // Template selection state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<FlowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null);
  const [customFlows, setCustomFlows] = useState<any[]>([]);

  // Template action modal state
  const [showTemplateActionModal, setShowTemplateActionModal] = useState(false);
  const [selectedTemplateData, setSelectedTemplateData] = useState<{ name: string; steps: Step[] } | null>(null);

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<Step[][]>([]);
  const [redoStack, setRedoStack] = useState<Step[][]>([]);

  // Track changes to steps for undo/redo
  useEffect(() => {
    // Only push to undo stack if steps actually changed (not on initial mount)
    if (open) {
      setUndoStack(prev => {
        if (prev.length === 0 || JSON.stringify(prev[prev.length - 1]) !== JSON.stringify(steps)) {
          return [...prev, steps];
        }
        return prev;
      });
      setRedoStack([]); // Clear redo stack on new change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  // Undo handler
  const handleUndo = () => {
    setUndoStack(prev => {
      if (prev.length > 1) {
        const newUndo = [...prev];
        const last = newUndo.pop();
        setRedoStack(r => [last!, ...r]);
        onChange(newUndo[newUndo.length - 1]);
        return newUndo;
      }
      return prev;
    });
  };

  // Redo handler
  const handleRedo = () => {
    setRedoStack(prev => {
      if (prev.length > 0) {
        const [first, ...rest] = prev;
        setUndoStack(u => [...u, first]);
        onChange(first);
        return rest;
      }
      return prev;
    });
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, undoStack, redoStack]);

  // Load templates when modal opens
  useEffect(() => {
    if (showTemplateModal) {
      loadTemplates();
      loadCustomFlows();
    }
  }, [showTemplateModal]);

  // Load available templates
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

  // Load custom flows from localStorage
  const loadCustomFlows = () => {
      const saved = localStorage.getItem('ultron-custom-flows');
    if (saved) {
      try {
        setCustomFlows(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading custom flows:', error);
      }
    }
  };

  // Load selected template data and show action modal
  const loadSelectedTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      let templateSteps: Step[] = [];
      let templateName = selectedTemplate;

      // Check if this is a custom flow
      if (selectedTemplate.startsWith('custom:')) {
        const customFlowName = selectedTemplate.replace('custom:', '');
        const customFlow = customFlows.find((flow: any) => flow.name === customFlowName);

        if (customFlow) {
          templateSteps = customFlow.steps;
          templateName = customFlow.name;
        }
      } else {
        // Load built-in template
        const response = await fetch(buildApiUrl(`/api/flows/template/${encodeURIComponent(selectedTemplate)}`));
        if (response.ok) {
          const template = await response.json();
          templateSteps = template.steps;
          templateName = template.name;
        }
      }

      if (templateSteps.length > 0) {
        setSelectedTemplateData({ name: templateName, steps: templateSteps });
        setShowTemplateModal(false);
        setShowTemplateActionModal(true);
        setSelectedTemplate('');
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  // Template action handlers
  const handleReplaceFlow = () => {
    if (selectedTemplateData) {
      onChange(selectedTemplateData.steps);
      setShowTemplateActionModal(false);
      setSelectedTemplateData(null);
    }
  };

  const handleReplaceSelectedStep = () => {
    if (selectedTemplateData && editStep) {
      const templateStep = selectedTemplateData.steps[0]; // Use first step from template
      const updated = steps.map(s => s.step === editStep.step ? {
        ...templateStep,
        step: editStep.step, // Keep the same step number
      } : s);
      onChange(updated);
      setShowTemplateActionModal(false);
      setSelectedTemplateData(null);
      setEditStep(null);
      setSelectedNode(null);
    }
  };

  const handleAddAsNewSteps = () => {
    if (selectedTemplateData) {
      const nextStepNumber = steps.length > 0 ? Math.max(...steps.map(s => s.step)) + 1 : 1;
      const renumberedSteps = selectedTemplateData.steps.map((step, index) => ({
        ...step,
        step: nextStepNumber + index
      }));
      onChange([...steps, ...renumberedSteps]);
      setShowTemplateActionModal(false);
      setSelectedTemplateData(null);
    }
  };

  const handleInsertAtSelectedStep = () => {
    if (selectedTemplateData && editStep) {
      const insertPosition = editStep.step;
      const renumberedSteps = selectedTemplateData.steps.map((step, index) => ({
        ...step,
        step: insertPosition + index
      }));

      // Shift existing steps after the insert position
      const shiftedSteps = steps.map(s => ({
        ...s,
        step: s.step >= insertPosition ? s.step + selectedTemplateData.steps.length : s.step
      }));

      // Insert template steps at the selected position
      const beforeInsert = shiftedSteps.filter(s => s.step < insertPosition);
      const afterInsert = shiftedSteps.filter(s => s.step >= insertPosition + selectedTemplateData.steps.length);

      const newSteps = [...beforeInsert, ...renumberedSteps, ...afterInsert];
      onChange(newSteps);
      setShowTemplateActionModal(false);
      setSelectedTemplateData(null);
      setEditStep(null);
      setSelectedNode(null);
    }
  };

  // Filter templates
  const filteredTemplates = availableTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                         template.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
                         template.category.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true;
    const matchesComplexity = selectedComplexity ? template.complexity === selectedComplexity : true;
    return matchesSearch && matchesCategory && matchesComplexity;
  });

  const filteredCustomFlows = customFlows.filter(flow =>
    flow.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    flow.description.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Group templates by complexity
  const groupedTemplates = {
    basic: filteredTemplates.filter(t => t.complexity === 'basic'),
    intermediate: filteredTemplates.filter(t => t.complexity === 'intermediate'),
    advanced: filteredTemplates.filter(t => t.complexity === 'advanced'),
  };

  const allCategories = ['charges', 'customers', 'subscriptions', '3ds', 'wallets', 'network-tokens', 'fraud', 'advanced'];
  const allComplexities = ['basic', 'intermediate', 'advanced'];

  useEffect(() => {
    setNodes(
      steps.map((step, idx) => {
        const icon = '🔗';
        const backgroundColor = '#ffffff';
        const borderColor = '#d1d5db';

        return {
          id: String(step.step),
          type: 'default',
          data: { label: `${icon} Step ${step.step}: ${step.description}` },
          position: { x: 100, y: idx * 120 },
          style: {
            width: nodeWidth,
            height: nodeHeight,
            backgroundColor,
            border: `2px solid ${borderColor}`,
            // Highlight current step with glowing border
            ...(currentStepNumber === step.step && {
              border: '3px solid #3b82f6',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
              backgroundColor: '#eff6ff',
            }),
          },
        };
      })
    );
    setEdges(() => {
      const result: Edge[] = [];

      // Create edges based on outgoingEdges or fallback to sequential
      steps.forEach((step, idx) => {
        if (step.outgoingEdges && step.outgoingEdges.length > 0) {
          // Use the new branching system
          step.outgoingEdges.forEach((edge, edgeIdx) => {
            if (edge.isElse) {
              // Else path - no condition
              result.push({
                id: `else-${step.step}-${edge.targetStep}-${edgeIdx}`,
                source: String(step.step),
                target: String(edge.targetStep),
                label: edge.label || 'else',
                style: { stroke: '#6b7280', strokeDasharray: '5,5' },
                labelBgStyle: { fill: '#374151', color: '#9ca3af' },
              });
            } else if (edge.condition) {
              // Conditional path
              result.push({
                id: `cond-${step.step}-${edge.targetStep}-${edgeIdx}`,
                source: String(step.step),
                target: String(edge.targetStep),
                label: edge.label || `${edge.condition.field} ${edge.condition.operator} ${edge.condition.value}`,
                animated: true,
                style: { stroke: '#f59e42' },
                labelBgStyle: { fill: '#fffbe6', color: '#b45309' },
              });
            } else {
              // Default path (no condition)
              result.push({
                id: `default-${step.step}-${edge.targetStep}-${edgeIdx}`,
                source: String(step.step),
                target: String(edge.targetStep),
                label: edge.label || 'default',
              });
            }
          });
        } else if (idx < steps.length - 1) {
          // Fallback to sequential execution for backward compatibility
          result.push({
            id: `seq-${step.step}-${steps[idx + 1].step}`,
            source: String(step.step),
            target: String(steps[idx + 1].step),
          });
        }
      });

      return result;
    });
  }, [steps, setNodes, setEdges]);

  // Handle node click to edit
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    const step = steps.find(s => String(s.step) === node.id);
    if (step) setEditStep({
      ...step,
      apiCall: step.apiCall ? ensureApiCallDefaults(step.apiCall) : undefined,
    });
  }, [steps]);

  // Handle step edit save
  const handleSaveStep = () => {
    if (editStep) {
      const updated = steps.map(s => s.step === editStep.step ? {
        ...editStep,
        apiCall: editStep.apiCall ? ensureApiCallDefaults(editStep.apiCall) : undefined,
      } : s);
      onChange(updated);
      setEditStep(null);
      setSelectedNode(null);
    }
  };

  // Add new step
  const handleAddStep = () => {
    const maxStep = steps.length > 0 ? Math.max(...steps.map(s => s.step)) : 0;
    const newStep: Step = {
      step: maxStep + 1,
      description: 'New Step',
      apiCall: { method: 'POST', url: '', headers: {} },
    };
    onChange([...steps, newStep]);
  };

  // Handle edge creation (connect mode)
  const onConnect = useCallback((params: Edge | Connection) => {

    if (params.source && params.target) {
      const sourceStep = steps.find(s => String(s.step) === params.source);
      const targetStep = steps.find(s => String(s.step) === params.target);


      if (sourceStep && targetStep) {
        // Create a new outgoing edge
        const newEdge: FlowEdge = {
          targetStep: targetStep.step,
          label: `Step ${targetStep.step}`,
        };


        // Update the source step with the new outgoing edge
        const updatedSteps = steps.map(s => {
          if (s.step === sourceStep.step) {
            return {
              ...s,
              outgoingEdges: [...(s.outgoingEdges || []), newEdge]
            };
          }
          return s;
        });

        onChange(updatedSteps);

        // Open edge editor
        setCurrentEdge(newEdge);
        setEdgeSourceStep(sourceStep.step);
        setShowEdgeModal(true);
      }
    }
    setEdges(eds => addEdge(params, eds));
  }, [steps, setEdges, onChange]);

  // Save edge changes
  const saveEdge = () => {
    if (!currentEdge || edgeSourceStep === null) return;

    const updatedSteps = steps.map(s => {
      if (s.step === edgeSourceStep && s.outgoingEdges) {
        return {
          ...s,
          outgoingEdges: s.outgoingEdges.map(edge =>
            edge === currentEdge ? currentEdge : edge
          )
        };
      }
      return s;
    });

    onChange(updatedSteps);
    setShowEdgeModal(false);
    setCurrentEdge(null);
    setEdgeSourceStep(null);
  };

  // Add outgoing edge to a step
  const addOutgoingEdge = (stepNumber: number) => {
    const step = steps.find(s => s.step === stepNumber);
    if (!step) return;

    const newEdge: FlowEdge = {
      targetStep: stepNumber + 1, // Default to next step
      label: 'New Edge',
    };

    const updatedSteps = steps.map(s => {
      if (s.step === stepNumber) {
        return {
          ...s,
          outgoingEdges: [...(s.outgoingEdges || []), newEdge]
        };
      }
      return s;
    });

    onChange(updatedSteps);

    // Open edge editor
    setCurrentEdge(newEdge);
    setEdgeSourceStep(stepNumber);
    setShowEdgeModal(true);
  };

  // Edit an outgoing edge
  const editOutgoingEdge = (stepNumber: number, edgeIndex: number) => {
    const step = steps.find(s => s.step === stepNumber);
    if (!step || !step.outgoingEdges) return;

    const edge = step.outgoingEdges[edgeIndex];
    setCurrentEdge(edge);
    setEdgeSourceStep(stepNumber);
    setShowEdgeModal(true);
  };

  // Remove an outgoing edge
  const removeOutgoingEdge = (stepNumber: number, edgeIndex: number) => {
    const updatedSteps = steps.map(s => {
      if (s.step === stepNumber && s.outgoingEdges) {
        return {
          ...s,
          outgoingEdges: s.outgoingEdges.filter((_, idx) => idx !== edgeIndex)
        };
      }
      return s;
    });

    onChange(updatedSteps);
  };

  // Node deletion
  const handleDeleteNode = (nodeId: string) => {
    const idx = steps.findIndex(s => String(s.step) === nodeId);
    if (idx !== -1) {
      const updated = steps.filter((s, i) => i !== idx);
      onChange(updated);
    }
  };

  // Edge deletion
  const handleDeleteEdge = (edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  };

  // Keyboard delete support
  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    // Listen for delete key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        nodes.forEach(n => handleDeleteNode(n.id));
        edges.forEach(e => handleDeleteEdge(e.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps]);

  const vaultTokens = useMemo(getVaultTokens, []);
  const [selectedVaultToken, setSelectedVaultToken] = useState<string>('');

  // When editing a step, preselect the vault token if present in the body
  useEffect(() => {
    if (editStep && editStep.apiCall && editStep.apiCall.body && editStep.apiCall.body.vault_token) {
      setSelectedVaultToken(editStep.apiCall.body.vault_token);
    } else {
      setSelectedVaultToken('');
    }
  }, [editStep]);

  // When vault token changes, update the step body
  useEffect(() => {
    if (editStep && editStep.apiCall) {
      setEditStep(prev => {
        if (!prev) return prev;
        const newBody = { ...(prev.apiCall!.body || {}) };
        if (selectedVaultToken) {
          newBody.vault_token = selectedVaultToken;
        } else {
          delete newBody.vault_token;
        }
        return {
          ...prev,
          apiCall: { ...prev.apiCall!, body: newBody },
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVaultToken]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-5xl h-[80vh] flex flex-col relative">
          <div className="flex items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">Visual Flow Editor</h2>
            <button
              onClick={handleUndo}
              disabled={undoStack.length <= 1}
              className={`ml-2 px-3 py-1 rounded ${undoStack.length <= 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
              title="Undo (Ctrl+Z)"
            >
              ⬅️ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`ml-2 px-3 py-1 rounded ${redoStack.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
              title="Redo (Ctrl+Y)"
            >
              ➡️ Redo
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="ml-4 px-3 py-1 bg-purple-700 text-white rounded hover:bg-purple-800"
            >
              📋 Load Template
            </button>
            <button
              onClick={handleAddStep}
              className="ml-4 px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              + Add Step
            </button>
            <button
              onClick={() => {
                // Clear current flow and start fresh
                onChange([]);
              }}
              className="ml-4 px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800"
            >
              🗑️ Clear Flow
            </button>
            <button
              onClick={onClose}
              className="ml-4 px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0 min-w-0">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={(_event, _node) => {}}
              onConnect={onConnect}
              onInit={setRfInstance}
              fitView
              style={{ background: '#18181b', borderRadius: 8 }}
              selectionOnDrag
              onSelectionChange={onSelectionChange}
            >
              <MiniMap />
              <Controls />
              <Background gap={16} />
            </ReactFlow>
          </div>
          {/* Side panel for editing step */}
          {editStep && (
            <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-lg p-6 z-60 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Step {editStep.step}</h3>
              <label className="block mb-2 text-sm font-medium">Description</label>
              <input
                type="text"
                value={editStep.description}
                onChange={e => setEditStep({ ...editStep, description: e.target.value })}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <label className="block mb-2 text-sm font-medium">Method</label>
              <select
                value={editStep.apiCall?.method || 'POST'}
                onChange={e => setEditStep({ ...editStep, apiCall: { ...editStep.apiCall!, method: e.target.value || 'POST' } })}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <label className="block mb-2 text-sm font-medium">URL</label>
              <input
                type="text"
                value={editStep.apiCall?.url || ''}
                onChange={e => setEditStep({ ...editStep, apiCall: { ...editStep.apiCall!, url: e.target.value || '' } })}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <label className="block mb-2 text-sm font-medium">Headers (JSON)</label>
              <textarea
                value={JSON.stringify(editStep.apiCall?.headers || {}, null, 2)}
                onChange={e => {
                  try {
                    setEditStep({ ...editStep, apiCall: { ...editStep.apiCall!, headers: JSON.parse(e.target.value) } });
                  } catch {}
                }}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                rows={3}
              />
              <label className="block mb-2 text-sm font-medium">Body (JSON)</label>
              <textarea
                value={JSON.stringify(editStep.apiCall?.body || {}, null, 2)}
                onChange={e => {
                  try {
                    setEditStep({ ...editStep, apiCall: { ...editStep.apiCall!, body: JSON.parse(e.target.value) } });
                  } catch {}
                }}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                rows={4}
              />
              <label className="block mb-2 text-sm font-medium">Vault Token</label>
              <select
                value={selectedVaultToken}
                onChange={e => setSelectedVaultToken(e.target.value)}
                className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- None --</option>
                {vaultTokens.map(token => (
                  <option key={token.key} value={token.value}>
                    {token.type === 'variable' ? '🔧 ' : '🔑 '}
                    {token.key}
                    {token.type === 'literal' && token.value.length > 8 && ` (${token.value.slice(0, 8)}...)`}
                    {token.type === 'variable' && ' (runtime substitution)'}
                  </option>
                ))}
              </select>

              {/* Outgoing Edges Section */}
              <div className="mt-6 border-t border-gray-300 dark:border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Outgoing Edges</h4>
                  <button
                    onClick={() => addOutgoingEdge(editStep.step)}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    + Add Edge
                  </button>
                </div>

                {editStep.outgoingEdges && editStep.outgoingEdges.length > 0 ? (
                  <div className="space-y-2">
                    {editStep.outgoingEdges.map((edge, idx) => (
                      <div key={idx} className="p-2 border border-gray-300 dark:border-gray-600 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            To Step {edge.targetStep}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => editOutgoingEdge(editStep.step, idx)}
                              className="px-1 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeOutgoingEdge(editStep.step, idx)}
                              className="px-1 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="text-xs">
                          <div><strong>Label:</strong> {edge.label || 'No label'}</div>
                          {edge.isElse ? (
                            <div className="text-purple-600 font-medium">🔄 Else path</div>
                          ) : edge.condition ? (
                            <div className="text-blue-600 font-medium">
                              ⚡ Conditional: {edge.condition.field} {edge.condition.operator} {edge.condition.value}
                            </div>
                          ) : (
                            <div className="text-gray-500">📋 Default path</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    No outgoing edges. Add edges to create branching logic.
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveStep}
                className="mt-auto px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded shadow"
              >
                Save Step
              </button>
              <button
                onClick={() => { setEditStep(null); setSelectedNode(null); }}
                className="mt-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Simple Edge Editor Modal */}
      {showEdgeModal && currentEdge && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Edge</h3>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Label</label>
                <input
                  type="text"
                  value={currentEdge.label || ''}
                  onChange={e => setCurrentEdge({ ...currentEdge, label: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Target Step</label>
                <select
                  value={currentEdge.targetStep}
                  onChange={e => setCurrentEdge({ ...currentEdge, targetStep: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {steps.map(step => (
                    <option key={step.step} value={step.step}>
                      Step {step.step}: {step.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isElse"
                  checked={currentEdge.isElse || false}
                  onChange={e => setCurrentEdge({ ...currentEdge, isElse: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isElse" className="text-sm">This is an "else" path</label>
              </div>

              {!currentEdge.isElse && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Condition (optional)</h4>
                    {!currentEdge.condition ? (
                      <button
                        onClick={() => setCurrentEdge({
                          ...currentEdge,
                          condition: {
                            field: '',
                            operator: 'equals',
                            value: '',
                            stepNumber: 1
                          }
                        })}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        + Add Condition
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentEdge({
                          ...currentEdge,
                          condition: undefined
                        })}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Remove Condition
                      </button>
                    )}
                  </div>

                  {currentEdge.condition && (
                    <>
                      <div>
                        <label className="block mb-1 text-xs">Step to check</label>
                        <select
                          value={currentEdge.condition.stepNumber}
                          onChange={e => {
                            const stepNumber = parseInt(e.target.value);
                            if (stepNumber) {
                              setCurrentEdge({
                                ...currentEdge,
                                condition: {
                                  ...currentEdge.condition!,
                                  stepNumber
                                }
                              });
                            }
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {steps.map(step => (
                            <option key={step.step} value={step.step}>
                              Step {step.step}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-xs">Field path (e.g., resource.data.status)</label>
                        <input
                          type="text"
                          value={currentEdge.condition.field}
                          onChange={e => {
                            setCurrentEdge({
                              ...currentEdge,
                              condition: {
                                ...currentEdge.condition!,
                                field: e.target.value
                              }
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="resource.data.status"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-xs">Operator</label>
                        <select
                          value={currentEdge.condition.operator}
                          onChange={e => {
                            const operator = e.target.value as 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
                            setCurrentEdge({
                              ...currentEdge,
                              condition: {
                                ...currentEdge.condition!,
                                operator
                              }
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-xs">Value</label>
                        <input
                          type="text"
                          value={currentEdge.condition.value}
                          onChange={e => {
                            setCurrentEdge({
                              ...currentEdge,
                              condition: {
                                ...currentEdge.condition!,
                                value: e.target.value
                              }
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="success"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={saveEdge}
                className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded"
              >
                Save Edge
              </button>
              <button
                onClick={() => {
                  setShowEdgeModal(false);
                  setCurrentEdge(null);
                  setEdgeSourceStep(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Load Flow Template</h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate('');
                  setTemplateSearch('');
                  setSelectedCategory(null);
                  setSelectedComplexity(null);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-4">
              <input
                type="text"
                className="w-full mb-3 px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                autoFocus
              />

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {allComplexities.map(c => (
                  <button
                    key={c}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedComplexity === c
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedComplexity(selectedComplexity === c ? null : c)}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
                <button
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedComplexity === null
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedComplexity(null)}
                >
                  All Levels
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                  </button>
                ))}
                <button
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </button>
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTemplates.length === 0 && filteredCustomFlows.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
                  No templates found matching your criteria.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Custom Flows Section */}
                  {filteredCustomFlows.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3">Custom Flows</h4>
                      <div className="space-y-2">
                        {filteredCustomFlows.map((flow) => (
                          <button
                            key={flow.name}
                            onClick={() => setSelectedTemplate(`custom:${flow.name}`)}
                            className={`w-full p-3 rounded-lg border transition-colors text-left group ${
                              selectedTemplate === `custom:${flow.name}`
                                ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">⚙️</span>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium transition-colors ${
                                  selectedTemplate === `custom:${flow.name}`
                                    ? 'text-purple-800 dark:text-purple-200'
                                    : 'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                }`}>
                                  {flow.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Custom</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                  {flow.description}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{flow.steps.length} steps</div>
                                <div className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                                  Custom
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Built-in Templates */}
                  {groupedTemplates.basic.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3">Basic Flows</h4>
                      <div className="space-y-2">
                        {groupedTemplates.basic.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => setSelectedTemplate(template.name)}
                            className={`w-full p-3 rounded-lg border transition-colors text-left group ${
                              selectedTemplate === template.name
                                ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">💳</span>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium transition-colors ${
                                  selectedTemplate === template.name
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400'
                                }`}>
                                  {template.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{template.category}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                  {template.description}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{template.estimatedDuration}</div>
                                <div className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                  Basic
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedTemplates.intermediate.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3">Intermediate Flows</h4>
                      <div className="space-y-2">
                        {groupedTemplates.intermediate.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => setSelectedTemplate(template.name)}
                            className={`w-full p-3 rounded-lg border transition-colors text-left group ${
                              selectedTemplate === template.name
                                ? 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">🔧</span>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium transition-colors ${
                                  selectedTemplate === template.name
                                    ? 'text-orange-800 dark:text-orange-200'
                                    : 'text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                }`}>
                                  {template.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{template.category}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                  {template.description}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{template.estimatedDuration}</div>
                                <div className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                                  Intermediate
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedTemplates.advanced.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Advanced Flows</h4>
                      <div className="space-y-2">
                        {groupedTemplates.advanced.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => setSelectedTemplate(template.name)}
                            className={`w-full p-3 rounded-lg border transition-colors text-left group ${
                              selectedTemplate === template.name
                                ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">🚀</span>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium transition-colors ${
                                  selectedTemplate === template.name
                                    ? 'text-red-800 dark:text-red-200'
                                    : 'text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400'
                                }`}>
                                  {template.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{template.category}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                  {template.description}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{template.estimatedDuration}</div>
                                <div className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                                  Advanced
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={loadSelectedTemplate}
                disabled={!selectedTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium"
              >
                Load Template
              </button>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate('');
                  setTemplateSearch('');
                  setSelectedCategory(null);
                  setSelectedComplexity(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Action Modal */}
      {showTemplateActionModal && selectedTemplateData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Template Action</h3>
              <button
                onClick={() => {
                  setShowTemplateActionModal(false);
                  setSelectedTemplateData(null);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Template: <span className="font-medium text-gray-900 dark:text-white">{selectedTemplateData.name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Steps: <span className="font-medium text-gray-900 dark:text-white">{selectedTemplateData.steps.length}</span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleReplaceFlow}
                className="w-full p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg text-left hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <div className="font-medium text-red-800 dark:text-red-200">🔄 Replace Entire Flow</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Replace all current steps with template steps
                </div>
              </button>

              {editStep && (
                <>
                  <button
                    onClick={handleReplaceSelectedStep}
                    className="w-full p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg text-left hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <div className="font-medium text-blue-800 dark:text-blue-200">✏️ Replace Selected Step</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Replace Step {editStep.step} with first template step
                    </div>
                  </button>

                  <button
                    onClick={handleInsertAtSelectedStep}
                    className="w-full p-3 bg-purple-100 dark:bg-purple-900 border border-purple-300 dark:border-purple-700 rounded-lg text-left hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  >
                    <div className="font-medium text-purple-800 dark:text-purple-200">📎 Insert at Selected Step</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Insert template steps at Step {editStep.step} (shifts existing steps)
                    </div>
                  </button>
                </>
              )}

              <button
                onClick={handleAddAsNewSteps}
                className="w-full p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg text-left hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                <div className="font-medium text-green-800 dark:text-green-200">➕ Add as New Steps</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Add template steps to the end of current flow
                </div>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowTemplateActionModal(false);
                  setSelectedTemplateData(null);
                }}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlowVisualEditor;
