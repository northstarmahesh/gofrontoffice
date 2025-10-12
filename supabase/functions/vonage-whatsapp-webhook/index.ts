import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateAiResponse } from "../_shared/ai-service.ts";

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
    const { from, to, message, message_uuid } = body;
    const messageText = message?.content?.text || '';
    
    // Input validation
    if (!from || !to || !messageText || messageText.trim().length === 0) {
      console.error('Missing required fields:', { from, to, hasMessage: !!messageText });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate message length (WhatsApp has 4096 character limit)
    if (messageText.length > 4096) {
      console.error('Message too long:', messageText.length);
      return new Response(JSON.stringify({ error: 'Message too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Incoming WhatsApp from:', from, 'to:', to, 'text:', messageText.substring(0, 100));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone numbers - remove whatsapp: prefix and add + if missing
    const cleanTo = to?.replace('whatsapp:', '');
    const cleanFrom = from?.replace('whatsapp:', '');
    const normalizedTo = cleanTo?.startsWith('+') ? cleanTo : `+${cleanTo}`;
    const normalizedFrom = cleanFrom?.startsWith('+') ? cleanFrom : `+${cleanFrom}`;

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', normalizedTo)
      .maybeSingle();

    if (phoneError || !phoneData) {
      console.error('Phone number not found:', phoneError);
      return new Response(JSON.stringify({ error: 'Phone not configured' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get settings
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('whatsapp_enabled, phone_mode, auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const phoneMode = settings?.phone_mode || 'on';
    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    // Log incoming message and get the log ID
    const { data: inboundLog, error: logError } = await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'whatsapp',
        title: `WhatsApp from ${normalizedFrom}`,
        summary: messageText,
        status: 'pending',
        contact_name: normalizedFrom,
        contact_info: normalizedFrom,
        direction: 'inbound',
      })
      .select()
      .single();

    if (logError || !inboundLog) {
      console.error('Error creating activity log:', logError);
    }

    if (phoneMode === 'off' || !settings?.whatsapp_enabled) {
      console.log('WhatsApp disabled or phone mode is off');
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
      messageText,
      clinic: clinic || {},
      knowledgeBase: knowledgeContent,
      channelType: 'whatsapp'
    });

    // Deduct credits for AI response
    try {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const firstUser = userData?.users?.[0];
      
      if (firstUser) {
        await supabase.rpc('deduct_credits_atomic', {
          p_clinic_id: phoneData.clinic_id,
          p_user_id: firstUser.id,
          p_action_type: 'AI_WHATSAPP_RESPONSE',
          p_credits_amount: 1,
          p_related_log_id: inboundLog?.id,
        });
        console.log('Credits deducted for AI WhatsApp response');
      }
    } catch (creditError) {
      console.error('Error deducting credits:', creditError);
      // Don't fail the request if credit deduction fails
    }

    if (autoPilotEnabled && phoneMode === 'on') {
      // Send WhatsApp using Vonage Messages API
      const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
      const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

      if (!vonageApiKey || !vonageApiSecret) {
        throw new Error('Vonage credentials not configured');
      }

      const vonageResponse = await fetch('https://messages-sandbox.nexmo.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${vonageApiKey}:${vonageApiSecret}`)}`,
        },
        body: JSON.stringify({
          from: to,
          to: from,
          message_type: 'text',
          text: responseText,
          channel: 'whatsapp',
        }),
      });

      if (!vonageResponse.ok) {
        const errorText = await vonageResponse.text();
        console.error('Vonage API error:', vonageResponse.status, errorText);
        throw new Error(`Vonage API request failed: ${vonageResponse.status}`);
      }

      const vonageData = await vonageResponse.json();
      console.log('Vonage response:', vonageData);

      // Log outbound message
      await supabase
        .from('activity_logs')
        .insert({
          clinic_id: phoneData.clinic_id,
          type: 'whatsapp',
          title: `WhatsApp to ${normalizedFrom}`,
          summary: responseText,
          status: 'auto-replied',
          contact_name: normalizedFrom,
          contact_info: normalizedFrom,
          direction: 'outbound',
        });

      // Update inbound log status
      if (inboundLog) {
        await supabase
          .from('activity_logs')
          .update({ status: 'completed' })
          .eq('id', inboundLog.id);
      }
    } else {
      // Co-pilot mode: save as draft
      const { data: userData } = await supabase.auth.admin.listUsers();
      const firstUser = userData?.users?.[0];

      if (inboundLog && firstUser) {
        await supabase
          .from('draft_replies')
          .insert({
            log_id: inboundLog.id,
            clinic_id: phoneData.clinic_id,
            user_id: firstUser.id,
            draft_content: responseText,
            status: 'pending',
          });
        
        console.log('Draft reply saved for copilot mode');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
