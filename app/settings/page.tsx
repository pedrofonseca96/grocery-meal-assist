"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Settings, Home, Users, LogOut, Copy, Check, Plus, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HouseholdInfo {
    id: string;
    name: string;
    invite_code: string;
    role: string;
}

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const { household: currentHousehold, refreshHousehold } = useHousehold();
    const [households, setHouseholds] = useState<HouseholdInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchHouseholds = async () => {
            if (!user) return;

            const supabase = createClient();

            // Get all households user belongs to
            const { data: memberships } = await supabase
                .from('household_members')
                .select('household_id, role')
                .eq('user_id', user.id);

            if (!memberships || memberships.length === 0) {
                setLoading(false);
                return;
            }

            // Get household details
            const householdIds = memberships.map(m => m.household_id);
            const { data: householdsData } = await supabase
                .from('households')
                .select('*')
                .in('id', householdIds);

            if (householdsData) {
                setHouseholds(householdsData.map(h => ({
                    ...h,
                    role: memberships.find(m => m.household_id === h.id)?.role || 'member'
                })));
            }

            setLoading(false);
        };

        fetchHouseholds();
    }, [user]);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const handleDeleteHousehold = async (householdId: string, householdName: string) => {
        if (!confirm(`Delete "${householdName}"? This will remove all data (recipes, meals, groceries) for everyone in this household. This cannot be undone.`)) {
            return;
        }

        const supabase = createClient();

        // Delete the household (cascade will handle members and related data)
        const { error } = await supabase
            .from('households')
            .delete()
            .eq('id', householdId);

        if (error) {
            alert('Failed to delete household: ' + error.message);
            return;
        }

        // Remove from local state
        setHouseholds(prev => prev.filter(h => h.id !== householdId));

        // If deleted current household, refresh
        if (householdId === currentHousehold?.id) {
            refreshHousehold();
            router.push('/onboarding');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
            </div>

            {/* Current Household */}
            {currentHousehold && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Home className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-600 font-medium">Active Household</span>
                        </div>
                        <h3 className="text-lg font-semibold">{currentHousehold.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Invite Code:</span>
                            <code className="text-sm font-mono bg-white px-2 py-0.5 rounded">
                                {currentHousehold.invite_code}
                            </code>
                            <button
                                onClick={() => copyCode(currentHousehold.invite_code)}
                                className="p-1 hover:bg-orange-100 rounded"
                            >
                                {copied === currentHousehold.invite_code ?
                                    <Check className="w-4 h-4 text-green-600" /> :
                                    <Copy className="w-4 h-4 text-gray-400" />
                                }
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All Households */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        Your Households
                    </h2>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/onboarding')}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Join/Create
                    </Button>
                </div>

                <div className="space-y-2">
                    {households.map((h) => (
                        <Card
                            key={h.id}
                            className={`transition-all hover:shadow-md ${h.id === currentHousehold?.id ? 'ring-2 ring-orange-500' : ''
                                }`}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{h.name}</h3>
                                    <span className="text-xs text-gray-500 capitalize">{h.role}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                        {h.invite_code}
                                    </code>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyCode(h.invite_code);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                        {copied === h.invite_code ?
                                            <Check className="w-4 h-4 text-green-600" /> :
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        }
                                    </button>
                                    {h.role === 'owner' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHousehold(h.id, h.name);
                                            }}
                                            className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                                            title="Delete household"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {households.length === 0 && (
                        <p className="text-center text-gray-400 py-8">
                            No households yet. Create or join one!
                        </p>
                    )}
                </div>
            </div>

            {/* Sign Out */}
            <div className="pt-4 border-t">
                <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
