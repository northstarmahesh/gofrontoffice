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
    
    console.log('Incoming call:', { method: req.method, from, to, conversation_uuid });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone numbers using shared utility
    const normalizedTo = normalizePhoneNumber(to);
    const normalizedFrom = normalizePhoneNumber(from);

    if (!normalizedTo || !normalizedFrom) {
      console.error('Missing phone numbers:', { from, to, normalizedFrom, normalizedTo });
      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: 'Unable to process call. Missing phone number information.',
          }
        ]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
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
    // Determine a user_id to attribute logs (clinic owner/admin)
    let logUserId: string | null = null;
    const { data: adminCU } = await supabase
      .from('clinic_users')
      .select('user_id, role')
      .eq('clinic_id', phoneData.clinic_id)
      .in('role', ['owner','admin'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    logUserId = adminCU?.user_id || null;
    if (!logUserId) {
      const { data: anyCU } = await supabase
        .from('clinic_users')
        .select('user_id')
        .eq('clinic_id', phoneData.clinic_id)
        .limit(1)
        .maybeSingle();
      logUserId = anyCU?.user_id || null;
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
    
    // Check if outside business hours
    let isOutsideBusinessHours = !schedule?.is_available;
    
    if (schedule?.is_available && schedule.start_time && schedule.end_time) {
      // Handle case where end_time might be less than start_time (misconfiguration)
      if (schedule.end_time < schedule.start_time) {
        console.warn('Invalid schedule: end_time < start_time', schedule);
        isOutsideBusinessHours = true; // Treat as closed
      } else {
        isOutsideBusinessHours = currentTime < schedule.start_time || currentTime > schedule.end_time;
      }
    }

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
      // Get clinic info for voicemail message
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', phoneData.clinic_id)
        .single();

      // Log the voicemail attempt
      await supabase
        .from('activity_logs')
        .insert({
          clinic_id: phoneData.clinic_id,
          user_id: logUserId,
          type: 'call',
          title: `Voicemail from ${normalizedFrom}`,
          summary: `Call received outside business hours - UUID: ${conversation_uuid}`,
          status: 'pending',
          contact_name: normalizedFrom,
          contact_info: normalizedFrom,
          direction: 'inbound',
        });

      const voicemailMessage = isOutsideBusinessHours 
        ? `Thank you for calling ${clinic?.name || 'us'}. We are currently closed. Our business hours are Monday to Friday, 9 AM to 5 PM. Please leave a message after the beep, and we will get back to you as soon as possible.`
        : `Thank you for calling ${clinic?.name || 'us'}. Please leave a message after the beep.`;

      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: voicemailMessage,
            voiceName: 'Astrid',
            language: 'sv-SE',
            premium: true,
          },
          {
            action: 'record',
            eventUrl: [supabaseUrl + '/functions/v1/vonage-voice-recording?conversation_uuid=' + conversation_uuid + '&clinic_id=' + phoneData.clinic_id + '&from=' + normalizedFrom],
            endOnSilence: 3,
            endOnKey: '#',
            beepStart: true,
            transcription: {
              language: 'sv-SE',
              eventUrl: [supabaseUrl + '/functions/v1/vonage-voice-recording?conversation_uuid=' + conversation_uuid + '&clinic_id=' + phoneData.clinic_id + '&from=' + normalizedFrom]
            }
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
      .select('name, phone, email, address, assistant_voice')
      .eq('id', phoneData.clinic_id)
      .single();

    // Log the incoming call
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        user_id: logUserId,
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
        text: 'Detta samtal spelas in för kvalitet och utbildningsändamål.',
        voiceName: 'Astrid',
        language: 'sv-SE',
        premium: true,
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
        text: 'Hej! Tack för att du ringer ' + (clinic?.name || 'vår klinik') + '. Vad kan jag hjälpa dig med?',
        voiceName: 'Astrid',
        language: 'sv-SE',
        premium: true,
      },
      {
        action: 'input',
        eventUrl: [supabaseUrl + '/functions/v1/vonage-voice-input'],
        type: ['speech'],
        speech: {
          context: ['kundservice', 'klinik', 'bokning', 'tidsbeställning'],
          endOnSilence: 3,
          maxDuration: 30,
          language: 'sv-SE',
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify([
        {
          action: 'talk',
          text: 'Förlåt, det uppstod ett fel. Vänligen försök igen senare.',
          voiceName: 'Astrid',
          language: 'sv-SE',
          premium: true,
        }
      ]),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
