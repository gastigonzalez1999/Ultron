import React, { useState } from 'react';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  onDismiss?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack;
  return undefined;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, title, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message + (stack ? '\n' + stack : ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="bg-red-100 border border-red-400 text-red-800 rounded p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">{title || 'Error'}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-red-200 hover:bg-red-300 rounded"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-2 py-1 text-xs bg-red-200 hover:bg-red-300 rounded"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-all text-sm">{message}</pre>
      {stack && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-700">Stack trace</summary>
          <pre className="whitespace-pre-wrap break-all text-xs mt-1">{stack}</pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;
