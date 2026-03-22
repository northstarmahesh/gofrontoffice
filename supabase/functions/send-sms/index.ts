import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, from } = await req.json();

    if (!to || !message) {
      throw new Error('Missing required fields: to and message');
    }

    console.log('[send-sms] Sending SMS to:', to, 'from:', from);

    const VONAGE_API_KEY = Deno.env.get('VONAGE_API_KEY');
    const VONAGE_API_SECRET = Deno.env.get('VONAGE_API_SECRET');

    if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
      throw new Error('Vonage credentials not configured');
    }

    // Send SMS via Vonage SMS API
    const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: VONAGE_API_KEY,
        api_secret: VONAGE_API_SECRET,
        from: from || 'GoFrontOffice',
        to: to.replace(/\+/g, ''), // Remove + from phone number for Vonage
        text: message,
        type: 'unicode', // Support all characters including Swedish
      }),
    });

    const vonageData = await vonageResponse.json();
    console.log('[send-sms] Vonage response:', vonageData);

    if (vonageData.messages[0].status !== '0') {
      throw new Error(`Failed to send SMS: ${vonageData.messages[0]['error-text']}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        messageId: vonageData.messages[0]['message-id']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[send-sms] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
