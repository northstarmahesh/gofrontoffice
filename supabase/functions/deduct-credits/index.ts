import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit costs for different action types
const CREDIT_COSTS: Record<string, number> = {
  'AI_RESPONSE': 1,
  'AI_SMS_RESPONSE': 1,
  'AI_WHATSAPP_RESPONSE': 1,
  'AI_INSTAGRAM_RESPONSE': 1,
  'AI_MESSENGER_RESPONSE': 1,
  'CALL_RECORDING': 2,
  'CALL_TRANSCRIPTION': 2,
  'AI_CALL_SUMMARY': 2,
  'AI_DRAFT_GENERATION': 1,
  'AI_TASK_SUGGESTION': 1,
};

interface DeductCreditsRequest {
  clinic_id: string;
  user_id: string;
  action_type: string;
  related_log_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { clinic_id, user_id, action_type, related_log_id }: DeductCreditsRequest = await req.json();

    // Validate required fields
    if (!clinic_id || !user_id || !action_type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: clinic_id, user_id, and action_type are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get credit cost for action type
    const creditsAmount = CREDIT_COSTS[action_type];
    if (!creditsAmount) {
      return new Response(
        JSON.stringify({ 
          error: `Unknown action type: ${action_type}. Valid types: ${Object.keys(CREDIT_COSTS).join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Deducting ${creditsAmount} credits for ${action_type} from clinic ${clinic_id}`);

    // Call the atomic database function
    const { data, error } = await supabase.rpc('deduct_credits_atomic', {
      p_clinic_id: clinic_id,
      p_user_id: user_id,
      p_action_type: action_type,
      p_credits_amount: creditsAmount,
      p_related_log_id: related_log_id || null,
    });

    if (error) {
      console.error('Error deducting credits:', error);
      
      // Check for specific error types
      if (error.message.includes('Insufficient credits')) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits',
            details: error.message 
          }),
          { 
            status: 402, // Payment Required
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (error.message.includes('not found')) {
        return new Response(
          JSON.stringify({ 
            error: 'Clinic billing record not found',
            details: error.message 
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generic error
      return new Response(
        JSON.stringify({ 
          error: 'Failed to deduct credits',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Credits deducted successfully:', data);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        ...data,
        credits_deducted: creditsAmount,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in deduct-credits function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
