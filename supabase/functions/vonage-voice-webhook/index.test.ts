import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/vonage-voice-webhook`;

Deno.test("Vonage Voice Webhook - handles incoming call", async () => {
  const mockCallPayload = {
    from: "+46701234567",
    to: "+46707654321",
    conversation_uuid: "test-conversation-uuid-123",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockCallPayload),
  });

  assertEquals(response.status, 200);
  const ncco = await response.json();
  
  // Verify NCCO structure
  assertExists(ncco);
  assertEquals(Array.isArray(ncco), true);
  
  // Check for consent announcement
  const consentAction = ncco.find((action: any) => 
    action.action === "talk" && 
    action.text.includes("recorded")
  );
  assertExists(consentAction, "Should include consent announcement");

  // Check for recording action
  const recordAction = ncco.find((action: any) => action.action === "record");
  assertExists(recordAction, "Should include record action");
  assertEquals(recordAction.format, "mp3");
  assertExists(recordAction.eventUrl, "Record action should have eventUrl");
});

Deno.test("Vonage Voice Webhook - handles phone mode off (voicemail)", async () => {
  const mockCallPayload = {
    from: "+46701234567",
    to: "+46707654321",
    conversation_uuid: "test-conversation-uuid-456",
  };

  // Note: This test requires the phone to be in 'off' mode in test data
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockCallPayload),
  });

  assertEquals(response.status, 200);
  const ncco = await response.json();
  
  // When phone is off, should have voicemail actions
  const talkAction = ncco.find((action: any) => 
    action.action === "talk" && 
    action.text.includes("leave a message")
  );
  
  if (talkAction) {
    // Voicemail mode
    const recordAction = ncco.find((action: any) => action.action === "record");
    assertExists(recordAction);
    assertEquals(recordAction.beepStart, true);
  }
});

Deno.test("Vonage Voice Webhook - handles unconfigured number", async () => {
  const mockCallPayload = {
    from: "+46701234567",
    to: "+46709999999", // Unconfigured number
    conversation_uuid: "test-conversation-uuid-789",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mockCallPayload),
  });

  assertEquals(response.status, 200);
  const ncco = await response.json();
  
  // Should return error message
  const errorAction = ncco.find((action: any) => 
    action.action === "talk" && 
    action.text.includes("not configured")
  );
  assertExists(errorAction, "Should return not configured message");
});
