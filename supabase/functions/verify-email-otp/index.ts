import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyEmailRequest {
  email: string;
  code: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyEmailRequest = await req.json();

    if (!email || !code) {
      throw new Error("Email and code are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Failed to verify code");
    }

    if (!verification) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid or expired code" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete the used verification code
    await supabase
      .from("email_verifications")
      .delete()
      .eq("id", verification.id);

    // Check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUserData = users?.find(u => u.email === email);

    if (!existingUserData) {
      // Create new user with email confirmed
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          email_verified: true
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user");
      }

      console.log("Created new user:", newUser.user.id);
    } else {
      console.log("User already exists:", existingUserData.id);
    }

    // Generate a recovery link which includes access tokens
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      throw new Error("Failed to generate authentication link");
    }

    // Extract the token_hash from the action link
    const actionLink = linkData.properties.action_link;
    const linkUrl = new URL(actionLink);
    const tokenHash = linkUrl.searchParams.get('token_hash');
    const typeParam = linkUrl.searchParams.get('type');

    if (!tokenHash) {
      throw new Error("Failed to generate token hash");
    }

    // Verify the OTP token to create a session
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (typeParam as any) || 'recovery',
    });

    if (verifyError) {
      console.error("Verify error:", verifyError);
      throw new Error("Failed to create session");
    }

    console.log("Session created successfully");

    return new Response(
      JSON.stringify({ 
        verified: true,
        access_token: sessionData.session?.access_token,
        refresh_token: sessionData.session?.refresh_token,
        user: sessionData.user
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
