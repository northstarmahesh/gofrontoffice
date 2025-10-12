import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-sms-webhook`;
const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL')!,
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!
);

Deno.test("Vonage SMS Webhook - processes incoming SMS", async () => {
  const mockSmsPayload = {
    from: "46701234567",
    to: "46707654321",
    text: "Hello, I would like to book an appointment",
    messageId: "test-message-id-123",
    type: "text",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockSmsPayload),
  });

  assertEquals(response.status, 200);
  const result = await response.json();
  assertExists(result);
});

Deno.test("Vonage SMS Webhook - creates activity log", async () => {
  const testPhone = "+46701234567";
  const mockSmsPayload = {
    from: testPhone,
    to: "+46707654321",
    text: "Test message for activity log",
    messageId: `test-log-${Date.now()}`,
    type: "text",
  };

  // Send SMS
  await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockSmsPayload),
  });

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if activity log was created
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('contact_info', testPhone)
    .eq('type', 'sms')
    .order('created_at', { ascending: false })
    .limit(1);

  assertExists(logs);
  assertEquals(logs!.length > 0, true, "Should create activity log");
});

Deno.test("Vonage SMS Webhook - handles AI mode (autopilot vs copilot)", async () => {
  const mockSmsPayload = {
    from: "46701234567",
    to: "46707654321",
    text: "What are your opening hours?",
    messageId: `test-ai-mode-${Date.now()}`,
    type: "text",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockSmsPayload),
  });

  assertEquals(response.status, 200);
  
  // The function should process differently based on auto_pilot_enabled setting
  // In autopilot: sends response immediately
  // In copilot: saves as draft in draft_replies table
});

Deno.test("Vonage SMS Webhook - handles unconfigured number", async () => {
  const mockSmsPayload = {
    from: "46701234567",
    to: "46709999999", // Unconfigured number
    text: "Test message",
    messageId: "test-unconfigured-123",
    type: "text",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockSmsPayload),
  });

  // Should still return 200 but log an error
  assertEquals(response.status, 200);
});
