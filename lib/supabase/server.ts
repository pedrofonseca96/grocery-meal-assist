import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logWarning } from '@/lib/errorLogger';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            db: {
                schema: 'api'
            },
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // This can fail in Server Components where cookies are read-only
                        // Log but don't throw - this is expected behavior
                        logWarning('Could not set cookies in Server Component', {
                            cookieCount: cookiesToSet.length
                        });
                    }
                },
            },
        }
    );
}
