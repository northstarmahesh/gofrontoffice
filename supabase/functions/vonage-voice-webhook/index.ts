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
    const body = await req.json();
    const { from, to, conversation_uuid } = body;
    
    console.log('Incoming call from:', from, 'to:', to, 'uuid:', conversation_uuid);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', to)
      .maybeSingle();

    if (phoneError || !phoneData) {
      console.error('Phone number not found:', phoneError);
      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: 'Sorry, this number is not configured.',
          }
        ]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get settings
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('phone_mode, auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const phoneMode = settings?.phone_mode || 'on';
    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    console.log('Phone mode:', phoneMode, 'Auto-pilot:', autoPilotEnabled);

    // If phone is off, leave voicemail
    if (phoneMode === 'off') {
      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: 'Thank you for calling. Please leave a message after the beep.',
          },
          {
            action: 'record',
            eventUrl: [`${supabaseUrl}/functions/v1/vonage-voice-recording`],
            endOnSilence: 3,
            endOnKey: '#',
            beepStart: true,
          }
        ]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get clinic info
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, phone, email, address')
      .eq('id', phoneData.clinic_id)
      .single();

    // Log the incoming call
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'call',
        title: `Incoming Call from ${from}`,
        summary: `Call received - UUID: ${conversation_uuid}`,
        status: 'pending',
        contact_name: from,
        contact_info: from,
        direction: 'inbound',
      });

    // Return NCCO to handle the call with AI
    const ncco = [
      {
        action: 'talk',
        text: `Hello! Thank you for calling ${clinic?.name || 'our clinic'}. How can I help you today?`,
      },
      {
        action: 'input',
        eventUrl: [`${supabaseUrl}/functions/v1/vonage-voice-input`],
        type: ['speech'],
        speech: {
          context: ['customer service', 'clinic', 'appointment'],
          endOnSilence: 2,
          language: 'en-US',
        },
      }
    ];

    console.log('Returning NCCO for call:', conversation_uuid);

    return new Response(JSON.stringify(ncco), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error in voice webhook:', error);
    return new Response(
      JSON.stringify([
        {
          action: 'talk',
          text: 'Sorry, there was an error. Please try again later.',
        }
      ]),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
