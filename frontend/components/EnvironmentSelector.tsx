'use client';

import { useState, useEffect } from 'react';
import { Settings, Check, AlertCircle } from 'lucide-react';
import { buildApiUrl } from '../lib/api';

interface Environment {
  name: string;
  displayName: string;
  description: string;
  apis: {
    [apiName: string]: {
      baseUrl: string;
      apiKey?: string;
      timeout: number;
      retries: number;
    };
  };
}

interface EnvironmentInfo {
  currentEnvironment: string;
  availableEnvironments: Environment[];
}

export default function EnvironmentSelector() {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEnvironmentInfo();
  }, []);

      const loadEnvironmentInfo = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/environment'));

      if (!response.ok) {
        console.error('❌ Response not ok:', response.status, response.statusText);
        throw new Error(`Failed to load environment info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setEnvironmentInfo(data);
      setError(null);
    } catch (err) {
      console.error('❌ Environment load error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load environment configuration: ${errorMessage}`);
    }
  };

    const switchEnvironment = async (environmentName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/environment/set'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ environment: environmentName }),
      });

      if (!response.ok) {
        console.error('❌ Switch response not ok:', response.status, response.statusText);
        throw new Error(`Failed to switch environment: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setEnvironmentInfo(data);
      setIsOpen(false);
    } catch (err) {
      console.error('❌ Environment switch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to switch environment: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!environmentInfo) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  const currentEnv = environmentInfo.availableEnvironments.find(
    env => env.name === environmentInfo.currentEnvironment
  );

  return (
    <div className="relative">
      {/* Environment Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {currentEnv?.displayName || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentEnv?.description || 'No description'}
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Select Environment
            </h3>

            {error && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {environmentInfo.availableEnvironments.map((env) => (
                <button
                  key={env.name}
                  onClick={() => switchEnvironment(env.name)}
                  disabled={isLoading || env.name === environmentInfo.currentEnvironment}
                  className={`w-full p-3 text-left rounded-lg border transition-all ${
                    env.name === environmentInfo.currentEnvironment
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {env.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {env.description}
                      </div>
                      {env.apis.paydock && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          API: {env.apis.paydock.baseUrl}
                        </div>
                      )}
                    </div>
                    {env.name === environmentInfo.currentEnvironment && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Current: <span className="font-medium">{currentEnv?.displayName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
