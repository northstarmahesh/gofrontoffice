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
    console.log('=== VONAGE VOICE EVENT RECEIVED ===');
    console.log('Event body:', JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      conversation_uuid,
      status,
      from,
      to,
      timestamp,
      direction,
      duration,
      end_time,
      start_time,
    } = body;

    console.log('Call event details:', {
      conversation_uuid,
      status,
      from,
      to,
      direction,
      duration
    });

    // Normalize phone numbers
    const normalizedTo = normalizePhoneNumber(to);
    const normalizedFrom = normalizePhoneNumber(from);

    // Find the activity log by conversation_uuid in the title or by phone numbers
    const { data: existingLog, error: findError } = await supabase
      .from('activity_logs')
      .select('*')
      .or(`title.ilike.%${conversation_uuid?.slice(0, 8)}%,and(contact_info.eq.${normalizedFrom},type.eq.call)`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error finding activity log:', findError);
    }

    // Update or create activity log based on call status
    if (existingLog) {
      const updateData: any = {};

      // Map Vonage status to our status
      if (status === 'completed') {
        updateData.status = 'completed';
        if (duration) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          updateData.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      } else if (status === 'answered') {
        updateData.status = 'in_progress';
      } else if (status === 'unanswered' || status === 'failed' || status === 'rejected' || status === 'busy') {
        updateData.status = 'failed';
        updateData.summary = `Call ${status}${body.reason ? ': ' + body.reason : ''}`;
      }

      console.log('Updating activity log:', existingLog.id, updateData);

      const { error: updateError } = await supabase
        .from('activity_logs')
        .update(updateData)
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('Error updating activity log:', updateError);
      } else {
        console.log('Activity log updated successfully');
      }
    } else {
      console.log('No matching activity log found for event');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in voice events webhook:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 200, // Return 200 to prevent retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
