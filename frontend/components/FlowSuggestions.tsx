'use client';

import { useState } from 'react';
import { Lightbulb, AlertTriangle, Zap, Shield, Check, X, Loader2 } from 'lucide-react';

interface FlowSuggestion {
  type: 'improvement' | 'warning' | 'optimization' | 'security';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedCode?: any;
}

interface FlowSuggestionsProps {
  suggestions: FlowSuggestion[];
  onApplySuggestion: (suggestion: FlowSuggestion) => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

const getSuggestionIcon = (type: FlowSuggestion['type']) => {
  switch (type) {
    case 'improvement':
      return <Lightbulb className="w-5 h-5 text-blue-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'optimization':
      return <Zap className="w-5 h-5 text-green-500" />;
    case 'security':
      return <Shield className="w-5 h-5 text-red-500" />;
    default:
      return <Lightbulb className="w-5 h-5 text-gray-500" />;
  }
};

const getPriorityColor = (priority: FlowSuggestion['priority']) => {
  switch (priority) {
    case 'high':
      return 'border-red-200 bg-red-50';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50';
    case 'low':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

const getPriorityText = (priority: FlowSuggestion['priority']) => {
  switch (priority) {
    case 'high':
      return 'High Priority';
    case 'medium':
      return 'Medium Priority';
    case 'low':
      return 'Low Priority';
    default:
      return 'Priority';
  }
};

export default function FlowSuggestions({
  suggestions,
  onApplySuggestion,
  onDismiss,
  isLoading = false
}: FlowSuggestionsProps) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const handleApplySuggestion = (suggestion: FlowSuggestion) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions(prev => new Set(prev).add(suggestion.title));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-600">Analyzing flow for suggestions...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center space-x-2">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-gray-600">No suggestions found. Your flow looks good!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI Flow Suggestions</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggestions List */}
      <div className="max-h-96 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.title}-${index}`}
            className={`border-l-4 ${getPriorityColor(suggestion.priority)} p-4 ${
              index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getSuggestionIcon(suggestion.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      suggestion.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getPriorityText(suggestion.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {suggestion.suggestedCode && (
                  <button
                    onClick={() => handleApplySuggestion(suggestion)}
                    disabled={appliedSuggestions.has(suggestion.title)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      appliedSuggestions.has(suggestion.title)
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {appliedSuggestions.has(suggestion.title) ? (
                      <>
                        <Check className="w-3 h-3 inline mr-1" />
                        Applied
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          AI suggestions help improve flow reliability and best practices.
          Review each suggestion before applying.
        </p>
      </div>
    </div>
  );
}
