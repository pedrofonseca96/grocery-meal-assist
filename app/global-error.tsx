'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * Global error boundary for the root layout.
 * This catches errors that occur in the root layout itself.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
    return (
        <html lang="en">
            <body className="bg-gray-50">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Error Icon */}
                        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                        </div>

                        {/* Error Message */}
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-gray-900">
                                Application Error
                            </h1>
                            <p className="text-gray-600">
                                A critical error occurred. Please refresh the page to continue.
                            </p>
                        </div>

                        {/* Error Details (development only) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="bg-gray-100 rounded-lg p-4 text-left">
                                <p className="text-xs font-mono text-gray-600 break-all">
                                    {error.message}
                                </p>
                                {error.digest && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        Error ID: {error.digest}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Retry Button */}
                        <button
                            onClick={reset}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Refresh Page
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
