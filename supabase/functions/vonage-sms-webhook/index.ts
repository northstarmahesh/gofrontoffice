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

    // Find clinic by phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', to)
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
      .select('sms_enabled, phone_mode, auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const phoneMode = settings?.phone_mode || 'on';
    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    // Log incoming message
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'sms',
        title: `SMS from ${from}`,
        summary: text,
        status: 'pending',
        contact_name: from,
        contact_info: from,
        direction: 'inbound',
      });

    if (phoneMode === 'off') {
      console.log('Phone mode is off, not responding');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get clinic info
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

    // Generate AI response
    const systemPrompt = `You are a helpful AI assistant for ${clinic?.name || 'a clinic'}.
You are responding via SMS, so keep responses brief (under 160 characters when possible).
Based on the customer's message, provide helpful information.

Clinic Information:
- Name: ${clinic?.name}
- Phone: ${clinic?.phone}
- Email: ${clinic?.email}
- Address: ${clinic?.address}

Knowledge Base:
${knowledgeContent || 'No additional information available.'}

Important: Keep your response concise and friendly. If you need more information, ask one clear question.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not set');
      throw new Error('AI configuration error');
    }

    const aiResponse = await fetch('https://api.lovable.app/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI API request failed');
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    console.log('AI Response:', responseText);

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
          to: from,
          from: to,
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
          title: `SMS to ${from}`,
          summary: responseText,
          status: 'completed',
          contact_name: from,
          contact_info: from,
          direction: 'outbound',
        });
    } else {
      // Co-pilot mode: save as draft
      await supabase
        .from('draft_replies')
        .insert({
          log_id: messageId,
          clinic_id: phoneData.clinic_id,
          user_id: phoneData.clinic_id,
          draft_content: responseText,
          status: 'pending',
        });
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
