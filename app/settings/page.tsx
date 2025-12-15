"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Settings, Home, Users, LogOut, Copy, Check, Plus, Loader2, Trash2, User, Save, X, Mail, UserMinus, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DIETARY_OPTIONS, CUISINE_OPTIONS } from '@/types';

interface HouseholdInfo {
    id: string;
    name: string;
    invite_code: string;
    role: string;
}

interface HouseholdMember {
    user_id: string;
    role: string;
    joined_at: string;
    email: string;
    display_name: string | null;
}

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const { household: currentHousehold, refreshHousehold } = useHousehold();
    const [households, setHouseholds] = useState<HouseholdInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const router = useRouter();

    // Preferences state
    const [displayName, setDisplayName] = useState('');
    const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
    const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [prefsSaved, setPrefsSaved] = useState(false);

    // Member management state
    const [manageHousehold, setManageHousehold] = useState<HouseholdInfo | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [sendingInvite, setSendingInvite] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            const supabase = createClient();

            // Fetch households
            const { data: memberships } = await supabase
                .from('household_members')
                .select('household_id, role')
                .eq('user_id', user.id);

            if (memberships && memberships.length > 0) {
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
            }

            // Fetch user preferences
            const { data: prefs } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (prefs) {
                setDisplayName(prefs.display_name || '');
                setDietaryRestrictions(prefs.dietary_restrictions || []);
                setPreferredCuisines(prefs.preferred_cuisines || []);
            }

            setLoading(false);
        };

        fetchData();
    }, [user]);

    // Fetch members when modal opens
    const openMemberManagement = async (household: HouseholdInfo) => {
        setManageHousehold(household);
        setLoadingMembers(true);
        setMembers([]);
        setInviteEmail('');
        setInviteSuccess(null);
        setInviteError(null);

        const supabase = createClient();

        // Get all members of this household
        const { data: memberData } = await supabase
            .from('household_members')
            .select('user_id, role, joined_at')
            .eq('household_id', household.id);

        if (memberData && memberData.length > 0) {
            // Get user details for each member
            const memberDetails: HouseholdMember[] = [];

            for (const m of memberData) {
                // Get email from auth.users via a lookup or preferences
                const { data: prefs } = await supabase
                    .from('user_preferences')
                    .select('display_name')
                    .eq('user_id', m.user_id)
                    .single();

                // We need to get email - for now use user_id as fallback
                // In a real app, you'd have a users table or use Supabase Admin API
                memberDetails.push({
                    user_id: m.user_id,
                    role: m.role,
                    joined_at: m.joined_at,
                    email: m.user_id === user?.id ? (user?.email ?? 'You') : `Member ${memberData.indexOf(m) + 1}`,
                    display_name: prefs?.display_name || null
                });
            }

            setMembers(memberDetails);
        }

        setLoadingMembers(false);
    };

    const closeMemberManagement = () => {
        setManageHousehold(null);
        setMembers([]);
        setInviteEmail('');
        setInviteSuccess(null);
        setInviteError(null);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!manageHousehold) return;

        const member = members.find(m => m.user_id === memberId);
        const displayText = member?.display_name || member?.email || 'this member';

        if (!confirm(`Remove ${displayText} from ${manageHousehold.name}?`)) {
            return;
        }

        const supabase = createClient();

        const { error } = await supabase
            .from('household_members')
            .delete()
            .eq('household_id', manageHousehold.id)
            .eq('user_id', memberId);

        if (error) {
            alert('Failed to remove member: ' + error.message);
            return;
        }

        setMembers(prev => prev.filter(m => m.user_id !== memberId));
    };

    const handleSendInvite = async () => {
        if (!manageHousehold || !inviteEmail.trim()) return;

        setSendingInvite(true);
        setInviteSuccess(null);
        setInviteError(null);

        try {
            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    householdId: manageHousehold.id,
                    householdName: manageHousehold.name,
                    inviterName: displayName || user?.email
                }),
            });

            const data = await response.json();

            if (data.success) {
                setInviteSuccess(`Invitation sent to ${inviteEmail}!`);
                setInviteEmail('');
            } else if (data.fallback) {
                // API returned fallback mode with invite code
                setInviteSuccess(`Share this invite code with ${inviteEmail}: ${data.inviteCode}`);
                setInviteEmail('');
            } else {
                setInviteError(data.error || 'Failed to send invitation');
            }
        } catch {
            setInviteError('Failed to send invitation. Please try again.');
        }

        setSendingInvite(false);
    };

    const savePreferences = async () => {
        if (!user) return;
        setSavingPrefs(true);
        setPrefsSaved(false);

        const supabase = createClient();

        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: user.id,
                display_name: displayName || null,
                dietary_restrictions: dietaryRestrictions,
                preferred_cuisines: preferredCuisines,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        setSavingPrefs(false);

        if (error) {
            alert('Failed to save preferences: ' + error.message);
        } else {
            setPrefsSaved(true);
            setTimeout(() => setPrefsSaved(false), 2000);
        }
    };

    const toggleDietary = (option: string) => {
        setDietaryRestrictions(prev =>
            prev.includes(option)
                ? prev.filter(d => d !== option)
                : [...prev, option]
        );
    };

    const toggleCuisine = (option: string) => {
        setPreferredCuisines(prev =>
            prev.includes(option)
                ? prev.filter(c => c !== option)
                : [...prev, option]
        );
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSignOut = async () => {
        await signOut();
        // Use full page navigation for proper cookie cleanup
        window.location.href = '/login';
    };

    const confirmDeleteHousehold = async () => {
        if (!deleteConfirm) return;

        setDeleting(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('households')
            .delete()
            .eq('id', deleteConfirm.id);

        setDeleting(false);

        if (error) {
            alert('Failed to delete household: ' + error.message);
            setDeleteConfirm(null);
            return;
        }

        setHouseholds(prev => prev.filter(h => h.id !== deleteConfirm.id));

        if (deleteConfirm.id === currentHousehold?.id) {
            refreshHousehold();
            // Use full page navigation to clear cached household status
            window.location.href = '/onboarding';
        }

        setDeleteConfirm(null);
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
            {/* Member Management Modal */}
            <Modal
                isOpen={!!manageHousehold}
                onClose={closeMemberManagement}
                title={`Manage: ${manageHousehold?.name || ''}`}
            >
                <div className="space-y-4">
                    {/* Members List */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Members
                        </h4>

                        {loadingMembers ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {member.display_name || member.email}
                                                    {member.user_id === user?.id && (
                                                        <span className="text-xs text-gray-400 ml-1">(you)</span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    {member.role === 'owner' && (
                                                        <Crown className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                    <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {member.role !== 'owner' && member.user_id !== user?.id && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Remove member"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Invite Section */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Invite by Email
                        </h4>

                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                            <Button
                                size="sm"
                                onClick={handleSendInvite}
                                disabled={sendingInvite || !inviteEmail.trim()}
                            >
                                {sendingInvite ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Mail className="w-4 h-4" />
                                )}
                            </Button>
                        </div>

                        {inviteSuccess && (
                            <p className="text-sm text-green-600 mt-2 bg-green-50 p-2 rounded">
                                {inviteSuccess}
                            </p>
                        )}
                        {inviteError && (
                            <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                                {inviteError}
                            </p>
                        )}

                        {/* Invite Code Fallback */}
                        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Or share this invite code:</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm font-mono bg-white px-2 py-1 rounded border flex-1">
                                    {manageHousehold?.invite_code}
                                </code>
                                <button
                                    onClick={() => manageHousehold && copyCode(manageHousehold.invite_code)}
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                >
                                    {copied === manageHousehold?.invite_code ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

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

            {/* Profile & Preferences */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold">Profile & Preferences</h2>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Dietary Restrictions */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                            Dietary Restrictions
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => toggleDietary(option)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${dietaryRestrictions.includes(option)
                                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {dietaryRestrictions.includes(option) && (
                                        <X className="w-3 h-3 inline mr-1" />
                                    )}
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Cuisines */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                            Preferred Cuisines
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CUISINE_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => toggleCuisine(option)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${preferredCuisines.includes(option)
                                        ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {preferredCuisines.includes(option) && (
                                        <Check className="w-3 h-3 inline mr-1" />
                                    )}
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Save Button */}
                    <Button
                        onClick={savePreferences}
                        disabled={savingPrefs}
                        className="w-full"
                    >
                        {savingPrefs ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : prefsSaved ? (
                            <Check className="w-4 h-4 mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {prefsSaved ? 'Saved!' : 'Save Preferences'}
                    </Button>
                </CardContent>
            </Card>

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
                            className={`transition-all hover:shadow-md cursor-pointer ${h.id === currentHousehold?.id ? 'ring-2 ring-orange-500' : ''}`}
                            onClick={() => h.role === 'owner' && openMemberManagement(h)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                        {h.name}
                                        {h.role === 'owner' && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                                Owner - Click to manage
                                            </span>
                                        )}
                                    </h3>
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
                                                setDeleteConfirm({ id: h.id, name: h.name });
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={confirmDeleteHousehold}
                title="Delete Household?"
                message={`This will permanently delete "${deleteConfirm?.name}" and remove all data (recipes, meals, groceries) for everyone. This cannot be undone.`}
                confirmText="Delete Household"
                confirmVariant="danger"
                isLoading={deleting}
            />
        </div>
    );
}
