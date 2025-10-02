import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Incoming Twilio webhook request');
    
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('SMS from:', from, 'Body:', body);

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the first user's settings (for demo purposes - in production, map phone numbers to users)
    const { data: settings, error: settingsError } = await supabase
      .from('assistant_settings')
      .select('*, profiles(id, email)')
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('Failed to fetch settings:', settingsError);
      return new Response('Settings not found', { status: 404 });
    }

    const userId = settings.profiles.id;
    const isAutoPilot = settings.auto_pilot_enabled;
    const phoneMode = settings.phone_mode;

    // Log the incoming message
    const { data: log, error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        type: 'sms',
        title: 'Incoming SMS',
        contact_name: from,
        contact_info: from,
        summary: body,
        status: isAutoPilot ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create activity log:', logError);
    }

    // If phone mode is off, don't process further
    if (phoneMode === 'off') {
      console.log('Phone mode is off, ignoring message');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Use AI to analyze the message and generate a response
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    
    // Customize this system prompt with your clinic's specific information
    const systemPrompt = `You are a professional medical clinic assistant for [YOUR CLINIC NAME].

CLINIC INFORMATION:
- Address: [Your clinic address]
- Phone: [Your phone number]
- Hours: Mon-Fri 9am-5pm, Sat 10am-2pm
- Services: Physiotherapy, Chiropractic, Massage Therapy, Acupuncture

AVAILABLE SLOTS THIS WEEK:
- Tuesday: 10am, 2pm, 4pm
- Wednesday: 9am, 1pm, 3pm
- Friday: 11am, 2pm, 5pm

COMMON QUESTIONS:
- Insurance: We accept most major insurance plans
- First visit: Bring ID, insurance card, and arrive 10 minutes early
- Cancellations: Please provide 24 hours notice

RESPONSE GUIDELINES:
- Be warm, professional, and concise
- Keep responses under 160 characters when possible for SMS
- For appointments: offer specific available times
- For emergencies: direct to call clinic immediately
- For complex questions: invite them to call for detailed discussion
- Always include your name at the end: "- [Clinic Name]"`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `SMS from ${from}: ${body}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate AI response');
    }

    const aiData = await aiResponse.json();
    const generatedResponse = aiData.choices[0].message.content;

    console.log('AI generated response:', generatedResponse);

    // If auto-pilot is enabled, send the response immediately
    if (isAutoPilot && phoneMode === 'on') {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: from,
            Body: generatedResponse,
          }),
        }
      );

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        console.error('Failed to send SMS:', errorText);
      } else {
        console.log('SMS sent successfully');
        
        // Update activity log with the sent response
        if (log) {
          await supabase
            .from('activity_logs')
            .update({ 
              actions: [{ type: 'sms_sent', content: generatedResponse }],
              status: 'completed'
            })
            .eq('id', log.id);
        }
      }

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    } else {
      // Co-pilot mode: create a draft reply
      if (log) {
        await supabase
          .from('draft_replies')
          .insert({
            user_id: userId,
            log_id: log.id,
            draft_content: generatedResponse,
            status: 'pending',
          });

        console.log('Draft reply created for manual review');
      }

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
