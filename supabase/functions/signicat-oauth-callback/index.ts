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

    // Create or get user in Supabase
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        personal_number: personalNumber,
        auth_provider: 'bankid',
      },
    });

    if (userError && !userError.message.includes('already registered')) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    // Get the user ID
    const userId = userData?.user?.id || (await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()).data?.id;

    if (!userId) {
      throw new Error('Could not find or create user');
    }

    // Check if user is a platform admin
    const { data: adminCheck } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('Admin check result:', adminCheck ? 'User is admin' : 'User is not admin');

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    // Check if there's an invitation token (passed from invite page via sessionStorage)
    const invitationToken = url.searchParams.get('invitation_token');
    
    // Redirect to app with session
    // If user is admin, redirect to /admin, otherwise to /
    const appUrl = url.origin.replace('functions/v1/signicat-oauth-callback', '');
    const redirectPath = adminCheck ? 'admin' : '';
    let redirectUrl = `${appUrl}/#access_token=${sessionData.properties.hashed_token}&type=magiclink${redirectPath ? `&redirect=${redirectPath}` : ''}`;
    
    // Add invitation token to redirect if present
    if (invitationToken) {
      redirectUrl += `&invitation_token=${invitationToken}`;
    }

    console.log('Redirecting to:', redirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
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
