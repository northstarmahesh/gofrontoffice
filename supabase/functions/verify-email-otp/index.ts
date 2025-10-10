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

    console.log(`Verifying code for email: ${email}, code: ${code}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentTime = new Date().toISOString();
    console.log(`Current time: ${currentTime}`);

    // First check all codes for this email
    const { data: allCodes, error: allCodesError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false });
    
    console.log(`All codes for ${email}:`, allCodes);

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gte("expires_at", currentTime)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`Verification query result:`, { verification, fetchError });

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Failed to verify code");
    }

    if (!verification) {
      console.log("No matching verification found");
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid or expired code" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Verification found:", verification);

    // Delete the used verification code
    await supabase
      .from("email_verifications")
      .delete()
      .eq("id", verification.id);

    // Check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === email);

    let userId: string;

    if (!existingUser) {
      // Create new user with email confirmed
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          email_verified: true
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user");
      }

      console.log("Created new user:", newUser.user.id);
      userId = newUser.user.id;
    } else {
      console.log("User already exists:", existingUser.id);
      userId = existingUser.id;
    }

    // Generate tokens using the magiclink approach (workaround to get tokens)
    const { data: signInLink, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (linkError) {
      console.error("Link error:", linkError);
      throw new Error("Failed to generate tokens");
    }

    console.log("Generated magic link:", signInLink.properties.action_link);

    // The tokens are in the URL hash, not query params
    const magicLinkUrl = signInLink.properties.action_link;
    
    // Try to extract from hash first (format: #access_token=xxx&refresh_token=yyy)
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    
    if (magicLinkUrl.includes('#')) {
      const hashPart = magicLinkUrl.split('#')[1];
      const hashParams = new URLSearchParams(hashPart);
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }
    
    // If not in hash, try query params
    if (!accessToken || !refreshToken) {
      const urlObj = new URL(magicLinkUrl);
      accessToken = urlObj.searchParams.get('access_token');
      refreshToken = urlObj.searchParams.get('refresh_token');
    }

    if (!accessToken || !refreshToken) {
      console.error("Token extraction failed. Magic link:", magicLinkUrl);
      throw new Error("Failed to extract tokens from magic link");
    }

    console.log("Tokens extracted successfully");

    return new Response(
      JSON.stringify({ 
        verified: true,
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken
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
