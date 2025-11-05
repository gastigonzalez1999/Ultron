'use client';

import { useState } from 'react';
import { Send, Loader2, MessageSquare, X, Check } from 'lucide-react';

interface NaturalLanguageExecutionProps {
  onExecute: (instruction: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  lastResult?: {
    explanation: string;
    modifiedFlow: any[];
  };
}

export default function NaturalLanguageExecution({
  onExecute,
  onClose,
  isLoading = false,
  lastResult
}: NaturalLanguageExecutionProps) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;

    onExecute(instruction.trim());
    setInstruction('');
  };

  const exampleInstructions = [
    "Change the customer name to John Doe",
    "Set the payment amount to $50",
    "Add error handling for failed payments",
    "Add a 2-second delay between steps",
    "Use a test card that will fail",
    "Add response validation for status codes"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Natural Language Flow Execution</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How to use:</h4>
            <p className="text-sm text-gray-600 mb-3">
              Describe what you want to change in your flow using natural language.
              The AI will modify the flow accordingly.
            </p>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Example instructions:</h5>
              <div className="grid grid-cols-1 gap-2">
                {exampleInstructions.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInstruction(example)}
                    className="text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-1">Flow Modified Successfully</h4>
                  <p className="text-sm text-green-700">{lastResult.explanation}</p>
                  <div className="mt-2 text-xs text-green-600">
                    Flow updated with {lastResult.modifiedFlow.length} step{lastResult.modifiedFlow.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="instruction" className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to change?
              </label>
              <textarea
                id="instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., Change the customer name to John Doe, or add error handling for failed payments..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!instruction.trim() || isLoading}
                className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 ${
                  !instruction.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            The AI will modify your flow based on your instruction.
            You can review the changes before applying them.
          </p>
        </div>
      </div>
    </div>
  );
}
