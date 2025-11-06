import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../lib/api';

interface FlowTemplate {
  name: string;
  description: string;
  steps: any[];
  categories: string[];
  primaryCategory: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  useCase: string;
}

interface CustomFlow {
  name: string;
  description: string;
  steps: any[];
}

interface FlowTemplateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (templateName: string) => void;
}

const allCategories = [
  'charges', 'customers', 'subscriptions', '3ds', 'wallets', 'network-tokens', 'fraud', 'advanced'
];
const allComplexities = ['basic', 'intermediate', 'advanced'];

export default function FlowTemplateDrawer({ open, onClose, onSelectTemplate }: FlowTemplateDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customFlows, setCustomFlows] = useState<CustomFlow[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load templates from backend
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/flows/templates'));
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to load templates:', response.status);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load custom flows from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ultron-custom-flows');
    if (saved) {
      try {
        setCustomFlows(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading custom flows:', error);
      }
    }
  }, [open]); // Reload when drawer opens

  // Delete custom flow
  const deleteCustomFlow = (flowName: string) => {
    if (confirm(`Are you sure you want to delete "${flowName}"?`)) {
      const updated = customFlows.filter(flow => flow.name !== flowName);
      setCustomFlows(updated);
      localStorage.setItem('ultron-custom-flows', JSON.stringify(updated));
    }
  };

  // Filter custom flows
  const filteredCustomFlows = customFlows.filter(flow =>
    flow.name.toLowerCase().includes(search.toLowerCase()) ||
    flow.description.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = templates.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.categories.some(cat => cat.toLowerCase().includes(search.toLowerCase())) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesComplexity = selectedComplexity ? t.complexity === selectedComplexity : true;
    const matchesCategory = selectedCategory ? t.categories.includes(selectedCategory) : true;
    return matchesSearch && matchesComplexity && matchesCategory;
  });

  const grouped = {
    basic: filtered.filter(t => t.complexity === 'basic'),
    intermediate: filtered.filter(t => t.complexity === 'intermediate'),
    advanced: filtered.filter(t => t.complexity === 'advanced'),
  };

  return (
    <div
      className={`fixed inset-0 z-40 transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`absolute left-0 top-0 h-full w-[400px] max-w-full bg-gray-900 border-r border-gray-800 shadow-xl transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Flow Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl" aria-label="Close">×</button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)] space-y-6">
          {/* Search Bar */}
          <input
            type="text"
            className="w-full mb-3 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allComplexities.map(c => (
              <button
                key={c}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedComplexity === c ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
                onClick={() => setSelectedComplexity(selectedComplexity === c ? null : c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
            <button
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedComplexity === null ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
              onClick={() => setSelectedComplexity(null)}
            >
              All Levels
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </button>
            ))}
            <button
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedCategory === null ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </button>
          </div>
          {/* Custom Flows Section */}
          {filteredCustomFlows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-purple-400 mb-2">Custom Flows</h3>
              <div className="space-y-2">
                {filteredCustomFlows.map((flow) => (
                  <div
                    key={flow.name}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-left group relative"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">⚙️</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white group-hover:text-purple-400 transition-colors">
                          {flow.name}
                        </div>
                        <div className="text-sm text-gray-400">Custom</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{flow.description}</div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="text-xs text-gray-500">{flow.steps.length} steps</div>
                        <div className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">Custom</div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { onSelectTemplate(`custom:${flow.name}`); onClose(); }}
                        className="p-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
                        title="Load flow"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteCustomFlow(flow.name)}
                        className="p-1 text-xs bg-red-700 text-white rounded hover:bg-red-600"
                        title="Delete flow"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Loading State */}
          {isLoading && (
            <div className="text-center text-gray-400 mt-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Loading templates...
            </div>
          )}
          {/* Grouped Results */}
          {!isLoading && (
            <>
              {filtered.length === 0 && filteredCustomFlows.length === 0 ? (
                <div className="text-center text-gray-400 mt-12">No results found.</div>
              ) : (
                <div className="space-y-6">
              {grouped.basic.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-2">Basic Flows</h3>
                  <div className="space-y-2">
                    {grouped.basic.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => { onSelectTemplate(template.name); onClose(); }}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">🔗</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-sm text-gray-400 capitalize">{template.primaryCategory}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <div className="text-xs text-gray-500">{template.estimatedDuration}</div>
                            <div className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Basic</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {grouped.intermediate.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-2">Intermediate Flows</h3>
                  <div className="space-y-2">
                    {grouped.intermediate.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => { onSelectTemplate(template.name); onClose(); }}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">🔗</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-sm text-gray-400 capitalize">{template.primaryCategory}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <div className="text-xs text-gray-500">{template.estimatedDuration}</div>
                            <div className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded-full">Intermediate</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {grouped.advanced.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Advanced Flows</h3>
                  <div className="space-y-2">
                    {grouped.advanced.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => { onSelectTemplate(template.name); onClose(); }}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">🔗</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-sm text-gray-400 capitalize">{template.primaryCategory}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <div className="text-xs text-gray-500">{template.estimatedDuration}</div>
                            <div className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">Advanced</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
