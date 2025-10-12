import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL')!,
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!
);

Deno.test("Vonage Voice Recording Webhook - stores recording URL", async () => {
  // First, create a test activity log
  const testConversationUuid = `test-conv-${Date.now()}`;
  const testClinicId = "test-clinic-id"; // This should be a valid clinic ID from test data

  const { data: log, error: logError } = await supabase
    .from('activity_logs')
    .insert({
      clinic_id: testClinicId,
      user_id: (await supabase.auth.getUser()).data.user!.id,
      type: 'call',
      title: 'Test Call',
      summary: `Call received - UUID: ${testConversationUuid}`,
      status: 'pending',
      contact_name: '+46701234567',
      contact_info: '+46701234567',
      direction: 'inbound',
    })
    .select()
    .single();

  assertExists(log, "Should create test activity log");

  // Now send recording webhook
  const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-voice-recording?conversation_uuid=${testConversationUuid}&clinic_id=${testClinicId}`;
  
  const mockRecordingPayload = {
    recording_url: "https://api.nexmo.com/v1/files/test-recording-123.mp3",
    start_time: "2025-10-12T10:00:00Z",
    end_time: "2025-10-12T10:05:30Z",
    duration: 330,
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockRecordingPayload),
  });

  assertEquals(response.status, 200);
  const result = await response.json();
  assertEquals(result.success, true);

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Verify the activity log was updated with recording URL
  const { data: updatedLog } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('id', log!.id)
    .single();

  assertExists(updatedLog);
  assertEquals(updatedLog!.recording_url, mockRecordingPayload.recording_url);
  assertEquals(updatedLog!.duration, "330s");
  assertEquals(updatedLog!.status, "completed");
});

Deno.test("Vonage Voice Recording Webhook - handles missing parameters", async () => {
  const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-voice-recording`;
  
  const mockRecordingPayload = {
    recording_url: "https://api.nexmo.com/v1/files/test-recording-456.mp3",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockRecordingPayload),
  });

  // Should still return 200 even without query params
  assertEquals(response.status, 200);
});

Deno.test("Vonage Voice Recording Webhook - handles non-existent conversation", async () => {
  const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-voice-recording?conversation_uuid=non-existent-uuid&clinic_id=test-clinic`;
  
  const mockRecordingPayload = {
    recording_url: "https://api.nexmo.com/v1/files/test-recording-789.mp3",
    duration: 120,
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockRecordingPayload),
  });

  // Should return 200 and log warning
  assertEquals(response.status, 200);
});
