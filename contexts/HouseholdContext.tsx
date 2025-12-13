"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

interface Household {
    id: string;
    name: string;
    invite_code: string;
}

interface HouseholdContextType {
    household: Household | null;
    loading: boolean;
    isHouseholdSelected: boolean;
    refreshHousehold: () => Promise<void>;
    setActiveHousehold: (householdId: string) => Promise<void>;
    clearActiveHousehold: () => void;
}

const HouseholdContext = createContext<HouseholdContextType>({
    household: null,
    loading: true,
    isHouseholdSelected: false,
    refreshHousehold: async () => { },
    setActiveHousehold: async () => { },
    clearActiveHousehold: () => { },
});

const ACTIVE_HOUSEHOLD_KEY = 'active_household_id';
const SELECTION_TIMESTAMP_KEY = 'household_selection_timestamp';
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Check if the stored selection is still valid (within timeout)
const isSelectionValid = (): boolean => {
    if (typeof window === 'undefined') return false;
    const timestamp = localStorage.getItem(SELECTION_TIMESTAMP_KEY);
    if (!timestamp) return false;
    const elapsed = Date.now() - parseInt(timestamp, 10);
    return elapsed < SESSION_TIMEOUT_MS;
};

// Clear session data from localStorage
const clearSessionData = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SELECTION_TIMESTAMP_KEY);
};

export function HouseholdProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHouseholdSelected, setIsHouseholdSelected] = useState(false);

    const fetchHousehold = async (preferredId?: string, markAsSelected: boolean = false) => {
        // Wait for auth to finish loading before making decisions
        if (authLoading) {
            return;
        }

        if (!user) {
            setHousehold(null);
            setLoading(false);
            setIsHouseholdSelected(false);
            clearSessionData();
            return;
        }

        const supabase = createClient();

        // Get all user's household memberships
        const { data: memberships } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
            setHousehold(null);
            setLoading(false);
            setIsHouseholdSelected(false);
            clearSessionData();
            return;
        }

        // Check for saved preference or use the provided/first one
        const savedId = preferredId || localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
        const householdIds = memberships.map(m => m.household_id);
        const activeId = savedId && householdIds.includes(savedId) ? savedId : householdIds[0];

        // Get household details
        const { data: householdData } = await supabase
            .from('households')
            .select('*')
            .eq('id', activeId)
            .single();

        if (householdData) {
            setHousehold(householdData);
            localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdData.id);
        }

        // Check if we should auto-restore selection from a valid session
        // or if this is an explicit user action
        if (markAsSelected) {
            setIsHouseholdSelected(true);
            localStorage.setItem(SELECTION_TIMESTAMP_KEY, Date.now().toString());
        } else if (isSelectionValid()) {
            // Auto-restore: session is still valid from previous selection
            setIsHouseholdSelected(true);
            // Refresh the timestamp to extend the session
            localStorage.setItem(SELECTION_TIMESTAMP_KEY, Date.now().toString());
        } else {
            // Session expired or never existed
            setIsHouseholdSelected(false);
            clearSessionData();
        }

        setLoading(false);
    };

    const setActiveHousehold = async (householdId: string) => {
        localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
        localStorage.setItem(SELECTION_TIMESTAMP_KEY, Date.now().toString());
        await fetchHousehold(householdId, true); // Mark as selected
    };

    const clearActiveHousehold = () => {
        setIsHouseholdSelected(false);
        clearSessionData();
    };

    useEffect(() => {
        // Only fetch when auth loading is complete
        if (!authLoading) {
             
            fetchHousehold();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchHousehold is stable
    }, [user, authLoading]);

    return (
        <HouseholdContext.Provider value={{
            household,
            loading,
            isHouseholdSelected,
            refreshHousehold: fetchHousehold,
            setActiveHousehold,
            clearActiveHousehold
        }}>
            {children}
        </HouseholdContext.Provider>
    );
}

export const useHousehold = () => useContext(HouseholdContext);



