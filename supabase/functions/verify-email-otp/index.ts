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

    // Get or create user ID
    let userId: string;
    
    if (!existingUserData) {
      // Create new user with email confirmed and a temporary password
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          email_verified: true
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user");
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);
      
      // Sign in with the temporary password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw new Error("Failed to sign in new user");
      }

      return new Response(
        JSON.stringify({ 
          verified: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: signInData.user
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      userId = existingUserData.id;
      console.log("User already exists:", userId);
    }

    // For existing users, generate a temporary password and sign in
    const tempPassword = crypto.randomUUID();
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new Error("Failed to update user password");
    }

    // Sign in with the temporary password to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: tempPassword,
    });

    if (signInError) {
      console.error("Sign in error:", signInError);
      throw new Error("Failed to sign in user");
    }

    console.log("User signed in successfully");

    return new Response(
      JSON.stringify({ 
        verified: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: signInData.user
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
