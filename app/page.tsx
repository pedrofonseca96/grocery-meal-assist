"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Home, Users, Copy, Check, Plus, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HouseholdInfo {
  id: string;
  name: string;
  invite_code: string;
  role: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const { household: currentHousehold, refreshHousehold, setActiveHousehold, isHouseholdSelected } = useHousehold();
  const [households, setHouseholds] = useState<HouseholdInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!user) return;

      const supabase = createClient();

      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

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

  const handleEnterHousehold = async (householdId: string) => {
    await setActiveHousehold(householdId);
    router.push('/planner');
  };

  const handleDeleteHousehold = async (householdId: string, householdName: string) => {
    if (!confirm(`Delete "${householdName}"? This will remove all data for everyone. This cannot be undone.`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', householdId);

    if (error) {
      alert('Failed to delete: ' + error.message);
      return;
    }

    setHouseholds(prev => prev.filter(h => h.id !== householdId));

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Households</h1>
            <p className="text-sm text-gray-500">Select a household to get started</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/onboarding')}
        >
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {/* All Households */}
      <div className="space-y-3">
        {households.map((h) => {
          const isActive = h.id === currentHousehold?.id && isHouseholdSelected;

          return (
            <Card
              key={h.id}
              className={`transition-all ${isActive ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-red-50' : 'hover:shadow-md hover:border-orange-200'}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <Users className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{h.name}</h3>
                      <span className="text-xs text-gray-500 capitalize">{h.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Invite code copy */}
                    <div className="hidden sm:flex items-center gap-1 mr-2">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {h.invite_code}
                      </code>
                      <button
                        onClick={() => copyCode(h.invite_code)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copy invite code"
                      >
                        {copied === h.invite_code ?
                          <Check className="w-4 h-4 text-green-600" /> :
                          <Copy className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                    </div>

                    {/* Delete button for owners */}
                    {h.role === 'owner' && (
                      <button
                        onClick={() => handleDeleteHousehold(h.id, h.name)}
                        className="p-2 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                        title="Delete household"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Enter button */}
                    <Button
                      size="sm"
                      onClick={() => handleEnterHousehold(h.id)}
                      className="gap-1"
                    >
                      Enter
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {households.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No households yet</p>
            <Button className="mt-4" onClick={() => router.push('/onboarding')}>
              Create Your First Household
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

