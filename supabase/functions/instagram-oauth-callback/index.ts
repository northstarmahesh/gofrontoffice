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

    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Meta credentials not configured');
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;

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

    // Get user's pages and Instagram accounts
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    console.log('Pages data:', pagesData);

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Store integration for each page with Instagram account
    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        // Get Instagram account connected to this page
        const igResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igResponse.json();

        if (igData.instagram_business_account) {
          const igAccountId = igData.instagram_business_account.id;
          
          // Store in clinic_integrations
          const { error: dbError } = await supabase
            .from('clinic_integrations')
            .upsert({
              clinic_id: clinicId,
              location_id: locationId || null,
              integration_type: 'instagram',
              is_connected: true,
              access_token: page.access_token,
              token_expiry: null, // Page tokens don't expire if properly configured
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'clinic_id,integration_type',
            });

          if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
          }

          console.log('Instagram integration saved for page:', page.name, 'IG Account:', igAccountId);
        }
      }
    }

    // Redirect back to app with success
    return new Response(
      `<html>
        <body>
          <h1>Success!</h1>
          <p>Instagram connected successfully. You can close this window.</p>
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
    console.error('Error in instagram-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});
