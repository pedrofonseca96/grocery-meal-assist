"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Loader2 } from 'lucide-react';

interface HouseholdGuardProps {
    children: React.ReactNode;
}

export function HouseholdGuard({ children }: HouseholdGuardProps) {
    const { isHouseholdSelected, loading } = useHousehold();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isHouseholdSelected) {
            router.replace('/');
        }
    }, [loading, isHouseholdSelected, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!isHouseholdSelected) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
