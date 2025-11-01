'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Copy, Check, AlertTriangle } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';

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

interface ExecutionResultsProps {
  results: TestStepExecution[];
  onRetryStep?: (stepNumber: number) => void;
  onRetryAll?: () => void;
}

export default function ExecutionResults({ results, onRetryStep, onRetryAll }: ExecutionResultsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const toggleStepDetails = (stepNumber: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const copyResponse = async (response: any, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (error) {
      console.error('Failed to copy response:', error);
    }
  };

  const getStepIcon = (result: ExecutionResult) => {
    if (result.error === 'Skipped due to unmet condition') {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStepStatus = (result: ExecutionResult) => {
    if (result.error === 'Skipped due to unmet condition') {
      return 'Skipped';
    }
    if (result.success) {
      return 'Success';
    } else {
      return 'Failed';
    }
  };

  const getStepStatusColor = (result: ExecutionResult) => {
    if (result.error === 'Skipped due to unmet condition') {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    if (result.success) {
      return 'text-green-600 dark:text-green-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusCodeColor = (statusCode?: number) => {
    if (!statusCode) return 'text-gray-500';
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 dark:text-green-400';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600 dark:text-yellow-400';
    if (statusCode >= 500) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  const successfulSteps = results.filter(r => r.result.success).length;
  const failedSteps = results.filter(r => !r.result.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.result.duration || 0), 0);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Execution Results
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {successfulSteps} successful, {failedSteps} failed • {totalDuration}ms total
            </p>
          </div>
        </div>

        {onRetryAll && failedSteps > 0 && (
          <button
            onClick={onRetryAll}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Failed</span>
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {results.map((execution, index) => (
          <div
            key={index}
            className={`border rounded-lg overflow-hidden ${
              execution.result.success
                ? 'border-green-200 dark:border-green-800'
                : 'border-red-200 dark:border-red-800'
            }`}
          >
            {/* Step Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${
              execution.result.success
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                {getStepIcon(execution.result)}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Step {execution.step}: {execution.description}
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={getStepStatusColor(execution.result)}>
                      {getStepStatus(execution.result)}
                    </span>
                    {execution.result.duration && (
                      <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{execution.result.duration}ms</span>
                      </span>
                    )}
                    {execution.result.statusCode && (
                      <span className={`font-mono ${getStatusCodeColor(execution.result.statusCode)}`}>
                        {execution.result.statusCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onRetryStep && !execution.result.success && (
                  <button
                    onClick={() => onRetryStep(execution.step)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Retry this step"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => toggleStepDetails(execution.step)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title={expandedSteps[execution.step] ? "Hide details" : "Show details"}
                >
                  {expandedSteps[execution.step] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Step Details */}
            {expandedSteps[execution.step] && (
              <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {/* Error Display */}
                {!execution.result.success && execution.result.error && (
                  <div className="mb-4">
                    <ErrorDisplay
                      error={execution.result.error}
                      title="Execution Error"
                    />
                  </div>
                )}

                {/* API Call Details */}
                {execution.apiCall && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">API Call</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Method</div>
                        <div className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {execution.apiCall.method}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">URL</div>
                        <div className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                          {execution.apiCall.url}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Response */}
                {execution.result.response && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Response</h4>
                      <button
                        onClick={() => copyResponse(execution.result.response, execution.step)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Copy response"
                      >
                        {copiedStep === execution.step ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(execution.result.response, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Dashboard Action */}
                {execution.dashboardAction && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dashboard Action</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                      {execution.dashboardAction}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Total Steps: {results.length}</span>
            <span>Successful: {successfulSteps}</span>
            <span>Failed: {failedSteps}</span>
            <span>Duration: {totalDuration}ms</span>
          </div>
          <div className="text-xs">
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
