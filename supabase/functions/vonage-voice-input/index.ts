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
    const { speech, from, to, conversation_uuid } = body;
    const userInput = speech?.results?.[0]?.text || '';

    console.log('Voice input - Speech:', userInput, 'From:', from);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone number - add + if missing
    const normalizedTo = to?.startsWith('+') ? to : `+${to}`;
    const normalizedFrom = from?.startsWith('+') ? from : `+${from}`;

    // Find clinic
    const { data: phoneData } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id, location_id')
      .eq('phone_number', normalizedTo)
      .maybeSingle();

    if (!phoneData) {
      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: 'Sorry, there was an error processing your request.',
          }
        ]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { role: 'user', content: userInput }
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
        title: `Call with ${normalizedFrom}`,
        summary: `Caller: "${userInput}"\n\nResponse: "${responseText}"`,
        status: autoPilotEnabled ? 'completed' : 'pending',
        contact_name: normalizedFrom,
        contact_info: normalizedFrom,
        direction: 'inbound',
      });

    if (autoPilotEnabled) {
      // Auto-pilot: Respond immediately
      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: responseText,
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
        ]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Co-pilot: Save as draft
      await supabase
        .from('draft_replies')
        .insert({
          log_id: conversation_uuid,
          clinic_id: phoneData.clinic_id,
          user_id: phoneData.clinic_id,
          draft_content: responseText,
          status: 'pending',
        });

      return new Response(
        JSON.stringify([
          {
            action: 'talk',
            text: 'Thank you for your question. One of our team members will call you back shortly.',
          }
        ]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in voice input:', error);
    return new Response(
      JSON.stringify([
        {
          action: 'talk',
          text: 'I apologize, but I\'m having trouble right now. Please try calling back later.',
        }
      ]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
