/**
 * Simple in-memory rate limiter for server actions and API routes.
 * 
 * For production with multiple server instances, replace with Redis-based implementation.
 * 
 * @example
 * import { rateLimit, RateLimitError } from '@/lib/rateLimit';
 * 
 * const result = rateLimit('ai-suggest', userId, { maxRequests: 10, windowMs: 60000 });
 * if (!result.success) {
 *   return { error: `Rate limit exceeded. Try again in ${result.retryAfterSeconds}s` };
 * }
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitOptions {
    /** Maximum requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    retryAfterSeconds?: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (now > entry.resetTime) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    /** AI meal suggestion - 10 requests per minute */
    AI_SUGGEST: { maxRequests: 10, windowMs: 60 * 1000 },
    /** AI chatbot - 20 requests per minute */
    AI_CHAT: { maxRequests: 20, windowMs: 60 * 1000 },
    /** Email invites - 5 per minute */
    INVITE: { maxRequests: 5, windowMs: 60 * 1000 },
    /** General API - 60 requests per minute */
    GENERAL: { maxRequests: 60, windowMs: 60 * 1000 },
} as const;

/**
 * Check and apply rate limit for a given identifier.
 * 
 * @param namespace - Unique namespace for this rate limit (e.g., 'ai-suggest')
 * @param identifier - Unique identifier for the client (e.g., userId, IP)
 * @param options - Rate limit configuration
 * @returns Result object indicating if request is allowed
 */
export function rateLimit(
    namespace: string,
    identifier: string,
    options: RateLimitOptions
): RateLimitResult {
    const key = `${namespace}:${identifier}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    // No existing entry or window expired - create new entry
    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + options.windowMs,
        });
        return {
            success: true,
            remaining: options.maxRequests - 1,
        };
    }

    // Check if limit exceeded
    if (entry.count >= options.maxRequests) {
        const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
        return {
            success: false,
            remaining: 0,
            retryAfterSeconds,
        };
    }

    // Increment counter
    entry.count++;
    return {
        success: true,
        remaining: options.maxRequests - entry.count,
    };
}

/**
 * Get a rate limit key based on user ID or fallback to a default.
 * Use this to create consistent identifiers.
 */
export function getRateLimitKey(userId: string | null | undefined): string {
    return userId || 'anonymous';
}

/**
 * Reset rate limit for a specific key (useful for testing or admin actions).
 */
export function resetRateLimit(namespace: string, identifier: string): void {
    const key = `${namespace}:${identifier}`;
    rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing.
 */
export function getRateLimitStatus(
    namespace: string,
    identifier: string,
    options: RateLimitOptions
): { used: number; remaining: number; resetsIn: number } {
    const key = `${namespace}:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        return {
            used: 0,
            remaining: options.maxRequests,
            resetsIn: 0,
        };
    }

    return {
        used: entry.count,
        remaining: Math.max(0, options.maxRequests - entry.count),
        resetsIn: Math.ceil((entry.resetTime - now) / 1000),
    };
}
