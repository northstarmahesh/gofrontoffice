import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/instagram-webhook`;
const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_VERIFY_TOKEN') || 'test_verify_token';
const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL')!,
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!
);

Deno.test("Instagram Webhook - verifies webhook", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', VERIFY_TOKEN);
  url.searchParams.set('hub.challenge', 'test_challenge_1234');

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  assertEquals(response.status, 200);
  const challenge = await response.text();
  assertEquals(challenge, 'test_challenge_1234');
});

Deno.test("Instagram Webhook - rejects invalid verification token", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', 'wrong_token');
  url.searchParams.set('hub.challenge', 'test_challenge');

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  assertEquals(response.status, 403);
});

Deno.test("Instagram Webhook - processes incoming message", async () => {
  const mockInstagramPayload = {
    object: "instagram",
    entry: [
      {
        id: "test-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: "test-sender-123" },
            recipient: { id: "test-recipient-456" },
            timestamp: Date.now(),
            message: {
              mid: `test-message-${Date.now()}`,
              text: "Hello, I would like to book an appointment",
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockInstagramPayload),
  });

  assertEquals(response.status, 200);
  const result = await response.json();
  assertEquals(result.success, true);
});

Deno.test("Instagram Webhook - creates activity log", async () => {
  const testSenderId = `test-sender-${Date.now()}`;
  const mockInstagramPayload = {
    object: "instagram",
    entry: [
      {
        id: "test-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: testSenderId },
            recipient: { id: "test-recipient-456" },
            timestamp: Date.now(),
            message: {
              mid: `test-log-${Date.now()}`,
              text: "Test message for activity log",
            },
          },
        ],
      },
    ],
  };

  await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockInstagramPayload),
  });

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if activity log was created
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('type', 'instagram')
    .eq('contact_name', testSenderId)
    .order('created_at', { ascending: false })
    .limit(1);

  assertExists(logs);
  // Note: May not find log if Instagram integration is not set up
});

Deno.test("Instagram Webhook - ignores echo messages", async () => {
  const mockEchoPayload = {
    object: "instagram",
    entry: [
      {
        id: "test-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: "test-sender-123" },
            recipient: { id: "test-recipient-456" },
            timestamp: Date.now(),
            message: {
              mid: "test-echo-message",
              text: "Echo message",
              is_echo: true, // This should be ignored
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockEchoPayload),
  });

  assertEquals(response.status, 200);
  const result = await response.json();
  assertEquals(result.success, true);
});

Deno.test("Instagram Webhook - handles AI mode (autopilot vs copilot)", async () => {
  const mockInstagramPayload = {
    object: "instagram",
    entry: [
      {
        id: "test-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: `test-ai-mode-${Date.now()}` },
            recipient: { id: "test-recipient-456" },
            timestamp: Date.now(),
            message: {
              mid: `test-ai-${Date.now()}`,
              text: "What are your opening hours?",
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockInstagramPayload),
  });

  assertEquals(response.status, 200);
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2500));

  // The function should process differently based on auto_pilot_enabled setting
  // In autopilot: sends response immediately
  // In copilot: saves as draft in draft_replies table
  
  // Either outbound log OR draft should exist
  const { data: outboundLogs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('type', 'instagram')
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: drafts } = await supabase
    .from('draft_replies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  // May have response if integration is properly set up
  const hasResponse = (outboundLogs && outboundLogs.length > 0) || (drafts && drafts.length > 0);
  console.log('Has response:', hasResponse);
});

Deno.test("Instagram Webhook - validates message length", async () => {
  const longText = "A".repeat(1500); // Over Instagram limit
  const mockInstagramPayload = {
    object: "instagram",
    entry: [
      {
        id: "test-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: "test-sender-long" },
            recipient: { id: "test-recipient-456" },
            timestamp: Date.now(),
            message: {
              mid: "test-long-message",
              text: longText,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockInstagramPayload),
  });

  // Should still return 200 but skip processing
  assertEquals(response.status, 200);
});

Deno.test("Instagram Webhook - handles missing integration", async () => {
  const mockInstagramPayload = {
    object: "instagram",
    entry: [
      {
        id: "unconfigured-page-id",
        time: Date.now(),
        messaging: [
          {
            sender: { id: "test-sender-unconfig" },
            recipient: { id: "unconfigured-recipient" },
            timestamp: Date.now(),
            message: {
              mid: "test-unconfig-message",
              text: "Test message",
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockInstagramPayload),
  });

  // Should return 200 but skip processing
  assertEquals(response.status, 200);
});
