import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse Twilio form data
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    
    console.log('Incoming call from:', from, 'CallSid:', callSid, 'Status:', callStatus);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', formData.get('To') as string)
      .maybeSingle();

    if (phoneError || !phoneData) {
      console.error('Phone number not found:', phoneError);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Sorry, this number is not configured.</Say>
        </Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Get clinic settings
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('phone_mode, auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const phoneMode = settings?.phone_mode || 'on';
    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    console.log('Phone mode:', phoneMode, 'Auto-pilot:', autoPilotEnabled);

    // If phone is off, reject the call politely
    if (phoneMode === 'off') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. Please leave a message after the beep.</Say>
          <Record maxLength="120" transcribe="true" transcribeCallback="${supabaseUrl}/functions/v1/twilio-voice-transcription"/>
        </Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Get clinic info for context
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, phone, email, address')
      .eq('id', phoneData.clinic_id)
      .single();

    // Get knowledge base
    const { data: knowledgeBase } = await supabase
      .from('clinic_knowledge_base')
      .select('content')
      .eq('clinic_id', phoneData.clinic_id);

    const knowledgeContent = knowledgeBase?.map(kb => kb.content).join('\n\n') || '';

    // Log the incoming call
    const { data: logData, error: logError } = await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'call',
        title: `Incoming Call from ${from}`,
        summary: `Call received - Status: ${callStatus}`,
        status: 'pending',
        contact_name: from,
        contact_info: from,
        direction: 'inbound',
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging call:', logError);
    }

    // Return TwiML to handle the call with AI
    // Using Twilio's <Gather> to collect speech input
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! Thank you for calling ${clinic?.name || 'our clinic'}. How can I help you today?</Say>
  <Gather input="speech" action="${supabaseUrl}/functions/v1/twilio-voice-gather" speechTimeout="auto" language="en-US" speechModel="phone_call">
    <Pause length="5"/>
  </Gather>
  <Say voice="alice">Sorry, I didn't catch that. Please call back and try again.</Say>
</Response>`;

    console.log('Returning TwiML response for call:', callSid);

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error in voice webhook:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Sorry, there was an error. Please try again later.</Say>
      </Response>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200
      }
    );
  }
});
