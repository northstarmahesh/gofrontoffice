import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailVerificationRequest {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: EmailVerificationRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in Supabase with 10-minute expiry
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a simple verification table entry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error: dbError } = await supabase
      .from("email_verifications")
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store verification code");
    }

    // TODO: In production, send email via Resend
    // For now, we'll just log it (you can add Resend integration later)
    console.log(`Verification code for ${email}: ${code}`);
    
    // In development, return the code in the response (REMOVE IN PRODUCTION!)
    return new Response(
      JSON.stringify({ 
        success: true,
        // Remove this in production:
        devCode: code 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
