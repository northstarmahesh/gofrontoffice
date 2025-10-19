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

    // Normalize phone number - add + if missing
    const normalizedTo = to?.startsWith('+') ? to : `+${to}`;
    const normalizedFrom = from?.startsWith('+') ? from : `+${from}`;

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', normalizedTo)
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

    // Check business hours
    const { data: schedule } = await supabase
      .from('assistant_schedules')
      .select('is_available, start_time, end_time')
      .eq('location_id', phoneData.location_id)
      .eq('day_of_week', new Date().getDay())
      .maybeSingle();

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    
    const isOutsideBusinessHours = !schedule?.is_available || 
      (schedule.start_time && currentTime < schedule.start_time) ||
      (schedule.end_time && currentTime > schedule.end_time);

    console.log('Schedule check:', { 
      day: new Date().getDay(), 
      currentTime, 
      isAvailable: schedule?.is_available,
      startTime: schedule?.start_time,
      endTime: schedule?.end_time,
      isOutsideBusinessHours 
    });

    // If outside business hours or phone is off, leave voicemail
    if (isOutsideBusinessHours || phoneMode === 'off') {
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
        title: `Incoming Call from ${normalizedFrom}`,
        summary: `Call received - UUID: ${conversation_uuid}`,
        status: 'pending',
        contact_name: normalizedFrom,
        contact_info: normalizedFrom,
        direction: 'inbound',
      });

    // Return NCCO to handle the call with AI, consent announcement, and recording
    const ncco = [
      {
        action: 'talk',
        text: 'This call is being recorded for quality and training purposes.',
      },
      {
        action: 'record',
        eventUrl: [`${supabaseUrl}/functions/v1/vonage-voice-recording?conversation_uuid=${conversation_uuid}&clinic_id=${phoneData.clinic_id}`],
        format: 'mp3',
        split: 'conversation',
        channels: 1,
        endOnSilence: 3,
        endOnKey: '#',
        timeOut: 7200, // 2 hours max
      },
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
