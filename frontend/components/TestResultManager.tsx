'use client';

import { useState, useEffect } from 'react';
import { Save, Download, History, Share2, Trash2, Eye, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

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

interface SavedTestResult {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  environment: string;
  testSteps: any[];
  executionResults: TestStepExecution[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
}

interface TestResultManagerProps {
  currentTestSteps: any[];
  currentResults: TestStepExecution[];
  currentEnvironment: string;
  onLoadResult: (result: SavedTestResult) => void;
}

export default function TestResultManager({
  currentTestSteps,
  currentResults,
  currentEnvironment,
  onLoadResult
}: TestResultManagerProps) {
  const [savedResults, setSavedResults] = useState<SavedTestResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSavedResults();
  }, []);

  const loadSavedResults = () => {
    try {
      const saved = localStorage.getItem('ultron-test-results');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
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

  const saveCurrentResult = () => {
    if (currentResults.length === 0) return;

    const name = prompt('Enter a name for this test result:');
    if (!name) return;

    const description = prompt('Enter a description (optional):') || '';

    const successfulSteps = currentResults.filter(r => r.result.success).length;
    const failedSteps = currentResults.filter(r => !r.result.success).length;
    const totalDuration = currentResults.reduce((sum, r) => sum + (r.result.duration || 0), 0);

    const newResult: SavedTestResult = {
      id: Date.now().toString(),
      name,
      description,
      timestamp: new Date(),
      environment: currentEnvironment,
      testSteps: currentTestSteps,
      executionResults: currentResults,
      summary: {
        totalSteps: currentResults.length,
        successfulSteps,
        failedSteps,
        totalDuration,
      }
    };

    const updatedResults = [newResult, ...savedResults];
    setSavedResults(updatedResults);

    try {
      localStorage.setItem('ultron-test-results', JSON.stringify(updatedResults));
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  const deleteResult = (id: string) => {
    if (!confirm('Are you sure you want to delete this test result?')) return;

    const updatedResults = savedResults.filter(r => r.id !== id);
    setSavedResults(updatedResults);

    try {
      localStorage.setItem('ultron-test-results', JSON.stringify(updatedResults));
    } catch (error) {
      console.error('Error deleting result:', error);
    }
  };

  const exportResult = (result: SavedTestResult) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-result-${result.name}-${result.timestamp.toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedResults = () => {
    if (selectedResults.length === 0) return;

    const resultsToExport = savedResults.filter(r => selectedResults.includes(r.id));
    const dataStr = JSON.stringify(resultsToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareResult = (result: SavedTestResult) => {
    const shareData = {
      title: `Test Result: ${result.name}`,
      text: `${result.name} - ${result.summary.successfulSteps}/${result.summary.totalSteps} successful`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const summary = `Test Result: ${result.name}
Description: ${result.description}
Environment: ${result.environment}
Date: ${result.timestamp.toLocaleString()}
Results: ${result.summary.successfulSteps}/${result.summary.totalSteps} successful
Duration: ${result.summary.totalDuration}ms`;

      navigator.clipboard.writeText(summary);
      alert('Result summary copied to clipboard!');
    }
  };

  const filteredResults = savedResults.filter(result =>
    result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.environment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Results Manager
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Save, load, and export your test results
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentResults.length > 0 && (
            <button
              onClick={saveCurrentResult}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Current</span>
            </button>
          )}

          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <History className="w-4 h-4" />
            <span>{isHistoryOpen ? 'Hide' : 'Show'} History</span>
          </button>
        </div>
      </div>

      {/* History Section */}
      {isHistoryOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Search and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {selectedResults.length > 0 && (
              <button
                onClick={exportSelectedResults}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Selected ({selectedResults.length})</span>
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No results found' : 'No saved test results yet'}
              </div>
            ) : (
              filteredResults.map((result) => (
                <div
                  key={result.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedResults.includes(result.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedResults.includes(result.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResults(prev => [...prev, result.id]);
                            } else {
                              setSelectedResults(prev => prev.filter(id => id !== result.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {result.name}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {result.environment}
                        </span>
                      </div>

                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {result.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{result.timestamp.toLocaleDateString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{result.timestamp.toLocaleTimeString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          {result.summary.successfulSteps === result.summary.totalSteps ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span>
                            {result.summary.successfulSteps}/{result.summary.totalSteps} successful
                          </span>
                        </span>
                        <span>{result.summary.totalDuration}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onLoadResult(result)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Load this result"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => exportResult(result)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Export as JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => shareResult(result)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Share result"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteResult(result.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete result"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
