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
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('Voice gather - Speech:', speechResult, 'From:', from);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find clinic
    const { data: phoneData } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', to)
      .maybeSingle();

    if (!phoneData) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Sorry, there was an error processing your request.</Say>
        </Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    // Get settings
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('auto_pilot_enabled')
      .eq('location_id', phoneData.location_id)
      .maybeSingle();

    const autoPilotEnabled = settings?.auto_pilot_enabled ?? true;

    // Get clinic info
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name')
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
You are speaking on the phone, so keep responses brief and conversational.
Based on the caller's question, provide helpful information.

Knowledge Base:
${knowledgeContent || 'No additional information available.'}

Important: Keep your response under 30 seconds when spoken aloud. Be friendly and professional.`;

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
          { role: 'user', content: speechResult }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI API request failed');
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    console.log('AI Response:', responseText);

    // Update activity log
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: phoneData.clinic_id,
        type: 'call',
        title: `Call with ${from}`,
        summary: `Caller: "${speechResult}"\n\nResponse: "${responseText}"`,
        status: autoPilotEnabled ? 'completed' : 'pending',
        contact_name: from,
        contact_info: from,
        direction: 'inbound',
      });

    if (autoPilotEnabled) {
      // Auto-pilot: Respond immediately
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${responseText}</Say>
  <Gather input="speech" action="${supabaseUrl}/functions/v1/twilio-voice-gather" speechTimeout="auto" language="en-US" speechModel="phone_call">
    <Say voice="alice">Is there anything else I can help you with?</Say>
    <Pause length="3"/>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
</Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    } else {
      // Co-pilot: Save as draft
      await supabase
        .from('draft_replies')
        .insert({
          log_id: callSid,
          clinic_id: phoneData.clinic_id,
          user_id: phoneData.clinic_id, // Will need proper user mapping
          draft_content: responseText,
          status: 'pending',
        });

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for your question. One of our team members will call you back shortly.</Say>
</Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

  } catch (error: any) {
    console.error('Error in voice gather:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I apologize, but I'm having trouble right now. Please try calling back later.</Say>
</Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
