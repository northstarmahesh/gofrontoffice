import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        `<html><body><h1>Error</h1><p>Authentication failed: ${error}</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Parse state: clinicId:locationId:timestamp
    const [clinicId, locationId] = state.split(':');

    if (!clinicId) {
      throw new Error('Invalid state parameter: missing clinic ID');
    }

    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Meta credentials not configured');
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/whatsapp-oauth-callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    console.log('Exchanging code for token...');
    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      throw new Error('Failed to exchange code for access token');
    }

    const accessToken = tokenData.access_token;

    // Get WhatsApp Business Accounts
    const wabsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=whatsapp_business_accounts&access_token=${accessToken}`
    );
    const wabsData = await wabsResponse.json();

    console.log('WhatsApp Business Accounts data:', wabsData);

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if we got any WhatsApp Business Accounts
    if (!wabsData.whatsapp_business_accounts?.data || wabsData.whatsapp_business_accounts.data.length === 0) {
      console.error('No WhatsApp Business Accounts found for this user');
      return new Response(
        `<html>
          <body>
            <h1>No WhatsApp Business Accounts Found</h1>
            <p>To connect WhatsApp, you need a WhatsApp Business account linked to your Meta Business.</p>
            <p>Please ensure you:</p>
            <ul>
              <li>Have a Meta Business account</li>
              <li>Have a WhatsApp Business account linked to that Business</li>
              <li>Are an admin of that WhatsApp Business account</li>
            </ul>
            <p><a href="https://business.facebook.com/wa/manage/home/" target="_blank">Manage WhatsApp Business Account</a></p>
            <script>
              setTimeout(() => {
                window.close();
              }, 10000);
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    // Store integration for the first WhatsApp Business Account
    const wabaId = wabsData.whatsapp_business_accounts.data[0].id;
    
    // Store in clinic_integrations
    const { error: dbError } = await supabase
      .from('clinic_integrations')
      .upsert({
        clinic_id: clinicId,
        location_id: locationId || null,
        integration_type: 'whatsapp',
        is_connected: true,
        access_token: accessToken,
        token_expiry: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clinic_id,integration_type',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('WhatsApp integration saved for WABA:', wabaId);

    // Log successful connection
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: (await supabase.auth.admin.listUsers()).data.users[0]?.id,
        type: 'system',
        title: 'WhatsApp Connected',
        summary: 'Successfully connected WhatsApp Business account',
        status: 'completed',
        direction: 'internal',
      });

    // Redirect back to app with success
    return new Response(
      `<html>
        <body>
          <h1>Success!</h1>
          <p>WhatsApp connected successfully. You can close this window.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in whatsapp-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});
