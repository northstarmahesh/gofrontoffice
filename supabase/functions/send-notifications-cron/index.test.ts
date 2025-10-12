import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

const FUNCTION_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notifications-cron`;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.test('Notification Cron - handles execution successfully', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.success);
  assertExists(data.results);
});

Deno.test('Notification Cron - returns notification results', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  assertExists(data.results.emailsSent);
  assertExists(data.results.smsSent);
  assertExists(data.results.errors);
  assertEquals(typeof data.results.emailsSent, 'number');
  assertEquals(typeof data.results.smsSent, 'number');
  assertEquals(Array.isArray(data.results.errors), true);
});

Deno.test('Notification Cron - handles CORS preflight', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'OPTIONS',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
  assertEquals(
    response.headers.get('access-control-allow-headers'),
    'authorization, x-client-info, apikey, content-type'
  );
});
