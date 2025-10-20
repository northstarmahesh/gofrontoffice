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
    const url = new URL(req.url);
    const recordingUrl = url.searchParams.get('url');
    
    if (!recordingUrl) {
      return new Response(JSON.stringify({ error: 'Missing recording URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Proxying recording from:', recordingUrl);

    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    
    if (!vonageApiKey || !vonageApiSecret) {
      throw new Error('Vonage credentials not configured');
    }

    const authHeader = `Basic ${btoa(`${vonageApiKey}:${vonageApiSecret}`)}`;
    
    const audioResponse = await fetch(recordingUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch recording: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    // Stream the audio directly to the client
    return new Response(audioResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error('Error in recording proxy:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
