import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const url = new URL(req.url);
    const conversation_uuid = url.searchParams.get('conversation_uuid');
    const clinic_id = url.searchParams.get('clinic_id');
    
    console.log('Recording webhook received:', {
      conversation_uuid,
      clinic_id,
      recording_url: body.recording_url,
      start_time: body.start_time,
      end_time: body.end_time,
      duration: body.duration,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If we have a recording URL, update the activity log
    if (body.recording_url && conversation_uuid && clinic_id) {
      // Find the activity log for this conversation
      const { data: activityLog, error: findError } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('clinic_id', clinic_id)
        .ilike('summary', `%${conversation_uuid}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error('Error finding activity log:', findError);
      } else if (activityLog) {
        // Update the activity log with the recording URL
        const { error: updateError } = await supabase
          .from('activity_logs')
          .update({
            recording_url: body.recording_url,
            duration: body.duration ? `${body.duration}s` : null,
            status: 'completed',
          })
          .eq('id', activityLog.id);

        if (updateError) {
          console.error('Error updating activity log:', updateError);
        } else {
          console.log('Successfully updated activity log with recording URL');
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
