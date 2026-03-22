import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateEmailHTML = (invitedByName: string, clinicName: string, role: string, invitationUrl: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbjudan till ${clinicName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0 auto; padding: 40px 40px 48px; border-radius: 8px;">
          <tr>
            <td>
              <h1 style="color: #333; font-size: 28px; font-weight: bold; margin: 0 0 24px 0;">Välkommen till Go Front Office! 👋</h1>
              
              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                <strong>${invitedByName}</strong> har bjudit in dig till <strong>${clinicName}</strong> på Go Front Office.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                Din roll: <strong>${role === 'admin' ? 'Admin' : 'Personal'}</strong>
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 27px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="background-color: #ff6b35; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 14px 40px;">
                      Acceptera med BankID 🇸🇪
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
                Eller kopiera och klistra in denna länk i din webbläsare:
              </p>
              <p style="color: #2754C5; font-size: 14px; line-height: 22px; margin: 16px 0; word-break: break-all;">
                ${invitationUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 20px 0;">

              <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
                Om du inte känner igen denna inbjudan kan du ignorera detta meddelande.
              </p>

              <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
                Länken är giltig i 7 dagar.
              </p>

              <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px;">
                Go Front Office - Din digitala assistent
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { invitationId } = await req.json();

    if (!invitationId) {
      throw new Error('Invitation ID is required');
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('team_invitations')
      .select(`
        *,
        clinics!inner(name),
        profiles!team_invitations_invited_by_fkey(full_name, email)
      `)
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      console.error('Error fetching invitation:', inviteError);
      throw new Error('Invitation not found');
    }

    // Build invitation URL - use lovableproject.com domain for preview
    const baseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const projectUrl = baseUrl.includes('bzaqtvjereyqrymupapp') 
      ? 'https://18856553-8899-458c-94e4-c447e32346ef.lovableproject.com'
      : baseUrl;
    
    const invitationUrl = `${projectUrl}/invite/${invitation.token}`;
    
    const inviterName = invitation.profiles?.full_name || invitation.profiles?.email || 'En administratör';
    const clinicName = invitation.clinics?.name || 'kliniken';

    // Generate HTML email
    const html = generateEmailHTML(inviterName, clinicName, invitation.role, invitationUrl);

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Go Front Office <onboarding@resend.dev>',
        to: [invitation.email],
        subject: `Du är inbjuden till ${clinicName} på Go Front Office`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Error sending email:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    console.log('Invitation email sent successfully to:', invitation.email);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in send-team-invitation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
