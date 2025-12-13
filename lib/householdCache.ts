/**
 * Client-side utility to invalidate the household status cache.
 * 
 * Call this when household membership changes on the client side:
 * - After leaving a household
 * - After deleting a household
 * 
 * Note: Creating or joining a household already triggers a page reload,
 * which causes the middleware to query the DB fresh and update the cache.
 * 
 * @example
 * import { invalidateHouseholdCache } from '@/lib/householdCache';
 * 
 * await deleteHousehold(id);
 * invalidateHouseholdCache();
 * router.push('/onboarding');
 */

const HOUSEHOLD_CACHE_COOKIE = 'household_status';

/**
 * Clears the household status cache cookie.
 * The next request will trigger a fresh DB query in the middleware.
 */
export function invalidateHouseholdCache(): void {
    // Delete the cookie by setting it with an expired date
    document.cookie = `${HOUSEHOLD_CACHE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Force a fresh household check by invalidating cache and reloading.
 * Use this after significant household membership changes.
 */
export function refreshHouseholdStatus(): void {
    invalidateHouseholdCache();
    // Use window.location to force a full page reload
    window.location.reload();
}
