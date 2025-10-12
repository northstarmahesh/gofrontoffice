/**
 * Unit tests for AI Service
 * Tests the core AI response generation logic with mocked API calls
 * 
 * Run with: deno test supabase/functions/_shared/ai-service.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { generateAiResponse, type GenerateResponseParams } from "./ai-service.ts";

// Helper to mock fetch for testing
function mockFetch(response: any, status = 200) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(response), { status });
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

// Helper to mock env vars
function mockEnv(key: string, value: string) {
  const originalGet = Deno.env.get;
  Deno.env.get = (k: string) => {
    if (k === key) return value;
    return originalGet(k);
  };
  return () => {
    Deno.env.get = originalGet;
  };
}

Deno.test("generateAiResponse - successful response", async () => {
  const restoreEnv = mockEnv("LOVABLE_API_KEY", "test-api-key");
  const restoreFetch = mockFetch({
    choices: [
      { message: { content: "Thank you for contacting us!" } }
    ]
  });

  try {
    const params: GenerateResponseParams = {
      messageText: "Hello, I need help",
      clinic: {
        name: "Test Clinic",
        phone: "+46701234567",
        email: "info@test.se",
        address: "Stockholm",
      },
      knowledgeBase: "We offer beauty treatments",
      channelType: "sms"
    };

    const result = await generateAiResponse(params);
    assertEquals(result.responseText, "Thank you for contacting us!");
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

Deno.test("generateAiResponse - handles missing API key", async () => {
  const restoreEnv = mockEnv("LOVABLE_API_KEY", "");
  
  try {
    const params: GenerateResponseParams = {
      messageText: "Test",
      clinic: { name: "Test" },
      knowledgeBase: "",
      channelType: "sms"
    };

    let errorThrown = false;
    try {
      await generateAiResponse(params);
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, "AI service configuration error");
    }
    assertEquals(errorThrown, true);
  } finally {
    restoreEnv();
  }
});

Deno.test("generateAiResponse - handles rate limit (429)", async () => {
  const restoreEnv = mockEnv("LOVABLE_API_KEY", "test-api-key");
  const restoreFetch = mockFetch({ error: "Rate limit" }, 429);

  try {
    const params: GenerateResponseParams = {
      messageText: "Test",
      clinic: { name: "Test" },
      knowledgeBase: "",
      channelType: "sms"
    };

    let errorThrown = false;
    try {
      await generateAiResponse(params);
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message.includes("Rate limit"), true);
    }
    assertEquals(errorThrown, true);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

Deno.test("generateAiResponse - handles payment required (402)", async () => {
  const restoreEnv = mockEnv("LOVABLE_API_KEY", "test-api-key");
  const restoreFetch = mockFetch({ error: "Payment" }, 402);

  try {
    const params: GenerateResponseParams = {
      messageText: "Test",
      clinic: { name: "Test" },
      knowledgeBase: "",
      channelType: "sms"
    };

    let errorThrown = false;
    try {
      await generateAiResponse(params);
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message.includes("Payment required"), true);
    }
    assertEquals(errorThrown, true);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});
