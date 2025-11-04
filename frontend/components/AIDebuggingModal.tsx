'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Lightbulb, Bug, TrendingUp, CheckCircle, Clock, Zap } from 'lucide-react';

interface DebugAnalysis {
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

interface DebugFix {
  title: string;
  description: string;
  codeExample?: any;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  type: 'code' | 'configuration' | 'data' | 'process';
}

interface DebugPrediction {
  issue: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  description: string;
  preventionSteps: string[];
}

interface ExecutionResult {
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
  outgoingEdges?: any[];
}

interface AIDebuggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flow: TestStep[];
  executionResults?: ExecutionResult[];
  currentError?: string;
}

export default function AIDebuggingModal({
  isOpen,
  onClose,
  flow,
  executionResults = [],
  currentError
}: AIDebuggingModalProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'prediction' | 'debugging'>('analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [debugAnalysis, setDebugAnalysis] = useState<DebugAnalysis | null>(null);
  const [predictions, setPredictions] = useState<DebugPrediction[]>([]);
  const [debugSteps, setDebugSteps] = useState<DebugFix[]>([]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'immediate': return <Zap className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const analyzeFailure = async () => {
    if (!executionResults.length) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ask/analyze-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionResults, flow })
      });

      if (response.ok) {
        const data = await response.json();
        setDebugAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Failed to analyze failure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const predictIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ask/predict-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow })
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions);
      }
    } catch (error) {
      console.error('Failed to predict issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestDebuggingSteps = async () => {
    if (!currentError) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ask/suggest-debugging-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: currentError,
          context: { flow, executionResults }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDebugSteps(data.steps);
      }
    } catch (error) {
      console.error('Failed to suggest debugging steps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'analysis' | 'prediction' | 'debugging') => {
    setActiveTab(tab);

    // Auto-trigger analysis based on tab
    if (tab === 'analysis' && executionResults.length > 0 && !debugAnalysis) {
      analyzeFailure();
    } else if (tab === 'prediction' && predictions.length === 0) {
      predictIssues();
    } else if (tab === 'debugging' && currentError && debugSteps.length === 0) {
      suggestDebuggingSteps();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bug className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI-Powered Debugging</h2>
              <p className="text-sm text-gray-500">Intelligent analysis and troubleshooting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('analysis')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Failure Analysis</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('prediction')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'prediction'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Issue Prediction</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('debugging')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'debugging'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Debugging Steps</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">AI is analyzing...</span>
            </div>
          ) : (
            <>
              {/* Failure Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {!executionResults.length ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Execution Data</h3>
                      <p className="text-gray-500">Run a flow first to analyze failures</p>
                    </div>
                  ) : debugAnalysis ? (
                    <div className="space-y-6">
                      {/* Root Cause */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Root Cause</h3>
                        <p className="text-gray-700">{debugAnalysis.rootCause}</p>
                        {debugAnalysis.stepNumber && (
                          <div className="mt-2 text-sm text-gray-500">
                            Failed at step {debugAnalysis.stepNumber}
                          </div>
                        )}
                      </div>

                      {/* Severity */}
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700">Severity:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(debugAnalysis.severity)}`}>
                          {debugAnalysis.severity.toUpperCase()}
                        </span>
                      </div>

                      {/* Explanation */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Explanation</h3>
                        <p className="text-gray-700 leading-relaxed">{debugAnalysis.explanation}</p>
                      </div>

                      {/* Suggested Fixes */}
                      {debugAnalysis.suggestedFixes.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Suggested Fixes</h3>
                          <div className="space-y-3">
                            {debugAnalysis.suggestedFixes.map((fix, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  {getPriorityIcon(fix.priority)}
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{fix.title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{fix.description}</p>
                                    {fix.codeExample && (
                                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(fix.codeExample, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prevention Tips */}
                      {debugAnalysis.preventionTips.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Prevention Tips</h3>
                          <ul className="space-y-2">
                            {debugAnalysis.preventionTips.map((tip, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <button
                        onClick={analyzeFailure}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Analyze Failure
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Issue Prediction Tab */}
              {activeTab === 'prediction' && (
                <div className="space-y-6">
                  {predictions.length > 0 ? (
                    <div className="space-y-4">
                      {predictions.map((prediction, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{prediction.issue}</h3>
                            <div className="flex space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getProbabilityColor(prediction.probability)}`}>
                                {prediction.probability.toUpperCase()} Probability
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(prediction.impact)}`}>
                                {prediction.impact.toUpperCase()} Impact
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-4">{prediction.description}</p>
                          {prediction.preventionSteps.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Prevention Steps:</h4>
                              <ul className="space-y-1">
                                {prediction.preventionSteps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start space-x-2">
                                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="text-gray-700">{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <button
                        onClick={predictIssues}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Predict Issues
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Debugging Steps Tab */}
              {activeTab === 'debugging' && (
                <div className="space-y-6">
                  {!currentError ? (
                    <div className="text-center py-8">
                      <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Error Context</h3>
                      <p className="text-gray-500">Provide an error message to get debugging steps</p>
                    </div>
                  ) : debugSteps.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <h3 className="font-medium text-red-900 mb-2">Current Error:</h3>
                        <p className="text-red-700 text-sm">{currentError}</p>
                      </div>
                      {debugSteps.map((step, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {getPriorityIcon(step.priority)}
                                <h4 className="font-medium text-gray-900">{step.title}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(step.priority)}`}>
                                  {step.priority.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-700">{step.description}</p>
                              {step.codeExample && (
                                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(step.codeExample, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <button
                        onClick={suggestDebuggingSteps}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Get Debugging Steps
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            AI-powered analysis • Powered by OpenAI GPT-4
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
