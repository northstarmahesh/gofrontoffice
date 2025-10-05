import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPhoneRequest {
  phone: string;
  code: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code }: VerifyPhoneRequest = await req.json();

    if (!phone || !code) {
      throw new Error("Phone number and code are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("phone", phone)
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
      .from("phone_verifications")
      .delete()
      .eq("id", verification.id);

    // Check if user exists with this phone
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.phone === phone);

    let userId: string;

    if (!userExists) {
      // Create new user with phone confirmed
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: {
          phone_verified: true
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user");
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);
    } else {
      // Get existing user
      const existingUserData = existingUser.users.find(u => u.phone === phone);
      userId = existingUserData!.id;
      console.log("User already exists:", userId);
    }

    // For phone auth, we need to create a custom JWT since generateLink doesn't support phone
    // We'll use the admin API to create a session
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    
    if (!userData?.user) {
      throw new Error("Failed to get user data");
    }

    // Create a temporary email-based magic link to get tokens
    // This is a workaround since phone-only users need tokens
    const tempEmail = `${phone.replace(/\+/g, '')}@temp-phone-auth.local`;
    
    // Update user with temp email if they don't have one
    if (!userData.user.email) {
      await supabase.auth.admin.updateUserById(userId, {
        email: tempEmail,
        email_confirm: true
      });
    }
    
    // Generate link using email (which we just set)
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email || tempEmail,
    });

    if (tokenError) {
      console.error("Token error:", tokenError);
      throw new Error("Failed to generate authentication token");
    }

    // Extract the token from the URL
    const url = new URL(tokenData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    return new Response(
      JSON.stringify({ 
        verified: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: userData.user
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
