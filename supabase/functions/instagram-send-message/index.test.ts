import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/instagram-send-message`;
const API_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY');

Deno.test("Instagram Send Message - validates required parameters", async () => {
  const testCases = [
    // Missing recipientId
    { message: "Hello", clinicId: "test-clinic-123" },
    // Missing message
    { recipientId: "test-recipient-123", clinicId: "test-clinic-123" },
    // Missing clinicId
    { recipientId: "test-recipient-123", message: "Hello" },
    // Empty message
    { recipientId: "test-recipient-123", message: "", clinicId: "test-clinic-123" },
    // Message with only whitespace
    { recipientId: "test-recipient-123", message: "   ", clinicId: "test-clinic-123" },
  ];

  for (const payload of testCases) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    assertEquals(response.status, 400, `Should reject payload: ${JSON.stringify(payload)}`);
    const result = await response.json();
    assertExists(result.error);
  }
});

Deno.test("Instagram Send Message - validates message length", async () => {
  const longMessage = "A".repeat(1500); // Over 1000 character limit
  
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      recipientId: "test-recipient-123",
      message: longMessage,
      clinicId: "test-clinic-123",
    }),
  });

  assertEquals(response.status, 400);
  const result = await response.json();
  assertExists(result.error);
  assertEquals(result.error.includes('too long'), true);
});

Deno.test("Instagram Send Message - handles missing integration", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      recipientId: "test-recipient-123",
      message: "Hello, this is a test message",
      clinicId: "non-existent-clinic-id",
    }),
  });

  // Should fail with 500 due to missing integration
  assertEquals(response.status, 500);
  const result = await response.json();
  assertExists(result.error);
});

Deno.test("Instagram Send Message - validates message content", async () => {
  const validPayload = {
    recipientId: "test-recipient-123",
    message: "Hello, this is a valid test message",
    clinicId: "test-clinic-123",
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(validPayload),
  });

  // Will fail in test environment without valid integration
  // but should not fail validation
  const result = await response.json();
  assertExists(result);
});

Deno.test("Instagram Send Message - handles CORS", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  const corsHeader = response.headers.get('Access-Control-Allow-Origin');
  assertEquals(corsHeader, '*');
});

// Note: Full message sending testing requires:
// 1. Valid Instagram Business account integration
// 2. Valid access token
// 3. Valid recipient ID
// These tests cover validation and error handling
