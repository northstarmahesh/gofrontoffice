import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { normalizePhoneNumber } from "../_shared/phone-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request - Vonage can send GET or POST
    const url = new URL(req.url);
    let from = url.searchParams.get('from') || '';
    let to = url.searchParams.get('to') || '';
    let conversation_uuid = url.searchParams.get('conversation_uuid') || '';

    // If params not in URL, try body (POST)
    if (!from || !to) {
      try {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await req.json();
          from = body.from || from;
          to = body.to || to;
          conversation_uuid = body.conversation_uuid || conversation_uuid;
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await req.text();
          const params = new URLSearchParams(text);
          from = params.get('from') || from;
          to = params.get('to') || to;
          conversation_uuid = params.get('conversation_uuid') || conversation_uuid;
        }
      } catch (e) {
        console.error('Body parse error:', e);
      }
    }

    console.log('Incoming call - forwarding to Eleven Labs:', { from, to, conversation_uuid });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone numbers
    const normalizedTo = normalizePhoneNumber(to);
    const normalizedFrom = normalizePhoneNumber(from);

    if (!normalizedTo || !normalizedFrom) {
      console.error('Missing phone numbers:', { from, to });
      return new Response(
        JSON.stringify([{
          action: 'talk',
          text: 'Unable to process call.',
          voiceName: 'Astrid',
          language: 'sv-SE',
        }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', normalizedTo)
      .maybeSingle();

    if (phoneError || !phoneData) {
      console.error('Phone number not found:', phoneError);
      return new Response(
        JSON.stringify([{
          action: 'talk',
          text: 'Förlåt, det här numret är inte konfigurerat.',
          voiceName: 'Astrid',
          language: 'sv-SE',
        }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get clinic details and Eleven Labs SIP URI
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, elevenlabs_sip_uri, elevenlabs_agent_id')
      .eq('id', phoneData.clinic_id)
      .maybeSingle();

    if (clinicError || !clinic) {
      console.error('Clinic not found:', clinicError);
      return new Response(
        JSON.stringify([{
          action: 'talk',
          text: 'Förlåt, systemet är inte konfigurerat.',
          voiceName: 'Astrid',
          language: 'sv-SE',
        }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clinic.elevenlabs_sip_uri) {
      console.error('Clinic has no Eleven Labs SIP URI configured');
      return new Response(
        JSON.stringify([{
          action: 'talk',
          text: 'Förlåt, AI-assistenten är inte aktiverad ännu.',
          voiceName: 'Astrid',
          language: 'sv-SE',
        }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get a user_id for logging (clinic owner/admin)
    const { data: clinicUser } = await supabase
      .from('clinic_users')
      .select('user_id')
      .eq('clinic_id', phoneData.clinic_id)
      .limit(1)
      .maybeSingle();

    const logUserId = clinicUser?.user_id || null;

    // Log call attempt to activity_logs
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        user_id: logUserId,
        location_id: phoneData.location_id,
        type: 'call',
        title: `Incoming Call - ${conversation_uuid.slice(0, 8)}`,
        summary: `Call from ${normalizedFrom} forwarded to Eleven Labs AI`,
        status: 'pending',
        contact_name: normalizedFrom,
        contact_info: normalizedFrom,
        direction: 'inbound',
      });

    // Return NCCO with initial greeting, then connect to Eleven Labs SIP
    console.log('Forwarding call to Eleven Labs SIP URI:', clinic.elevenlabs_sip_uri);
    console.log('Agent ID:', clinic.elevenlabs_agent_id);

    const ncco = [
      {
        action: "talk",
        text: "Ett ögonblick, jag kopplar dig till vår assistent.",
        voiceName: "Astrid",
        language: "sv-SE"
      },
      {
        action: "connect",
        timeout: 20,
        from: normalizedTo,
        endpoint: [{
          type: "sip",
          uri: clinic.elevenlabs_sip_uri
        }]
      },
      {
        action: "talk",
        text: "Förlåt, assistenten är inte tillgänglig just nu. Vänligen försök igen senare.",
        voiceName: "Astrid",
        language: "sv-SE"
      }
    ];

    console.log('Returning NCCO:', JSON.stringify(ncco, null, 2));

    return new Response(
      JSON.stringify(ncco),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in voice webhook:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify([{
        action: 'talk',
        text: 'Förlåt, det uppstod ett tekniskt fel.',
        voiceName: 'Astrid',
        language: 'sv-SE',
      }]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
