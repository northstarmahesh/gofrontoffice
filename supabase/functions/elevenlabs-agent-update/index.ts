import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting elevenlabs-agent-update function');
    
    const { clinic_id, update_type, value } = await req.json();
    console.log('Update request:', { clinic_id, update_type, value_length: value?.length });

    // Validate input
    if (!clinic_id || !update_type || !value) {
      throw new Error('Missing required parameters: clinic_id, update_type, and value are required');
    }

    if (!['prompt', 'voice'].includes(update_type)) {
      throw new Error('update_type must be either "prompt" or "voice"');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create client with user's token for RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user has access to clinic
    console.log('Verifying user access to clinic');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      throw new Error('Invalid authentication token');
    }

    const userId = userData.user.id;

    const { data: clinicUser, error: clinicUserError } = await supabase
      .from('clinic_users')
      .select('role')
      .eq('user_id', userId)
      .eq('clinic_id', clinic_id)
      .maybeSingle();

    if (clinicUserError) {
      console.error('Error checking clinic access:', clinicUserError);
      throw new Error(`Failed to verify clinic access: ${clinicUserError.message}`);
    }

    if (!clinicUser) {
      throw new Error('User does not have access to this clinic');
    }

    console.log('User has access to clinic, role:', clinicUser.role);

    // Get clinic agent_id using service role to bypass RLS
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('Missing service role key');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log('Fetching clinic agent details');
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('elevenlabs_agent_id, name')
      .eq('id', clinic_id)
      .maybeSingle();

    if (clinicError) {
      console.error('Error fetching clinic:', clinicError);
      throw new Error(`Failed to fetch clinic: ${clinicError.message}`);
    }

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    if (!clinic.elevenlabs_agent_id) {
      throw new Error('No Eleven Labs agent found for this clinic. Please create an agent first.');
    }

    const agentId = clinic.elevenlabs_agent_id;
    console.log('Found agent ID:', agentId);

    // Get Eleven Labs API key
    const elevenLabsApiKey = Deno.env.get('ElevenLabs_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Build PATCH body based on update type
    let patchBody: any;
    
    if (update_type === 'prompt') {
      console.log('Updating agent prompt');
      patchBody = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: value
            }
          }
        }
      };
    } else if (update_type === 'voice') {
      console.log('Updating agent voice to:', value);
      patchBody = {
        conversation_config: {
          tts: {
            voice_id: value
          }
        }
      };
    }

    console.log('Sending PATCH request to Eleven Labs');
    
    // PATCH agent via Eleven Labs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to update agent: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Agent updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Agent ${update_type} updated successfully`,
        agent_id: agentId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in elevenlabs-agent-update:', error);
    
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
