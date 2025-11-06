'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SavedTestResult {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  environment: string;
  testSteps: any[];
  executionResults: any[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
}

interface ResultComparisonProps {
  results: SavedTestResult[];
  onClose: () => void;
}

export default function ResultComparison({ results, onClose }: ResultComparisonProps) {
  const [selectedResults, setSelectedResults] = useState<string[]>([]);

  const handleResultSelect = (resultId: string) => {
    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        return prev.filter(id => id !== resultId);
      } else {
        return [...prev, resultId];
      }
    });
  };

  const selectedResultsData = results.filter(r => selectedResults.includes(r.id));

  const getSuccessRate = (result: SavedTestResult) => {
    return (result.summary.successfulSteps / result.summary.totalSteps) * 100;
  };

  const getAverageDuration = (result: SavedTestResult) => {
    return result.summary.totalDuration / result.summary.totalSteps;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          No results available for comparison
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Result Comparison
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare test results side by side
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Close
        </button>
      </div>

      {/* Result Selection */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Select Results to Compare</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((result) => (
            <div
              key={result.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedResults.includes(result.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleResultSelect(result.id)}
            >
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={selectedResults.includes(result.id)}
                  onChange={() => handleResultSelect(result.id)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.name}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {result.timestamp.toLocaleDateString()} • {result.environment}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      {selectedResultsData.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Comparison Results</h4>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Metric</th>
                  {selectedResultsData.map((result) => (
                    <th key={result.id} className="text-left py-2 font-medium text-gray-900 dark:text-white">
                      {result.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Success Rate */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Success Rate</td>
                  {selectedResultsData.map((result, index) => {
                    const successRate = getSuccessRate(result);
                    const previousRate = index > 0 ? getSuccessRate(selectedResultsData[index - 1]) : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono ${
                            successRate === 100 ? 'text-green-600 dark:text-green-400' :
                            successRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {successRate.toFixed(1)}%
                          </span>
                          {previousRate !== null && getTrendIcon(successRate, previousRate)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Total Steps */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Total Steps</td>
                  {selectedResultsData.map((result, index) => {
                    const previousSteps = index > 0 ? selectedResultsData[index - 1].summary.totalSteps : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{result.summary.totalSteps}</span>
                          {previousSteps !== null && getTrendIcon(result.summary.totalSteps, previousSteps)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Successful Steps */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Successful Steps</td>
                  {selectedResultsData.map((result, index) => {
                    const previousSuccess = index > 0 ? selectedResultsData[index - 1].summary.successfulSteps : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-green-600 dark:text-green-400">
                            {result.summary.successfulSteps}
                          </span>
                          {previousSuccess !== null && getTrendIcon(result.summary.successfulSteps, previousSuccess)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Failed Steps */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Failed Steps</td>
                  {selectedResultsData.map((result, index) => {
                    const previousFailed = index > 0 ? selectedResultsData[index - 1].summary.failedSteps : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-red-600 dark:text-red-400">
                            {result.summary.failedSteps}
                          </span>
                          {previousFailed !== null && getTrendIcon(result.summary.failedSteps, previousFailed)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Total Duration */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Total Duration</td>
                  {selectedResultsData.map((result, index) => {
                    const previousDuration = index > 0 ? selectedResultsData[index - 1].summary.totalDuration : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{result.summary.totalDuration}ms</span>
                          {previousDuration !== null && getTrendIcon(result.summary.totalDuration, previousDuration)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Average Duration */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Avg Duration/Step</td>
                  {selectedResultsData.map((result, index) => {
                    const avgDuration = getAverageDuration(result);
                    const previousAvg = index > 0 ? getAverageDuration(selectedResultsData[index - 1]) : null;

                    return (
                      <td key={result.id} className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{avgDuration.toFixed(0)}ms</span>
                          {previousAvg !== null && getTrendIcon(avgDuration, previousAvg)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Environment */}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Environment</td>
                  {selectedResultsData.map((result) => (
                    <td key={result.id} className="py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {result.environment}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Date */}
                <tr>
                  <td className="py-3 font-medium text-gray-700 dark:text-gray-300">Date</td>
                  {selectedResultsData.map((result) => (
                    <td key={result.id} className="py-3 text-gray-500 dark:text-gray-400">
                      {result.timestamp.toLocaleDateString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Insights */}
          {selectedResultsData.length > 1 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Key Insights</h5>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(() => {
                  const first = selectedResultsData[0];
                  const last = selectedResultsData[selectedResultsData.length - 1];
                  const successRateChange = getSuccessRate(last) - getSuccessRate(first);
                  const durationChange = last.summary.totalDuration - first.summary.totalDuration;

                  return (
                    <>
                      {successRateChange !== 0 && (
                        <div className="flex items-center space-x-2">
                          {successRateChange > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span>
                            Success rate {successRateChange > 0 ? 'improved' : 'decreased'} by {Math.abs(successRateChange).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {durationChange !== 0 && (
                        <div className="flex items-center space-x-2">
                          {durationChange < 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span>
                            Total duration {durationChange < 0 ? 'decreased' : 'increased'} by {Math.abs(durationChange)}ms
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
