import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { normalizePhoneNumber } from "../_shared/phone-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Extract conversation_uuid from body (Vonage always sends it)
    const conversation_uuid = body.conversation_uuid;
    
    console.log('Recording webhook received:', {
      conversation_uuid,
      recording_url: body.recording_url,
      transcript: body.transcript,
      start_time: body.start_time,
      end_time: body.end_time,
      duration: body.duration,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If we have a recording URL and conversation_uuid, update the activity log
    if (body.recording_url && conversation_uuid) {
      // Find the activity log for this conversation using conversation_uuid in summary
      const { data: activityLog, error: findError } = await supabase
        .from('activity_logs')
        .select('id, user_id, clinic_id, contact_info')
        .ilike('summary', `%${conversation_uuid}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error('Error finding activity log:', findError);
      } else if (activityLog) {
        const transcriptText = body.transcript?.text || body.transcript || 'No transcript available';
        const normalizedFrom = normalizePhoneNumber(activityLog.contact_info);
        
        // Update the activity log with the recording URL and transcript
        const { error: updateError } = await supabase
          .from('activity_logs')
          .update({
            recording_url: body.recording_url,
            duration: body.duration ? `${body.duration}s` : null,
            status: 'completed',
            summary: `Voicemail received - ${transcriptText.substring(0, 100)}${transcriptText.length > 100 ? '...' : ''}`,
          })
          .eq('id', activityLog.id);

        if (updateError) {
          console.error('Error updating activity log:', updateError);
        } else {
          console.log('Successfully updated activity log with recording and transcript');
          
          // Create a task for the voicemail
          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: activityLog.user_id,
              clinic_id: activityLog.clinic_id,
              title: `Review voicemail from ${normalizedFrom || 'Unknown'}`,
              description: `Voicemail transcript: ${transcriptText}`,
              status: 'pending',
              priority: 'high',
              source: 'call',
              related_log_id: activityLog.id
            });

          if (taskError) {
            console.error('Error creating task:', taskError);
          } else {
            console.log('Successfully created task for voicemail');
          }
        }
      } else {
        console.warn('No activity log found for conversation:', conversation_uuid);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in recording webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
