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
    const { recording_url, activity_log_id, is_voicemail } = await req.json();
    
    console.log('Processing transcription:', {
      recording_url,
      activity_log_id,
      is_voicemail,
    });

    if (!recording_url || !activity_log_id) {
      throw new Error('Missing required parameters: recording_url and activity_log_id');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Download the recording from Vonage
    console.log('Downloading recording from:', recording_url);
    const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
    const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');
    
    const authHeader = `Basic ${btoa(`${vonageApiKey}:${vonageApiSecret}`)}`;
    
    const audioResponse = await fetch(recording_url, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download recording: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('Downloaded audio blob, size:', audioBlob.size);

    // Send to OpenAI Whisper for transcription
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'sv'); // Swedish
    formData.append('response_format', 'json');

    console.log('Sending to Whisper API...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API failed: ${whisperResponse.status} ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text;
    
    console.log('Transcription received, length:', transcript.length);

    // Update activity log with transcript
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current activity log to preserve duration info
    const { data: activityLog, error: fetchError } = await supabase
      .from('activity_logs')
      .select('duration, contact_info, contact_name')
      .eq('id', activity_log_id)
      .single();

    if (fetchError) {
      console.error('Error fetching activity log:', fetchError);
      throw fetchError;
    }

    const duration = activityLog.duration || 'unknown duration';
    
    // Format summary based on whether it's a voicemail or conversation
    const summaryText = is_voicemail
      ? `Voicemail (${duration}):\n\n"${transcript}"`
      : `Conversation (${duration}):\n\n${transcript}`;

    const { error: updateError } = await supabase
      .from('activity_logs')
      .update({
        summary: summaryText,
      })
      .eq('id', activity_log_id);

    if (updateError) {
      console.error('Error updating activity log:', updateError);
      throw updateError;
    }

    console.log('Successfully updated activity log with transcript');

    // Update related task with transcript
    const { data: tasks, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id, description')
      .eq('related_log_id', activity_log_id);

    if (!taskFetchError && tasks && tasks.length > 0) {
      const task = tasks[0];
      const newDescription = is_voicemail 
        ? `Voicemail recorded (${duration}).\n\nTranscript:\n"${transcript}"`
        : `Conversation recorded (${duration}).\n\nFull transcript:\n${transcript}`;
      
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
          description: newDescription,
        })
        .eq('id', task.id);

      if (taskUpdateError) {
        console.error('Error updating task:', taskUpdateError);
      } else {
        console.log('Successfully updated task with transcript');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      transcript,
      activity_log_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in transcription processing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
