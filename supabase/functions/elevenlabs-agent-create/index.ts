import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function buildSchedulePrompt(supabase: any, locationId: string): Promise<string> {
  const { data: schedules } = await supabase
    .from('assistant_schedules')
    .select('*')
    .eq('location_id', locationId)
    .order('day_of_week');

  if (!schedules || schedules.length === 0) {
    return "\n\nBusiness hours: Not configured yet.";
  }

  let prompt = '\n\nBusiness Hours (Stockholm/Europe timezone):\n';

  schedules.forEach((schedule: any) => {
    const dayName = DAYS[schedule.day_of_week];
    if (schedule.is_available) {
      prompt += `- ${dayName}: ${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}\n`;
    } else {
      prompt += `- ${dayName}: Stängd (Closed)\n`;
    }
  });

  prompt += '\nIf someone calls outside business hours, politely inform them in Swedish: "Vi är stängda just nu" and tell them when you open next.\n';

  return prompt;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting elevenlabs-agent-create function');
    
    const { clinic_id } = await req.json();
    console.log('Creating agent for clinic:', clinic_id);

    if (!clinic_id) {
      throw new Error('clinic_id is required');
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get clinic details
    console.log('Fetching clinic details from database');
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, assistant_prompt, selected_elevenlabs_voice_id')
      .eq('id', clinic_id)
      .single();

    if (clinicError) {
      console.error('Error fetching clinic:', clinicError);
      throw new Error(`Failed to fetch clinic: ${clinicError.message}`);
    }

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    console.log('Clinic found:', clinic.name);

    // Get location for schedule
    const { data: location } = await supabase
      .from('clinic_locations')
      .select('id')
      .eq('clinic_id', clinic_id)
      .limit(1)
      .single();

    // Get Eleven Labs API key
    const elevenLabsApiKey = Deno.env.get('ElevenLabs_API_KEY');
    
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured in secrets');
    }

    // Prepare agent configuration
    let assistantPrompt = clinic.assistant_prompt || 
      `Du är en hjälpsam AI-assistent för ${clinic.name}. Du hjälper patienter med bokningar, frågor om behandlingar och allmän information om kliniken.`;
    
    // Add schedule to prompt
    if (location) {
      const schedulePrompt = await buildSchedulePrompt(supabase, location.id);
      assistantPrompt += schedulePrompt;
    }
    
    const voiceId = clinic.selected_elevenlabs_voice_id || '4xkUqaR9MYOJHoaC1Nak';
    
    const firstMessage = `Hej! Tack för att du ringer ${clinic.name}. Vad kan jag hjälpa dig med?`;

    const agentConfig = {
      name: `${clinic.name} Agent`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: assistantPrompt,
            tool_ids: [],
            built_in_tools: ["end_call", "language_detection"]
          },
          first_message: firstMessage,
          language: "sv"
        },
        tts: {
          voice_id: voiceId
        },
        asr: {
          language: "sv"
        }
      }
    };

    console.log('Creating agent with Eleven Labs API');
    console.log('Agent config:', JSON.stringify(agentConfig, null, 2));

    // Create agent via Eleven Labs API
    const agentResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentConfig)
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('Eleven Labs API error:', {
        status: agentResponse.status,
        statusText: agentResponse.statusText,
        body: errorText
      });
      throw new Error(`Failed to create agent: ${agentResponse.status} - ${errorText}`);
    }

    const agentData = await agentResponse.json();
    console.log('Agent created successfully:', agentData);

    const agent_id = agentData.agent_id;
    
    if (!agent_id) {
      console.error('No agent_id in response:', agentData);
      throw new Error('No agent_id returned from Eleven Labs API');
    }

    // Build SIP URI
    const sip_uri = `sip:${agent_id}@sip.rtc.elevenlabs.io:5060;transport=tcp`;
    
    console.log('Saving agent details to database:', { agent_id, sip_uri });

    // Save to database
    const { error: updateError } = await supabase
      .from('clinics')
      .update({
        elevenlabs_agent_id: agent_id,
        elevenlabs_sip_uri: sip_uri,
        updated_at: new Date().toISOString()
      })
      .eq('id', clinic_id);

    if (updateError) {
      console.error('Failed to save agent to database:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('Agent created and saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        agent_id,
        sip_uri,
        message: 'Agent created successfully',
        clinic_name: clinic.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in elevenlabs-agent-create:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
