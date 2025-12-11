"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Home, Users, Loader2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingPage() {
    const { user, loading: authLoading } = useAuth();
    const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
    const [householdName, setHouseholdName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleCreateHousehold = async () => {
        if (!householdName.trim()) return;
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Create household
        const { data: household, error: createError } = await supabase
            .from('households')
            .insert({ name: householdName.trim() })
            .select()
            .single();

        if (createError) {
            setError(createError.message);
            setLoading(false);
            return;
        }

        // Add user as owner
        const { error: memberError } = await supabase
            .from('household_members')
            .insert({
                household_id: household.id,
                user_id: user!.id,
                role: 'owner'
            });

        if (memberError) {
            setError(memberError.message);
            setLoading(false);
            return;
        }

        setCreatedCode(household.invite_code);
        setLoading(false);
    };

    const handleJoinHousehold = async () => {
        if (!inviteCode.trim()) return;
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Find household by invite code
        const { data: household, error: findError } = await supabase
            .from('households')
            .select('id, name')
            .eq('invite_code', inviteCode.trim().toLowerCase())
            .single();

        if (findError || !household) {
            setError('Invalid invite code. Please check and try again.');
            setLoading(false);
            return;
        }

        // Add user as member
        const { error: memberError } = await supabase
            .from('household_members')
            .insert({
                household_id: household.id,
                user_id: user!.id,
                role: 'member'
            });

        if (memberError) {
            if (memberError.code === '23505') {
                setError('You are already a member of this household.');
            } else {
                setError(memberError.message);
            }
            setLoading(false);
            return;
        }

        router.push('/');
    };

    const copyCode = () => {
        if (createdCode) {
            navigator.clipboard.writeText(createdCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Success state after creating household
    if (createdCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-8 pb-6 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Home className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Household Created!</h1>
                        <p className="text-gray-500 text-sm mt-2 mb-6">
                            Share this code with family members so they can join:
                        </p>

                        <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg p-4 mb-6">
                            <code className="text-2xl font-mono font-bold text-orange-600 tracking-wider">
                                {createdCode}
                            </code>
                            <button
                                onClick={copyCode}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-500" />}
                            </button>
                        </div>

                        <Button className="w-full" onClick={() => {
                            window.location.href = '/';
                        }}>
                            Start Using the App
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 p-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-8 pb-6">
                    {mode === 'choose' && (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800">Set Up Your Household</h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    Households let you share meal plans with family
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    className="w-full h-16 text-left justify-start gap-4"
                                    variant="outline"
                                    onClick={() => setMode('create')}
                                >
                                    <Home className="w-6 h-6 text-orange-500" />
                                    <div>
                                        <p className="font-semibold">Create a Household</p>
                                        <p className="text-xs text-gray-500 font-normal">Start fresh and invite others</p>
                                    </div>
                                </Button>

                                <Button
                                    className="w-full h-16 text-left justify-start gap-4"
                                    variant="outline"
                                    onClick={() => setMode('join')}
                                >
                                    <Users className="w-6 h-6 text-blue-500" />
                                    <div>
                                        <p className="font-semibold">Join a Household</p>
                                        <p className="text-xs text-gray-500 font-normal">I have an invite code</p>
                                    </div>
                                </Button>
                            </div>
                        </>
                    )}

                    {mode === 'create' && (
                        <>
                            <button
                                onClick={() => setMode('choose')}
                                className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                            >
                                ← Back
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Name Your Household</h2>

                            <input
                                type="text"
                                value={householdName}
                                onChange={(e) => setHouseholdName(e.target.value)}
                                placeholder="e.g., The Smiths, Our Home"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
                                autoFocus
                            />

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                                    {error}
                                </div>
                            )}

                            <Button
                                className="w-full"
                                onClick={handleCreateHousehold}
                                disabled={loading || !householdName.trim()}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Household
                            </Button>
                        </>
                    )}

                    {mode === 'join' && (
                        <>
                            <button
                                onClick={() => setMode('choose')}
                                className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                            >
                                ← Back
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Enter Invite Code</h2>

                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="e.g., abc123xy"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4 font-mono text-center text-lg tracking-wider"
                                autoFocus
                            />

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                                    {error}
                                </div>
                            )}

                            <Button
                                className="w-full"
                                onClick={handleJoinHousehold}
                                disabled={loading || !inviteCode.trim()}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Join Household
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
