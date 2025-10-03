import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Use a verify token (you should set this in Meta App webhook settings)
      const VERIFY_TOKEN = 'instagram_webhook_verify_token_2024';

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new Response(challenge, { status: 200 });
      } else {
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Handle webhook events (POST request)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Process messaging events
      if (body.entry) {
        for (const entry of body.entry) {
          if (entry.messaging) {
            for (const event of entry.messaging) {
              // Handle incoming messages
              if (event.message && !event.message.is_echo) {
                const senderId = event.sender.id;
                const recipientId = event.recipient.id;
                const messageText = event.message.text || '';
                const messageId = event.message.mid;

                console.log('Incoming Instagram DM:', {
                  from: senderId,
                  to: recipientId,
                  text: messageText,
                  messageId
                });

                // Find which clinic this Instagram account belongs to
                const { data: integration } = await supabase
                  .from('clinic_integrations')
                  .select('clinic_id, location_id')
                  .eq('integration_type', 'instagram')
                  .eq('is_connected', true)
                  .single();

                if (!integration) {
                  console.error('No integration found for recipient:', recipientId);
                  continue;
                }

                // Get assistant settings
                const { data: settings } = await supabase
                  .from('assistant_settings')
                  .select('*')
                  .eq('location_id', integration.location_id)
                  .single();

                const isAutoPilot = settings?.auto_pilot_enabled ?? true;
                const isInstagramEnabled = settings?.instagram_enabled ?? false;

                if (!isInstagramEnabled) {
                  console.log('Instagram messaging is disabled for this location');
                  continue;
                }

                // Create activity log
                const { data: log, error: logError } = await supabase
                  .from('activity_logs')
                  .insert({
                    clinic_id: integration.clinic_id,
                    user_id: (await supabase.auth.admin.listUsers()).data.users[0]?.id, // First user for now
                    type: 'message',
                    title: `Instagram DM from ${senderId}`,
                    summary: messageText,
                    contact_name: senderId,
                    contact_info: senderId,
                    direction: 'inbound',
                    status: 'pending',
                  })
                  .select()
                  .single();

                if (logError) {
                  console.error('Error creating activity log:', logError);
                  continue;
                }

                // Get clinic knowledge base for context
                const { data: knowledgeBase } = await supabase
                  .from('clinic_knowledge_base')
                  .select('content, title')
                  .eq('clinic_id', integration.clinic_id);

                const context = knowledgeBase
                  ?.map(kb => `${kb.title}: ${kb.content}`)
                  .join('\n\n') || '';

                // Generate AI response
                const systemPrompt = `You are a helpful AI assistant for a medical clinic responding to Instagram direct messages. 
Be friendly, professional, and concise. Use the following clinic information to answer questions:

${context}

Keep responses brief and suitable for Instagram DM format.`;

                const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: messageText }
                    ],
                  }),
                });

                const aiData = await aiResponse.json();
                const replyText = aiData.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

                if (isAutoPilot) {
                  // Send message immediately via Instagram Graph API
                  const { data: integrationData } = await supabase
                    .from('clinic_integrations')
                    .select('access_token')
                    .eq('clinic_id', integration.clinic_id)
                    .eq('integration_type', 'instagram')
                    .single();

                  if (integrationData?.access_token) {
                    const sendResponse = await fetch(
                      `https://graph.facebook.com/v18.0/${recipientId}/messages`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          recipient: { id: senderId },
                          message: { text: replyText },
                          access_token: integrationData.access_token,
                        }),
                      }
                    );

                    const sendData = await sendResponse.json();
                    console.log('Instagram message sent:', sendData);

                    // Update activity log
                    await supabase
                      .from('activity_logs')
                      .update({ status: 'completed' })
                      .eq('id', log.id);
                  }
                } else {
                  // Co-pilot mode: save as draft
                  await supabase
                    .from('draft_replies')
                    .insert({
                      log_id: log.id,
                      user_id: log.user_id,
                      clinic_id: integration.clinic_id,
                      draft_content: replyText,
                      status: 'pending',
                    });

                  console.log('Draft reply created for co-pilot mode');
                }
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Error in instagram-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
