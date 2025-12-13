import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cookie name for caching household membership status.
 * This avoids DB queries on every request while maintaining security.
 */
const HOUSEHOLD_CACHE_COOKIE = 'household_status';
const HOUSEHOLD_CACHE_TTL_SECONDS = 300; // 5 minutes

interface HouseholdCache {
    hasHousehold: boolean;
    userId: string;
    timestamp: number;
}

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            db: {
                schema: 'api'
            },
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Public routes that don't need auth
    const publicPaths = ['/login', '/register', '/auth/callback'];
    const isPublicPath = publicPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    );

    // If not logged in and trying to access protected route
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // If logged in, check if user has a household (except on onboarding)
    if (user && !isPublicPath && request.nextUrl.pathname !== '/onboarding') {
        let hasHousehold = false;
        let shouldQueryDb = true;

        // Check for cached household status
        const cachedStatus = request.cookies.get(HOUSEHOLD_CACHE_COOKIE);
        if (cachedStatus?.value) {
            try {
                const cache: HouseholdCache = JSON.parse(cachedStatus.value);
                const now = Date.now();
                const age = (now - cache.timestamp) / 1000;

                // Validate cache: same user and not expired
                if (cache.userId === user.id && age < HOUSEHOLD_CACHE_TTL_SECONDS) {
                    hasHousehold = cache.hasHousehold;
                    shouldQueryDb = false;
                }
            } catch {
                // Invalid cache, will query DB
            }
        }

        // Query DB if cache miss or expired
        if (shouldQueryDb) {
            const { data: membership } = await supabase
                .from('household_members')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)
                .single();

            hasHousehold = !!membership;

            // Set cache cookie
            const cacheValue: HouseholdCache = {
                hasHousehold,
                userId: user.id,
                timestamp: Date.now(),
            };

            supabaseResponse.cookies.set(HOUSEHOLD_CACHE_COOKIE, JSON.stringify(cacheValue), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: HOUSEHOLD_CACHE_TTL_SECONDS,
                path: '/',
            });
        }

        // No household, redirect to onboarding
        if (!hasHousehold) {
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding';
            return NextResponse.redirect(url);
        }
    }

    // Clear household cache on logout (when hitting login page while logged out)
    if (!user && request.cookies.get(HOUSEHOLD_CACHE_COOKIE)) {
        supabaseResponse.cookies.delete(HOUSEHOLD_CACHE_COOKIE);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
