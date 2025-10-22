import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-elevenlabs-signature',
};

interface TranscriptTurn {
  role: 'user' | 'agent';
  message: string;
  time_in_call_secs: number; // ElevenLabs uses this field name
}

interface ElevenLabsWebhookPayload {
  type: string;
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    user_id?: string | null;
    transcript: TranscriptTurn[];
    metadata: {
      start_time_unix_secs?: number;
      accepted_time_unix_secs?: number;
      call_duration_secs?: number; // ElevenLabs uses this field name
      cost?: number;
      authorization_method?: string;
    };
    call_recording_url?: string | null;
    recording_signed_url?: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received Eleven Labs post-call webhook');
    
    // Get webhook secret
    const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.warn('ELEVENLABS_WEBHOOK_SECRET not configured, skipping signature verification');
    }

    // Get signature from header
    const signature = req.headers.get('x-elevenlabs-signature');
    
    // Read body as text for signature verification
    const body = await req.text();
    console.log('Webhook payload received, size:', body.length);

    // Verify HMAC signature if secret is configured
    if (webhookSecret && signature) {
      console.log('Verifying HMAC signature');
      const isValid = await verifySignature(signature, body, webhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
      console.log('Signature verified successfully');
    } else {
      console.log('Skipping signature verification (secret or signature missing)');
    }

    // Parse payload
    const rawPayload: ElevenLabsWebhookPayload = JSON.parse(body);
    
    // Extract data from ElevenLabs webhook structure
    const payload = rawPayload.data;
    
    console.log('ElevenLabs webhook processed:', {
      type: rawPayload.type,
      agent_id: payload.agent_id,
      conversation_id: payload.conversation_id,
      status: payload.status,
      transcript_length: payload.transcript?.length,
      call_duration_secs: payload.metadata?.call_duration_secs
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find clinic by agent_id
    console.log('Finding clinic by agent_id:', payload.agent_id);
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('elevenlabs_agent_id', payload.agent_id)
      .maybeSingle();

    if (clinicError) {
      console.error('Error finding clinic:', clinicError);
      throw new Error(`Failed to find clinic: ${clinicError.message}`);
    }

    if (!clinic) {
      console.warn('No clinic found for agent_id:', payload.agent_id);
      // Still return 200 to prevent retries
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No clinic found for agent_id, webhook acknowledged'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log('Found clinic:', clinic.name);

    // Format transcript
    const formattedTranscript = formatTranscript(payload.transcript || []);
    const summary = formattedTranscript.substring(0, 500);

    // Phone number is NOT in ElevenLabs payload - we'll get it from activity_log
    let phoneNumber: string | null = null;

    // Find existing activity log by conversation_id in summary field
    console.log('Looking for existing activity log with conversation_id:', payload.conversation_id);
    const { data: existingLog, error: logSearchError } = await supabase
      .from('activity_logs')
      .select('id, user_id, contact_info')
      .eq('clinic_id', clinic.id)
      .ilike('summary', `%${payload.conversation_id}%`)
      .maybeSingle();

    if (logSearchError) {
      console.error('Error searching for activity log:', logSearchError);
    }

    let activityLogId: string;
    let userId: string;

    if (existingLog) {
      console.log('Found existing activity log:', existingLog.id);
      activityLogId = existingLog.id;
      userId = existingLog.user_id;

      // Update existing activity log
      const { error: updateError } = await supabase
        .from('activity_logs')
        .update({
          summary: formattedTranscript,
          status: 'completed',
          duration: payload.metadata?.call_duration_secs 
            ? `${payload.metadata.call_duration_secs}s` 
            : null,
          conversation_id: payload.conversation_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityLogId);

      if (updateError) {
        console.error('Failed to update activity log:', updateError);
      }
    } else {
      console.log('Creating new activity log');
      
      // Get first clinic user as fallback
      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('user_id')
        .eq('clinic_id', clinic.id)
        .limit(1)
        .maybeSingle();

      userId = clinicUser?.user_id || '';

      // Create new activity log
      const { data: newLog, error: createError } = await supabase
        .from('activity_logs')
        .insert({
          clinic_id: clinic.id,
          user_id: userId,
          type: 'call',
          title: `Call - ${payload.conversation_id}`,
          summary: formattedTranscript,
          contact_info: phoneNumber || 'Unknown',
          contact_name: 'Caller',
          status: 'completed',
          direction: 'inbound',
          duration: payload.metadata?.call_duration_secs 
            ? `${payload.metadata.call_duration_secs}s` 
            : null,
          conversation_id: payload.conversation_id
        })
        .select('id')
        .single();

      if (createError || !newLog) {
        console.error('Failed to create activity log:', createError);
        throw new Error(`Failed to create activity log: ${createError?.message}`);
      }

      activityLogId = newLog.id;
    }

    // Save to elevenlabs_call_logs
    console.log('Saving to elevenlabs_call_logs');
    const { error: callLogError } = await supabase
      .from('elevenlabs_call_logs')
      .insert({
        clinic_id: clinic.id,
        conversation_id: payload.conversation_id,
        transcript: payload.transcript || [],
        metadata: payload.metadata || {},
        duration_seconds: payload.metadata?.call_duration_secs || null,
        call_direction: 'inbound'
      });

    if (callLogError) {
      console.error('Failed to save call log:', callLogError);
      // Don't throw - we still want to return 200
    }

    // Check if we need to create a task (co-pilot mode)
    console.log('Checking assistant settings for co-pilot mode');
    const { data: settings } = await supabase
      .from('assistant_settings')
      .select('auto_pilot_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const isAutoPilot = settings?.auto_pilot_enabled !== false;
    console.log('Auto-pilot enabled:', isAutoPilot);

    if (!isAutoPilot) {
      console.log('Creating task for co-pilot mode');
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          clinic_id: clinic.id,
          title: `Review call from ${phoneNumber || 'caller'}`,
          description: `AI conversation completed. Review transcript and take action if needed.\n\n${summary}`,
          status: 'pending',
          priority: 'medium',
          source: 'call',
          related_log_id: activityLogId
        });

      if (taskError) {
        console.error('Failed to create task:', taskError);
        // Don't throw - still return 200
      } else {
        console.log('Task created successfully');
      }
    }

    console.log('Webhook processed successfully');

    // CRITICAL: Return 200 OK to prevent retries
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        activity_log_id: activityLogId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // CRITICAL: Still return 200 to prevent retries for unrecoverable errors
    // Only return 500 for temporary issues
    const isTemporaryError = error.message?.includes('timeout') || 
                            error.message?.includes('network') ||
                            error.message?.includes('ECONNREFUSED');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isTemporaryError ? 500 : 200 // Return 200 for permanent errors
      }
    );
  }
});

async function verifySignature(
  signature: string, 
  body: string, 
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureData = hexToBytes(signature);
    const bodyData = encoder.encode(body);

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureData,
      bodyData
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function formatTranscript(transcript: TranscriptTurn[]): string {
  if (!transcript || transcript.length === 0) {
    return 'No transcript available';
  }

  return transcript
    .map(turn => {
      // ElevenLabs uses time_in_call_secs (seconds from start of call)
      const minutes = Math.floor(turn.time_in_call_secs / 60);
      const seconds = turn.time_in_call_secs % 60;
      const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const speaker = turn.role === 'user' ? 'Patient' : 'AI Assistent';
      return `[${timestamp}] ${speaker}: ${turn.message}`;
    })
    .join('\n\n');
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If starts with 00, replace with +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  }
  
  // If doesn't start with +, assume Swedish number
  if (!normalized.startsWith('+')) {
    // Remove leading 0 if present
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }
    normalized = '+46' + normalized;
  }
  
  return normalized;
}
