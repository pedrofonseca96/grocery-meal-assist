'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Reusable ErrorBoundary component for wrapping specific parts of the UI.
 * Use this for granular error handling within components.
 * 
 * @example
 * <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to error monitoring service
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        This section encountered an error. Try refreshing.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <p className="text-xs font-mono text-gray-500 mb-4 break-all">
                            {this.state.error.message}
                        </p>
                    )}
                    <Button
                        size="sm"
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
