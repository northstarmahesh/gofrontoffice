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
    const { phoneNumberId } = await req.json();

    if (!phoneNumberId) {
      throw new Error('Phone number ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get phone number details
    const { data: phoneData, error: fetchError } = await supabase
      .from('clinic_phone_numbers')
      .select('phone_number, is_verified')
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: updateError } = await supabase
      .from('clinic_phone_numbers')
      .update({
        verification_code: otp,
        verification_expires_at: expiresAt.toISOString(),
      })
      .eq('id', phoneNumberId);

    if (updateError) {
      throw new Error(`Failed to store OTP: ${updateError.message}`);
    }

    // Send OTP via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Twilio credentials not configured');
      throw new Error('SMS service not configured');
    }

    const message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
    
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneData.phone_number,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error('Twilio error:', errorData);
      throw new Error(`Failed to send SMS: ${errorData.message || 'Unknown error'}`);
    }

    console.log(`OTP sent to ${phoneData.phone_number}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent',
        // Return code in dev for testing (remove in production)
        devCode: otp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-verification-otp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});