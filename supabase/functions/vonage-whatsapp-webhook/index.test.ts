import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-whatsapp-webhook`;
const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL')!,
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!
);

Deno.test("Vonage WhatsApp Webhook - processes incoming message", async () => {
  const mockWhatsAppPayload = {
    from: "whatsapp:+46701234567",
    to: "whatsapp:+46707654321",
    message: {
      content: {
        type: "text",
        text: "Hello, I would like to book an appointment"
      }
    },
    message_uuid: `test-whatsapp-${Date.now()}`,
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  assertEquals(response.status, 200);
  const result = await response.json();
  assertExists(result);
  assertEquals(result.success, true);
});

Deno.test("Vonage WhatsApp Webhook - creates activity log", async () => {
  const testPhone = "whatsapp:+46701234567";
  const mockWhatsAppPayload = {
    from: testPhone,
    to: "whatsapp:+46707654321",
    message: {
      content: {
        type: "text",
        text: "Test message for activity log"
      }
    },
    message_uuid: `test-log-${Date.now()}`,
  };

  // Send WhatsApp message
  await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if activity log was created
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('type', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1);

  assertExists(logs);
  assertEquals(logs!.length > 0, true, "Should create activity log");
});

Deno.test("Vonage WhatsApp Webhook - validates input", async () => {
  const invalidPayloads = [
    // Missing message text
    {
      from: "whatsapp:+46701234567",
      to: "whatsapp:+46707654321",
      message: { content: { type: "text", text: "" } },
      message_uuid: "test-invalid-1",
    },
    // Missing from
    {
      to: "whatsapp:+46707654321",
      message: { content: { type: "text", text: "Hello" } },
      message_uuid: "test-invalid-2",
    },
    // Missing to
    {
      from: "whatsapp:+46701234567",
      message: { content: { type: "text", text: "Hello" } },
      message_uuid: "test-invalid-3",
    },
  ];

  for (const payload of invalidPayloads) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    assertEquals(response.status, 400, `Should reject invalid payload: ${JSON.stringify(payload)}`);
  }
});

Deno.test("Vonage WhatsApp Webhook - handles AI mode (autopilot vs copilot)", async () => {
  const mockWhatsAppPayload = {
    from: "whatsapp:+46701234567",
    to: "whatsapp:+46707654321",
    message: {
      content: {
        type: "text",
        text: "What are your opening hours?"
      }
    },
    message_uuid: `test-ai-mode-${Date.now()}`,
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  assertEquals(response.status, 200);
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  // The function should process differently based on auto_pilot_enabled setting
  // In autopilot: sends response immediately and logs outbound activity
  // In copilot: saves as draft in draft_replies table
  
  // Check for either outbound activity log or draft reply
  const { data: outboundLogs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('type', 'whatsapp')
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: drafts } = await supabase
    .from('draft_replies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  // Either outbound log OR draft should exist
  const hasResponse = (outboundLogs && outboundLogs.length > 0) || (drafts && drafts.length > 0);
  assertEquals(hasResponse, true, "Should create either outbound log or draft reply");
});

Deno.test("Vonage WhatsApp Webhook - handles unconfigured number", async () => {
  const mockWhatsAppPayload = {
    from: "whatsapp:+46701234567",
    to: "whatsapp:+46709999999", // Unconfigured number
    message: {
      content: {
        type: "text",
        text: "Test message"
      }
    },
    message_uuid: "test-unconfigured-123",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  // Should return 404 for unconfigured number
  assertEquals(response.status, 404);
  const result = await response.json();
  assertExists(result.error);
});

Deno.test("Vonage WhatsApp Webhook - handles long messages", async () => {
  const longText = "A".repeat(5000); // Over WhatsApp limit
  const mockWhatsAppPayload = {
    from: "whatsapp:+46701234567",
    to: "whatsapp:+46707654321",
    message: {
      content: {
        type: "text",
        text: longText
      }
    },
    message_uuid: "test-long-123",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  // Should reject messages that are too long
  assertEquals(response.status, 400);
});

Deno.test("Vonage WhatsApp Webhook - handles disabled WhatsApp", async () => {
  const mockWhatsAppPayload = {
    from: "whatsapp:+46701234567",
    to: "whatsapp:+46707654321",
    message: {
      content: {
        type: "text",
        text: "Test when disabled"
      }
    },
    message_uuid: `test-disabled-${Date.now()}`,
  };

  // This test assumes there's a clinic with WhatsApp disabled or phone mode off
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockWhatsAppPayload),
  });

  // Should still return 200 but not send response
  assertEquals(response.status === 200 || response.status === 404, true);
});
