import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError } from './retry';

describe('withRetry', () => {
    it('should return result on first success', async () => {
        const fn = vi.fn().mockResolvedValue('success');

        const result = await withRetry(fn, { maxRetries: 3 });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('rate limit'))
            .mockResolvedValueOnce('success');

        const result = await withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 10, // Fast for testing
            retryOn: () => true
        });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('always fails'));

        await expect(
            withRetry(fn, {
                maxRetries: 2,
                baseDelayMs: 10,
                retryOn: () => true
            })
        ).rejects.toThrow('always fails');

        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry if retryOn returns false', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

        await expect(
            withRetry(fn, {
                maxRetries: 3,
                retryOn: () => false
            })
        ).rejects.toThrow('non-retryable');

        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('isRetryableError', () => {
    it('should return true for rate limit errors', () => {
        const error = new Error('Rate limit exceeded');
        expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 429 errors', () => {
        const error = new Error('HTTP 429: Too Many Requests');
        expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 errors', () => {
        const error = new Error('HTTP 503: Service Unavailable');
        expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for timeout errors', () => {
        const error = new Error('Request timeout');
        expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
        const error = new Error('Network error occurred');
        expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
        const error = new Error('Invalid input');
        expect(isRetryableError(error)).toBe(false);
    });
});
