import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/vonage-voice-input";

Deno.test("vonage-voice-input - handles JSON payload", async () => {
  const payload = {
    speech: {
      results: [{ text: "Hej, har ni tider imorgon?" }]
    },
    from: "46700000000",
    to: "46769436750",
    conversation_uuid: "test-json-001"
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(Array.isArray(data), true);
  assertEquals(data[0].action, "talk");
});

Deno.test("vonage-voice-input - handles form-urlencoded payload", async () => {
  const params = new URLSearchParams();
  params.append("speech", JSON.stringify({ results: [{ text: "Hej" }] }));
  params.append("from", "46700000000");
  params.append("to", "46769436750");
  params.append("conversation_uuid", "test-form-001");

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(Array.isArray(data), true);
});

Deno.test("vonage-voice-input - handles missing speech gracefully", async () => {
  const payload = {
    from: "46700000000",
    to: "46769436750",
    conversation_uuid: "test-no-speech"
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(Array.isArray(data), true);
});
