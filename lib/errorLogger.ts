/**
 * Centralized error logging utility.
 * 
 * This provides a single point for error logging that can be easily
 * extended to integrate with monitoring services (Sentry, LogRocket, etc.)
 * 
 * @example
 * import { logError, logWarning } from '@/lib/errorLogger';
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logError('RiskyOperation failed', error, { userId: '123' });
 * }
 */

type ErrorContext = Record<string, unknown>;

interface ErrorLogEntry {
    message: string;
    error: unknown;
    context?: ErrorContext;
    timestamp: string;
    environment: string;
}

/**
 * Logs an error with context. In production, this would send to a monitoring service.
 */
export function logError(
    message: string,
    error: unknown,
    context?: ErrorContext
): void {
    const entry: ErrorLogEntry = {
        message,
        error,
        context,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    };

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[ERROR] ${message}`, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            ...context,
        });
    } else {
        // In production, log to console (or send to monitoring service)
        console.error(`[ERROR] ${message}`, entry);
    }

    // TODO: Integrate with Sentry, LogRocket, or similar
    // Example:
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(error, { extra: context });
    // }
}

/**
 * Logs a warning (non-fatal issues that should be monitored).
 */
export function logWarning(
    message: string,
    context?: ErrorContext
): void {
    if (process.env.NODE_ENV === 'development') {
        console.warn(`[WARNING] ${message}`, context);
    } else {
        console.warn(`[WARNING] ${message}`, {
            context,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Logs an info message (for debugging and audit trails).
 */
export function logInfo(
    message: string,
    context?: ErrorContext
): void {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[INFO] ${message}`, context);
    }
    // In production, info logs are typically not sent to avoid noise
}

/**
 * Safely extracts an error message from an unknown error type.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
}

/**
 * Creates a user-friendly error message while logging the technical details.
 */
export function handleError(
    technicalMessage: string,
    error: unknown,
    userFriendlyMessage: string,
    context?: ErrorContext
): string {
    logError(technicalMessage, error, context);
    return userFriendlyMessage;
}
