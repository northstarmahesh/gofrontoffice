import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateAiResponse } from "../_shared/ai-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const VERIFY_TOKEN = Deno.env.get('MESSENGER_VERIFY_TOKEN');

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Messenger webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.error('Messenger webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Handle POST request for incoming messages
    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Messenger webhook received:', JSON.stringify(payload, null, 2));

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Process each entry
      for (const entry of payload.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            const senderId = messaging.sender.id;
            const recipientId = messaging.recipient.id;
            const messageText = messaging.message.text;
            const timestamp = messaging.timestamp;

            console.log('Processing Messenger message:', {
              senderId,
              recipientId,
              messageText,
              timestamp
            });

            // Get clinic integration to find which clinic this message belongs to
            const { data: integration } = await supabase
              .from('clinic_integrations')
              .select('clinic_id, location_id, access_token')
              .eq('integration_type', 'messenger')
              .eq('is_connected', true)
              .single();

            if (!integration) {
              console.log('No connected Messenger integration found');
              continue;
            }

            // Get assistant settings
            const { data: settings } = await supabase
              .from('assistant_settings')
              .select('*')
              .eq('location_id', integration.location_id)
              .single();

            if (!settings || !settings.messenger_enabled) {
              console.log('Messenger is not enabled for this location');
              continue;
            }

            // Create activity log
            const { data: activityLog, error: logError } = await supabase
              .from('activity_logs')
              .insert({
                user_id: integration.clinic_id,
                clinic_id: integration.clinic_id,
                type: 'messenger',
                title: `New Messenger message from ${senderId}`,
                summary: messageText,
                status: settings.auto_pilot_enabled ? 'completed' : 'draft',
                contact_info: senderId,
                direction: 'inbound'
              })
              .select()
              .single();

            if (logError) {
              console.error('Error creating activity log:', logError);
              continue;
            }

            // Get clinic info and custom prompt
            const { data: clinic } = await supabase
              .from('clinics')
              .select('name, phone, email, address, assistant_prompt')
              .eq('clinic_id', integration.clinic_id)
              .single();

            // Get clinic knowledge base for context
            const { data: knowledgeBase } = await supabase
              .from('clinic_knowledge_base')
              .select('content, title')
              .eq('clinic_id', integration.clinic_id);

            const knowledgeContext = knowledgeBase
              ?.map(kb => `${kb.title}: ${kb.content}`)
              .join('\n\n') || 'No additional knowledge available.';

            // Generate AI response using shared service
            const { responseText: aiMessage } = await generateAiResponse({
              messageText,
              clinic: clinic || {},
              knowledgeBase: knowledgeContext,
              channelType: 'messenger'
            });

            if (settings.auto_pilot_enabled) {
              // Send response via Messenger Send API
              const META_PAGE_ACCESS_TOKEN = integration.access_token;
              
              const sendResponse = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${META_PAGE_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  recipient: { id: senderId },
                  message: { text: aiMessage }
                })
              });

              if (sendResponse.ok) {
                console.log('Messenger message sent successfully');
                await supabase
                  .from('activity_logs')
                  .update({ status: 'completed' })
                  .eq('id', activityLog.id);
              } else {
                console.error('Failed to send Messenger message:', await sendResponse.text());
              }
            } else {
              // Co-pilot mode: Save as draft
              const { data: clinicUsers } = await supabase
                .from('clinic_users')
                .select('user_id')
                .eq('clinic_id', integration.clinic_id)
                .limit(1)
                .single();

              if (clinicUsers) {
                await supabase
                  .from('draft_replies')
                  .insert({
                    user_id: clinicUsers.user_id,
                    clinic_id: integration.clinic_id,
                    log_id: activityLog.id,
                    draft_content: aiMessage,
                    status: 'pending'
                  });

                console.log('Draft reply created for review');
              }
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200, headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('Messenger webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
