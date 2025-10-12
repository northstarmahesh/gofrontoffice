import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientId, message, clinicId } = await req.json();

    // Input validation
    if (!recipientId || !message || !clinicId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: recipientId, message, clinicId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate message length (Instagram limit is 1000 characters)
    if (message.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 1000 characters)' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate message is not empty
    if (message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get Instagram integration for this clinic
    const { data: integration, error: integrationError } = await supabase
      .from('clinic_integrations')
      .select('access_token')
      .eq('clinic_id', clinicId)
      .eq('integration_type', 'instagram')
      .eq('is_connected', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Instagram integration not found or not connected');
    }

    // Get Instagram account ID (page ID that manages the Instagram account)
    // This should be stored during OAuth or retrieved from the integration
    // For now, we'll use the recipientId which should be the page ID

    const sendResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: integration.access_token,
        }),
      }
    );

    const sendData = await sendResponse.json();

    if (!sendResponse.ok) {
      console.error('Instagram API error:', sendData);
      throw new Error(sendData.error?.message || 'Failed to send Instagram message');
    }

    console.log('Instagram message sent successfully:', sendData);

    return new Response(
      JSON.stringify({ success: true, data: sendData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in instagram-send-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
