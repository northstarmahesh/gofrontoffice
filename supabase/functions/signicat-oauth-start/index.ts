import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode } = await req.json().catch(() => ({ mode: 'login' }));
    
    const clientId = Deno.env.get('SIGNICAT_CLIENT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!clientId || !supabaseUrl) {
      throw new Error('Missing required configuration');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/signicat-oauth-callback`;
    const stateData = {
      r: Math.random().toString(36).substring(2),
      mode: mode || 'login'
    };
    const state = encodeURIComponent(JSON.stringify(stateData));
    
    // Build authorization URL (using Signicat sandbox environment)
    const authUrl = new URL('https://front-office.sandbox.signicat.com/auth/open/connect/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('acr_values', 'urn:signicat:oidc:method:sbid'); // Swedish BankID

    console.log('Generated BankID auth URL with mode:', mode);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state: state
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in signicat-oauth-start:', error);
    
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
