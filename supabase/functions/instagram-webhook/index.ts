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

      const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_VERIFY_TOKEN');

      console.log('Webhook verification attempt:', { mode, tokenProvided: !!token, challengeProvided: !!challenge });

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.log('Webhook verification failed - token mismatch');
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

                // Input validation
                if (!senderId || !recipientId) {
                  console.error('Missing sender or recipient ID');
                  continue;
                }

                // Validate message text (Instagram has 1000 character limit for messages)
                if (messageText.length > 1000) {
                  console.error('Message too long:', messageText.length);
                  continue;
                }

                console.log('Incoming Instagram DM:', {
                  from: senderId,
                  to: recipientId,
                  text: messageText.substring(0, 100),
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

                // Get clinic info and custom prompt
                const { data: clinic } = await supabase
                  .from('clinics')
                  .select('name, phone, email, address, assistant_prompt')
                  .eq('id', integration.clinic_id)
                  .single();

                // Get clinic knowledge base for context
                const { data: knowledgeBase } = await supabase
                  .from('clinic_knowledge_base')
                  .select('content, title')
                  .eq('clinic_id', integration.clinic_id);

                const context = knowledgeBase
                  ?.map(kb => `${kb.title}: ${kb.content}`)
                  .join('\n\n') || '';

                // Build system prompt with custom instructions
                const basePrompt = clinic?.assistant_prompt || `You are a helpful AI assistant for ${clinic?.name || 'a clinic'}.`;
                const systemPrompt = `${basePrompt}

You are responding via Instagram DM, so be friendly, professional, and concise.

Clinic Information:
- Name: ${clinic?.name}
- Phone: ${clinic?.phone}
- Email: ${clinic?.email}
- Address: ${clinic?.address}

Knowledge Base:
${context || 'No additional information available.'}

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

                console.log('AI response generated:', replyText.substring(0, 100));

                // Deduct credits for AI response
                try {
                  const { data: userData } = await supabase.auth.admin.listUsers();
                  const firstUser = userData?.users?.[0];
                  
                  if (firstUser) {
                    await supabase.rpc('deduct_credits_atomic', {
                      p_clinic_id: integration.clinic_id,
                      p_user_id: firstUser.id,
                      p_action_type: 'AI_INSTAGRAM_RESPONSE',
                      p_credits_amount: 1,
                      p_related_log_id: log.id,
                    });
                    console.log('Credits deducted for AI Instagram response');
                  }
                } catch (creditError) {
                  console.error('Error deducting credits:', creditError);
                  // Don't fail the request if credit deduction fails
                }

                if (isAutoPilot) {
                  // Send message immediately via Instagram Graph API
                  const { data: integrationData, error: integrationError } = await supabase
                    .from('clinic_integrations')
                    .select('access_token')
                    .eq('clinic_id', integration.clinic_id)
                    .eq('integration_type', 'instagram')
                    .single();

                  if (integrationError || !integrationData?.access_token) {
                    console.error('Failed to retrieve access token:', integrationError);
                    
                    // Save as draft if token retrieval fails
                    await supabase
                      .from('draft_replies')
                      .insert({
                        log_id: log.id,
                        user_id: log.user_id,
                        clinic_id: integration.clinic_id,
                        draft_content: replyText,
                        status: 'pending',
                      });
                    
                    continue;
                  }

                  try {
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

                    if (!sendResponse.ok) {
                      const errorData = await sendResponse.json();
                      console.error('Instagram API error:', errorData);
                      throw new Error(errorData.error?.message || 'Failed to send message');
                    }

                    const sendData = await sendResponse.json();
                    console.log('Instagram message sent:', sendData);

                    // Log outbound message
                    await supabase
                      .from('activity_logs')
                      .insert({
                        clinic_id: integration.clinic_id,
                        user_id: log.user_id,
                        type: 'instagram',
                        title: `Instagram DM to ${senderId}`,
                        summary: replyText,
                        contact_name: senderId,
                        contact_info: senderId,
                        direction: 'outbound',
                        status: 'auto-replied',
                      });

                    // Update inbound log status
                    await supabase
                      .from('activity_logs')
                      .update({ status: 'completed' })
                      .eq('id', log.id);
                  } catch (sendError) {
                    console.error('Error sending Instagram message:', sendError);
                    
                    // Save as draft if sending fails
                    await supabase
                      .from('draft_replies')
                      .insert({
                        log_id: log.id,
                        user_id: log.user_id,
                        clinic_id: integration.clinic_id,
                        draft_content: replyText,
                        status: 'pending',
                      });
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
