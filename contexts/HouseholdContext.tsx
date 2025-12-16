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
    const { user, loading: authLoading } = useAuth();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHouseholdSelected, setIsHouseholdSelected] = useState(false);

    const fetchHousehold = async (preferredId?: string, markAsSelected: boolean = false) => {
        if (authLoading) {
            return;
        }

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

            // Auto-select if explicit action or if household was previously saved
            if (markAsSelected || savedId) {
                setIsHouseholdSelected(true);
            }
        }

        setLoading(false);
    };

    const setActiveHousehold = async (householdId: string) => {
        localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
        await fetchHousehold(householdId, true);
    };

    const clearActiveHousehold = () => {
        setIsHouseholdSelected(false);
        localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
    };

    useEffect(() => {
        if (!authLoading) {
            fetchHousehold();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    return (
        <HouseholdContext.Provider value={{
            household,
            loading,
            isHouseholdSelected,
            refreshHousehold: fetchHousehold,
            setActiveHousehold,
            clearActiveHousehold,
        }}>
            {children}
        </HouseholdContext.Provider>
    );
}

export const useHousehold = () => useContext(HouseholdContext);
