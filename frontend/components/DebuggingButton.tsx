'use client';

import React, { useState } from 'react';
import { Bug, ChevronDown, AlertTriangle, TrendingUp, Lightbulb, Zap } from 'lucide-react';

interface DebuggingButtonProps {
  onAnalyzeFailure: () => void;
  onPredictIssues: () => void;
  onGetDebugSteps: () => void;
  hasExecutionData: boolean;
  hasError: boolean;
  isAnalyzing: boolean;
}

export default function DebuggingButton({
  onAnalyzeFailure,
  onPredictIssues,
  onGetDebugSteps,
  hasExecutionData,
  hasError,
  isAnalyzing
}: DebuggingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id: 'analysis',
      label: 'Analyze Failure',
      description: 'AI analysis of execution failures',
      icon: <AlertTriangle className="w-4 h-4" />,
      onClick: onAnalyzeFailure,
      disabled: !hasExecutionData,
      disabledReason: 'No execution data available'
    },
    {
      id: 'prediction',
      label: 'Predict Issues',
      description: 'AI prediction of potential problems',
      icon: <TrendingUp className="w-4 h-4" />,
      onClick: onPredictIssues,
      disabled: false
    },
    {
      id: 'debugging',
      label: 'Debugging Steps',
      description: 'Step-by-step debugging guidance',
      icon: <Lightbulb className="w-4 h-4" />,
      onClick: onGetDebugSteps,
      disabled: !hasError,
      disabledReason: 'No error context available'
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isAnalyzing}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
          isAnalyzing
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        }`}
      >
        <Bug className="w-4 h-4" />
        <span className="font-medium">AI Debugging</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {isAnalyzing && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">AI-Powered Debugging</h3>
              <p className="text-sm text-gray-500 mt-1">
                Intelligent analysis and troubleshooting for your flows
              </p>
            </div>

            <div className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      setIsOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                    item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50'
                  }`}
                >
                  <div className={`mt-0.5 ${item.disabled ? 'text-gray-300' : 'text-blue-600'}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                    {item.disabled && item.disabledReason && (
                      <div className="text-xs text-gray-400 mt-1">{item.disabledReason}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Zap className="w-3 h-3" />
                <span>Powered by OpenAI GPT-4</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
