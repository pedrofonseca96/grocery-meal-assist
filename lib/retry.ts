/**
 * Retry utility with exponential backoff for external API calls.
 * 
 * Use this for resilient handling of transient failures in external services.
 * 
 * @example
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 */

import { logWarning, logError } from './errorLogger';

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in ms before first retry, doubles each attempt (default: 1000) */
    baseDelayMs?: number;
    /** Maximum delay in ms (default: 10000) */
    maxDelayMs?: number;
    /** Only retry on these error types/codes (default: all errors) */
    retryOn?: (error: unknown) => boolean;
    /** Context for logging */
    context?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryOn' | 'context'>> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

/**
 * Determines if an error is retryable (transient network/server errors).
 */
export function isRetryableError(error: unknown): boolean {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
    }

    // API rate limiting or server errors
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
            message.includes('rate limit') ||
            message.includes('429') ||
            message.includes('503') ||
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnreset') ||
            message.includes('socket')
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = exponentialDelay + jitter;
    return Math.min(delay, maxDelay);
}

/**
 * Execute an async function with automatic retry on failure.
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = DEFAULT_OPTIONS.maxRetries,
        baseDelayMs = DEFAULT_OPTIONS.baseDelayMs,
        maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
        retryOn = isRetryableError,
        context = 'operation',
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt >= maxRetries || !retryOn(error)) {
                break;
            }

            const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs);

            logWarning(`Retrying ${context} after error`, {
                attempt: attempt + 1,
                maxRetries,
                delayMs: Math.round(delay),
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            await sleep(delay);
        }
    }

    logError(`${context} failed after ${maxRetries} retries`, lastError, { maxRetries });
    throw lastError;
}

/**
 * Wrap a function to make it retry automatically.
 */
export function makeRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: RetryOptions = {}
): T {
    return ((...args: unknown[]) => withRetry(() => fn(...args), options)) as T;
}
