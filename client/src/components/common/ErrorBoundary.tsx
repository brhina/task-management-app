import React, { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-app-bg">
          <div className="max-w-md w-full bg-app-panel shadow-lg rounded-lg p-6 border border-app-border">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-rose-500/15 rounded-full">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-slate-700">Something went wrong</h3>
              <p className="mt-2 text-sm text-slate-500">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              {import.meta.env.MODE === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-slate-500">Error details</summary>
                  <pre className="mt-2 text-xs text-rose-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={this.handleReset}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-slate-800 bg-primary hover:bg-emerald-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 w-full flex justify-center py-2 px-4 border border-app-border rounded-lg text-sm font-medium text-slate-600 bg-app-panel2 hover:bg-gray-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
