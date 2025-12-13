'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error to monitoring service (Sentry, LogRocket, etc.)
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Error Icon */}
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Something went wrong
                    </h2>
                    <p className="text-gray-600">
                        We encountered an unexpected error. Please try again or return to the home page.
                    </p>
                </div>

                {/* Error Details (only in development) */}
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
