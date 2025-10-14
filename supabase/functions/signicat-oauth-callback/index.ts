import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('Received callback with code:', code ? 'present' : 'missing');

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('SIGNICAT_CLIENT_ID');
    const clientSecret = Deno.env.get('SIGNICAT_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Exchange code for tokens (using Signicat sandbox environment)
    const tokenResponse = await fetch('https://front-office.sandbox.signicat.com/auth/open/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${supabaseUrl}/functions/v1/signicat-oauth-callback`,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');

    // Get user info from Signicat (using Signicat sandbox environment)
    const userInfoResponse = await fetch('https://front-office.sandbox.signicat.com/auth/open/connect/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info received:', userInfo.sub);

    // Extract Swedish personal number (personnummer)
    const personalNumber = userInfo.sub || userInfo['signicat:national_id'];
    const email = userInfo.email || `${personalNumber}@bankid.temp`;
    const fullName = userInfo.name || '';

    let userId: string;

    // Try to create user - if they exist, we'll get an error and fetch them from profiles
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        personal_number: personalNumber,
        auth_provider: 'bankid',
      },
    });

    if (userError && userError.message?.includes('already been registered')) {
      // User exists. First try to find profile by email (fast path)
      console.log('User already exists, fetching from profiles by email');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile?.id) {
        userId = profile.id;
        console.log('Found existing user via profiles:', userId);
      } else {
        // Profile missing (likely older account without trigger). Fallback to admin list and match by email
        console.log('Profile not found, falling back to admin.listUsers to resolve user by email');
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error('Error listing users:', listError);
          throw new Error('Could not resolve existing user');
        }
        const existingUser = usersData?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        userId = existingUser.id;
        console.log('Resolved existing user via admin list:', userId);

        // Create missing profile idempotently so future lookups succeed
        const { error: upsertMissingProfileError } = await supabase
          .from('profiles')
          .upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' });
        if (upsertMissingProfileError) {
          console.warn('Non-fatal: failed to upsert missing profile:', upsertMissingProfileError);
        }
      }
    } else if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    } else {
      userId = userData.user.id;
      console.log('Created new user:', userId);
      // Ensure profile exists for new user (in case DB trigger is not present)
      const { error: upsertProfileError } = await supabase
        .from('profiles')
        .upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' });
      if (upsertProfileError) {
        console.warn('Non-fatal: failed to upsert profile for new user:', upsertProfileError);
      }
    }

    // Check if user is a platform admin
    const { data: adminCheck } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('Admin check result:', adminCheck ? 'User is admin' : 'User is not admin');

    // Build redirect target after successful session
    const invitationToken = url.searchParams.get('invitation_token');

    // If user is admin, redirect to /admin, otherwise to /
    const appUrl = url.origin.replace('functions/v1/signicat-oauth-callback', '');
    const redirectPath = adminCheck ? 'admin' : '';

    // Build redirect URL with query params (hash will be used by Supabase for tokens)
    const query = new URLSearchParams();
    if (redirectPath) query.set('redirect', redirectPath);
    if (invitationToken) query.set('invitation_token', invitationToken);
    const redirectTo = `${appUrl}/${query.toString() ? `?${query.toString()}` : ''}`;

    // Generate an action_link that will set the Supabase session, then redirect back to our app
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo }
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    const actionLink = sessionData?.properties?.action_link as string | undefined;
    if (!actionLink) {
      throw new Error('Could not create session action link');
    }

    console.log('Redirecting to action_link');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': actionLink,
      },
    });

  } catch (error) {
    console.error('Error in signicat-oauth-callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
