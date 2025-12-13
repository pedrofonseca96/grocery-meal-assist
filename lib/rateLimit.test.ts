import { describe, it, expect, beforeEach } from 'vitest';
import {
    rateLimit,
    getRateLimitKey,
    resetRateLimit,
    getRateLimitStatus,
    RATE_LIMITS
} from './rateLimit';

describe('rateLimit', () => {
    const testNamespace = 'test';
    const testUser = 'user-123';

    beforeEach(() => {
        // Reset rate limit before each test
        resetRateLimit(testNamespace, testUser);
    });

    it('should allow requests within limit', () => {
        const options = { maxRequests: 5, windowMs: 60000 };

        for (let i = 0; i < 5; i++) {
            const result = rateLimit(testNamespace, testUser, options);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(4 - i);
        }
    });

    it('should block requests exceeding limit', () => {
        const options = { maxRequests: 3, windowMs: 60000 };

        // Use up the limit
        rateLimit(testNamespace, testUser, options);
        rateLimit(testNamespace, testUser, options);
        rateLimit(testNamespace, testUser, options);

        // 4th request should be blocked
        const result = rateLimit(testNamespace, testUser, options);
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should track different users separately', () => {
        const options = { maxRequests: 2, windowMs: 60000 };

        // User 1 uses their limit
        rateLimit(testNamespace, 'user-1', options);
        rateLimit(testNamespace, 'user-1', options);
        const user1Result = rateLimit(testNamespace, 'user-1', options);
        expect(user1Result.success).toBe(false);

        // User 2 should still have their limit
        const user2Result = rateLimit(testNamespace, 'user-2', options);
        expect(user2Result.success).toBe(true);

        // Clean up
        resetRateLimit(testNamespace, 'user-1');
        resetRateLimit(testNamespace, 'user-2');
    });

    it('should track different namespaces separately', () => {
        const options = { maxRequests: 1, windowMs: 60000 };

        rateLimit('namespace-1', testUser, options);
        const ns1Result = rateLimit('namespace-1', testUser, options);
        expect(ns1Result.success).toBe(false);

        const ns2Result = rateLimit('namespace-2', testUser, options);
        expect(ns2Result.success).toBe(true);

        // Clean up
        resetRateLimit('namespace-1', testUser);
        resetRateLimit('namespace-2', testUser);
    });
});

describe('getRateLimitKey', () => {
    it('should return user ID when provided', () => {
        expect(getRateLimitKey('user-123')).toBe('user-123');
    });

    it('should return anonymous for null user', () => {
        expect(getRateLimitKey(null)).toBe('anonymous');
    });

    it('should return anonymous for undefined user', () => {
        expect(getRateLimitKey(undefined)).toBe('anonymous');
    });
});

describe('getRateLimitStatus', () => {
    const testNamespace = 'status-test';
    const testUser = 'status-user';

    beforeEach(() => {
        resetRateLimit(testNamespace, testUser);
    });

    it('should show correct status for unused limit', () => {
        const status = getRateLimitStatus(testNamespace, testUser, RATE_LIMITS.GENERAL);
        expect(status.used).toBe(0);
        expect(status.remaining).toBe(RATE_LIMITS.GENERAL.maxRequests);
    });

    it('should show correct status after requests', () => {
        rateLimit(testNamespace, testUser, RATE_LIMITS.GENERAL);
        rateLimit(testNamespace, testUser, RATE_LIMITS.GENERAL);

        const status = getRateLimitStatus(testNamespace, testUser, RATE_LIMITS.GENERAL);
        expect(status.used).toBe(2);
        expect(status.remaining).toBe(RATE_LIMITS.GENERAL.maxRequests - 2);
    });
});

describe('RATE_LIMITS constants', () => {
    it('should have AI_SUGGEST limit', () => {
        expect(RATE_LIMITS.AI_SUGGEST.maxRequests).toBe(10);
        expect(RATE_LIMITS.AI_SUGGEST.windowMs).toBe(60000);
    });

    it('should have AI_CHAT limit', () => {
        expect(RATE_LIMITS.AI_CHAT.maxRequests).toBe(20);
    });

    it('should have INVITE limit', () => {
        expect(RATE_LIMITS.INVITE.maxRequests).toBe(5);
    });
});
