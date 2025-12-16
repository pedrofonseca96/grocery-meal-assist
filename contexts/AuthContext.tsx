"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
});

const LAST_ACTIVITY_KEY = 'last_activity_timestamp';
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const signOut = useCallback(async () => {
        const supabase = createClient();
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        await supabase.auth.signOut();
        // Force full page reload to clear all state
        window.location.href = '/login';
    }, []);

    // Update last activity timestamp
    const updateActivity = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
    }, []);

    // Check if session has timed out due to inactivity
    const isSessionTimedOut = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) return false; // No activity recorded, don't timeout
        const elapsed = Date.now() - parseInt(lastActivity, 10);
        return elapsed > SESSION_TIMEOUT_MS;
    }, []);

    useEffect(() => {
        const supabase = createClient();

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Initialize activity timestamp when session is loaded
            if (session?.user) {
                updateActivity();
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);

                // Initialize activity on sign in
                if (session?.user) {
                    updateActivity();
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [updateActivity]);

    // Track user activity
    useEffect(() => {
        if (!user || typeof window === 'undefined') return;

        const handleActivity = () => {
            updateActivity();
        };

        // Track user interactions (no mousemove - too aggressive)
        window.addEventListener('click', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [user, updateActivity]);

    // Periodically check for session timeout
    useEffect(() => {
        if (!user) return;

        const checkTimeout = () => {
            if (isSessionTimedOut()) {
                console.log('[Auth] Session timed out due to inactivity, signing out...');
                signOut();
            }
        };

        // Check every minute
        const intervalId = setInterval(checkTimeout, SESSION_CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [user, isSessionTimedOut, signOut]);

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
