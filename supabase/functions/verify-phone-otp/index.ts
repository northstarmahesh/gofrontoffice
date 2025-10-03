import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumberId, code } = await req.json();

    if (!phoneNumberId || !code) {
      throw new Error('Phone number ID and verification code are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get stored verification code
    const { data: phoneData, error: fetchError } = await supabase
      .from('clinic_phone_numbers')
      .select('verification_code, verification_expires_at, is_verified')
      .eq('id', phoneNumberId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch phone number: ${fetchError.message}`);
    }

    if (phoneData.is_verified) {
      return new Response(
        JSON.stringify({ success: true, message: 'Phone number already verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phoneData.verification_code || !phoneData.verification_expires_at) {
      throw new Error('No verification code found. Please request a new code.');
    }

    // Check if code is expired
    const expiresAt = new Date(phoneData.verification_expires_at);
    if (new Date() > expiresAt) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Verify the code
    if (phoneData.verification_code !== code) {
      throw new Error('Invalid verification code');
    }

    // Mark as verified and clear verification data
    const { error: updateError } = await supabase
      .from('clinic_phone_numbers')
      .update({
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('id', phoneNumberId);

    if (updateError) {
      throw new Error(`Failed to verify phone number: ${updateError.message}`);
    }

    console.log(`Phone number ${phoneNumberId} verified successfully`);

    return new Response(
      JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-phone-otp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});