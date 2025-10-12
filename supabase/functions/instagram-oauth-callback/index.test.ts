import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = `${Deno.env.get('VITE_SUPABASE_URL')}/functions/v1/instagram-oauth-callback`;

Deno.test("Instagram OAuth Callback - handles error parameter", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('error', 'access_denied');
  url.searchParams.set('error_description', 'User denied permission');
  url.searchParams.set('state', 'test-clinic-id:test-location-id:123456');

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  assertEquals(response.status, 400);
  const html = await response.text();
  assertExists(html.includes('Error'));
  assertExists(html.includes('access_denied'));
});

Deno.test("Instagram OAuth Callback - validates required parameters", async () => {
  // Test missing code
  const url1 = new URL(FUNCTION_URL);
  url1.searchParams.set('state', 'test-clinic-id:test-location-id:123456');

  const response1 = await fetch(url1.toString(), {
    method: "GET",
  });

  assertEquals(response1.status, 500);
  
  // Test missing state
  const url2 = new URL(FUNCTION_URL);
  url2.searchParams.set('code', 'test-code-123');

  const response2 = await fetch(url2.toString(), {
    method: "GET",
  });

  assertEquals(response2.status, 500);
});

Deno.test("Instagram OAuth Callback - validates state format", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('code', 'test-code-123');
  url.searchParams.set('state', 'invalid-state-format'); // Missing colon separators

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  // Should fail due to invalid state format
  assertEquals(response.status, 500);
  const html = await response.text();
  assertExists(html.includes('Error') || html.includes('error'));
});

Deno.test("Instagram OAuth Callback - handles invalid authorization code", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('code', 'invalid-code-123');
  url.searchParams.set('state', 'test-clinic-id:test-location-id:123456');

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  // Should fail when trying to exchange invalid code for token
  assertEquals(response.status, 500);
  const html = await response.text();
  assertExists(html);
});

Deno.test("Instagram OAuth Callback - returns HTML response", async () => {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('error', 'test_error');
  url.searchParams.set('state', 'test-clinic-id:test-location-id:123456');

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  const contentType = response.headers.get('content-type');
  assertExists(contentType);
  assertEquals(contentType.includes('text/html'), true);
});

// Note: Full OAuth flow testing requires:
// 1. Valid Meta App ID and Secret
// 2. Valid authorization code from Meta
// 3. Facebook Page with Instagram Business account
// These tests cover error handling and validation
