import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      throw new Error('Token and userId are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) {
      console.error('Error fetching invitation:', inviteError);
      throw new Error('Invalid invitation');
    }

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      throw new Error('Invitation already used');
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('clinic_users')
      .select('id')
      .eq('clinic_id', invitation.clinic_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted even though user was already a member
      await supabaseClient
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyMember: true,
          clinicId: invitation.clinic_id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Add user to clinic
    const { error: addError } = await supabaseClient
      .from('clinic_users')
      .insert({
        clinic_id: invitation.clinic_id,
        user_id: userId,
        role: invitation.role,
      });

    if (addError) {
      console.error('Error adding user to clinic:', addError);
      throw new Error('Failed to add user to clinic');
    }

    // Get the clinic_user_id for permissions
    const { data: clinicUser } = await supabaseClient
      .from('clinic_users')
      .select('id')
      .eq('clinic_id', invitation.clinic_id)
      .eq('user_id', userId)
      .single();

    // If staff role and permissions are set, create permissions record
    if (invitation.role === 'staff' && invitation.permissions && clinicUser) {
      const { error: permError } = await supabaseClient
        .from('team_member_permissions')
        .insert({
          clinic_user_id: clinicUser.id,
          ...invitation.permissions,
        });

      if (permError) {
        console.error('Error setting permissions:', permError);
        // Don't throw - permissions can be set later
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseClient
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }

    console.log('User successfully added to clinic:', invitation.clinic_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        clinicId: invitation.clinic_id,
        role: invitation.role,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in accept-team-invitation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
