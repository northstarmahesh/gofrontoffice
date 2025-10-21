import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to normalize phone numbers
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received conversation initiation request from ElevenLabs');
    
    // Parse the request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Extract caller and called numbers from ElevenLabs request
    // ElevenLabs may send: from, to, caller_number, called_number, etc.
    const callerNumber = normalizePhoneNumber(
      body.from || body.caller_number || body.caller || ''
    );
    const calledNumber = normalizePhoneNumber(
      body.to || body.called_number || body.called || body.to_number || ''
    );
    
    console.log('Extracted numbers - Caller:', callerNumber, 'Called:', calledNumber);

    if (!calledNumber) {
      console.error('No called number found in request');
      return new Response(
        JSON.stringify({ 
          error: 'Missing called number',
          agent_id: 'agent_8401k825b6qffxbvdsf4pj0wcchw' // Fallback to default agent
        }),
        { 
          status: 200, // Return 200 to prevent ElevenLabs from retrying
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the clinic associated with the called number
    const { data: phoneData, error: phoneError } = await supabase
      .from('clinic_phone_numbers')
      .select('clinic_id')
      .eq('phone_number', calledNumber)
      .maybeSingle();

    if (phoneError) {
      console.error('Error querying clinic_phone_numbers:', phoneError);
    }

    if (!phoneData) {
      console.warn('No clinic found for number:', calledNumber);
      // Return default agent if no clinic found
      return new Response(
        JSON.stringify({ 
          agent_id: 'agent_8401k825b6qffxbvdsf4pj0wcchw',
          first_message: 'Hej! Välkommen.',
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get clinic details including agent ID
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, elevenlabs_agent_id, language')
      .eq('id', phoneData.clinic_id)
      .maybeSingle();

    if (clinicError) {
      console.error('Error querying clinics:', clinicError);
    }

    if (!clinic || !clinic.elevenlabs_agent_id) {
      console.error('Clinic or agent ID not found for clinic_id:', phoneData.clinic_id);
      // Return default agent
      return new Response(
        JSON.stringify({ 
          agent_id: 'agent_8401k825b6qffxbvdsf4pj0wcchw',
          first_message: 'Hej! Välkommen.',
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Found clinic:', clinic.name, 'with agent_id:', clinic.elevenlabs_agent_id);

    // Prepare the response for ElevenLabs
    const response = {
      agent_id: clinic.elevenlabs_agent_id,
      first_message: clinic.language === 'sv' || clinic.language === 'sv-SE' 
        ? `Hej! Välkommen till ${clinic.name}.`
        : `Hello! Welcome to ${clinic.name}.`,
      metadata: {
        caller_number: callerNumber,
        called_number: calledNumber,
        clinic_id: clinic.id,
        clinic_name: clinic.name,
      }
    };

    console.log('Returning agent configuration:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in conversation-init webhook:', error);
    
    // Return default agent on error to prevent call failure
    return new Response(
      JSON.stringify({ 
        agent_id: 'agent_8401k825b6qffxbvdsf4pj0wcchw',
        first_message: 'Hej! Välkommen.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 200, // Always return 200 to prevent retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
