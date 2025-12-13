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

export function HouseholdProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHouseholdSelected, setIsHouseholdSelected] = useState(false);

    const fetchHousehold = async (preferredId?: string, markAsSelected: boolean = false) => {
        if (!user) {
            setHousehold(null);
            setLoading(false);
            setIsHouseholdSelected(false);
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

        // Only mark as selected if explicitly requested (user action)
        if (markAsSelected) {
            setIsHouseholdSelected(true);
        }

        setLoading(false);
    };

    const setActiveHousehold = async (householdId: string) => {
        localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
        await fetchHousehold(householdId, true); // Mark as selected
    };

    const clearActiveHousehold = () => {
        setIsHouseholdSelected(false);
    };

    useEffect(() => {
        fetchHousehold(); // Initial load does NOT mark as selected
    }, [user]);

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

