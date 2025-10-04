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
    const { clinicId, locationId } = await req.json();
    
    if (!clinicId) {
      throw new Error('Clinic ID is required');
    }

    const META_APP_ID = Deno.env.get('META_APP_ID');
    if (!META_APP_ID) {
      throw new Error('META_APP_ID not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;
    
    // Store state to verify callback
    const state = `${clinicId}:${locationId || ''}:${Date.now()}`;
    
    // Instagram OAuth URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'pages_show_list,pages_manage_metadata');
    authUrl.searchParams.set('response_type', 'code');

    console.log('OAuth Start - Clinic:', clinicId, 'Location:', locationId);
    console.log('Redirect URI:', redirectUri);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in instagram-oauth-start:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
