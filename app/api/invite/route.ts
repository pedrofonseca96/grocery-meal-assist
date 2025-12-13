import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email, householdId, householdName, inviterName } = await request.json();

        if (!email || !householdId) {
            return NextResponse.json(
                { error: 'Email and householdId are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get the current user (inviter)
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify the user is an owner of this household
        const { data: membership } = await supabase
            .from('household_members')
            .select('role')
            .eq('household_id', householdId)
            .eq('user_id', user.id)
            .single();

        if (!membership || membership.role !== 'owner') {
            return NextResponse.json(
                { error: 'Only household owners can send invites' },
                { status: 403 }
            );
        }

        // Check if this email is already a registered user
        // We need to use the service role key for admin operations
        // For now, we'll create a pending invite that can be claimed

        // Get the household invite code
        const { data: household } = await supabase
            .from('households')
            .select('invite_code')
            .eq('id', householdId)
            .single();

        if (!household) {
            return NextResponse.json(
                { error: 'Household not found' },
                { status: 404 }
            );
        }

        // Store the invite in a pending invites table (optional - for tracking)
        // For now, we'll just send the email via Supabase Auth magic link
        // The user can then join using the invite code after registering

        // Use Supabase Auth to send a magic link / signup link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUrl = `${appUrl}/onboarding?invite_code=${household.invite_code}`;

        // Send magic link email (this works for both new and existing users)
        const { error: inviteError } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    invited_to_household: householdId,
                    invited_by: inviterName || user.email,
                    household_name: householdName
                }
            }
        });

        if (inviteError) {
            console.error('Invite error:', inviteError);
            return NextResponse.json(
                {
                    error: 'Could not send invite email',
                    fallback: true,
                    inviteCode: household.invite_code
                },
                { status: 200 } // Still return 200 so we can show the fallback
            );
        }

        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${email}`
        });

    } catch (error) {
        console.error('Invite API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
