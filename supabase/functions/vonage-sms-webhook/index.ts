import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateAiResponse } from "../_shared/ai-service.ts";
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
    // Vonage sends SMS as URL-encoded query parameters or in the body
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Try to get data from query params first, then body
    let from = params.get('msisdn') || params.get('from');
    let to = params.get('to');
    let text = params.get('text');
    let messageId = params.get('messageId');
    
    // If not in query params, try parsing body as text
    if (!from || !text) {
      const bodyText = await req.text();
      console.log('Raw body:', bodyText);
      
      // Parse URL-encoded body
      const bodyParams = new URLSearchParams(bodyText);
      from = from || bodyParams.get('msisdn') || bodyParams.get('from');
      to = to || bodyParams.get('to');
      text = text || bodyParams.get('text');
      messageId = messageId || bodyParams.get('messageId');
    }
    
    console.log('Incoming SMS from:', from, 'to:', to, 'text:', text);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone numbers using shared utility
    const normalizedTo = normalizePhoneNumber(to);
    const normalizedFrom = normalizePhoneNumber(from);

    console.log('Normalized numbers - From:', normalizedFrom, 'To:', normalizedTo);

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id, phone_number, is_active')
      .eq('phone_number', normalizedTo)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Phone lookup - Query:', normalizedTo, 'Result:', phoneData, 'Error:', phoneError);

    if (phoneError || !phoneData) {
      console.error('Phone number not found. Searched for:', normalizedTo);
      return new Response(JSON.stringify({ error: 'Phone not configured' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get settings
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('sms_enabled, phone_mode, auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const phoneMode = settings?.phone_mode || 'on';
    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    // Get the first user from the clinic for activity log
    const { data: clinicUser } = await supabase
      .from('clinic_users')
      .select('user_id')
      .eq('clinic_id', phoneData.clinic_id)
      .limit(1)
      .maybeSingle();

    if (!clinicUser?.user_id) {
      console.error('No user found for clinic:', phoneData.clinic_id);
      return new Response(JSON.stringify({ error: 'No user found for clinic' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log incoming message and get the ID
    const { data: activityLog, error: logError } = await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'sms',
        title: `SMS from ${normalizedFrom}`,
        summary: text,
        status: 'pending',
        contact_name: normalizedFrom,
        contact_info: normalizedFrom,
        direction: 'inbound',
        user_id: clinicUser.user_id,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating activity log:', logError);
      return new Response(JSON.stringify({ error: 'Failed to create activity log', details: logError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Activity log created:', activityLog?.id);

    if (phoneMode === 'off') {
      console.log('Phone mode is off, not responding');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get clinic info and custom prompt
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, phone, email, address, assistant_prompt')
      .eq('id', phoneData.clinic_id)
      .single();

    // Get knowledge base
    const { data: knowledgeBase } = await supabase
      .from('clinic_knowledge_base')
      .select('content')
      .eq('clinic_id', phoneData.clinic_id);

    const knowledgeContent = knowledgeBase?.map(kb => kb.content).join('\n\n') || '';

    // Generate AI response using shared service
    const { responseText } = await generateAiResponse({
      messageText: text || '',
      clinic: clinic || {},
      knowledgeBase: knowledgeContent,
      channelType: 'sms'
    });

    if (autoPilotEnabled && phoneMode === 'on') {
      // Send SMS using Vonage
      const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
      const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

      if (!vonageApiKey || !vonageApiSecret) {
        throw new Error('Vonage credentials not configured');
      }

      const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: vonageApiKey,
          api_secret: vonageApiSecret,
          to: normalizedFrom,
          from: normalizedTo,
          text: responseText,
        }),
      });

      const vonageData = await vonageResponse.json();
      console.log('Vonage response:', vonageData);

      // Update activity log
      await supabase
        .from('activity_logs')
        .insert({
          clinic_id: phoneData.clinic_id,
          type: 'sms',
          title: `SMS to ${normalizedFrom}`,
          summary: responseText,
          status: 'completed',
          contact_name: normalizedFrom,
          contact_info: normalizedFrom,
          direction: 'outbound',
          user_id: clinicUser.user_id,
        });
    } else {
      // Co-pilot mode: save as draft
      if (activityLog?.id) {
        const { error: draftError } = await supabase
          .from('draft_replies')
          .insert({
            log_id: activityLog.id,
            clinic_id: phoneData.clinic_id,
            user_id: clinicUser.user_id,
            draft_content: responseText,
            status: 'pending',
          });
        
        if (draftError) {
          console.error('Error creating draft:', draftError);
        } else {
          console.log('Draft saved successfully for log:', activityLog.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in SMS webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
