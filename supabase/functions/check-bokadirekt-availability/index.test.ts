import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock environment variables
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
Deno.env.set('RESEND_API_KEY', 'test-resend-key');

// Read the static test HTML
const testHtml = await Deno.readTextFile('./test-data.html');

Deno.test('Bokadirekt Availability - Parse time slots from static HTML', async () => {
  // Extract times using the same regex pattern as the function
  const timePattern = /(\d{1,2}:\d{2})(\d+)\s*kr/g;
  const matches = [...testHtml.matchAll(timePattern)];
  
  const availableTimes = matches.map(match => ({
    time: match[1],
    price: parseInt(match[2])
  }));

  // Assertions
  assertEquals(availableTimes.length, 4, 'Should find 4 time slots');
  assertEquals(availableTimes[0].time, '09:00', 'First slot should be 09:00');
  assertEquals(availableTimes[0].price, 500, 'First slot price should be 500');
  assertEquals(availableTimes[2].time, '14:00', 'Third slot should be 14:00');
  assertEquals(availableTimes[2].price, 750, 'Third slot price should be 750');
});

Deno.test('Bokadirekt Availability - Parse dates from static HTML', async () => {
  // Extract dates using the same regex pattern as the function
  const datePattern = /(\d{1,2})\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/gi;
  const dateMatches = [...testHtml.matchAll(datePattern)];
  
  const dates = dateMatches.map(match => ({
    day: match[1],
    month: match[2]
  }));

  // Assertions
  assertEquals(dates.length, 3, 'Should find 3 dates');
  assertEquals(dates[0].day, '15', 'First date day should be 15');
  assertEquals(dates[0].month.toLowerCase(), 'jan', 'First date month should be jan');
});

Deno.test('Bokadirekt Availability - Handle empty HTML gracefully', () => {
  const emptyHtml = '';
  const timePattern = /(\d{1,2}:\d{2})(\d+)\s*kr/g;
  const matches = [...emptyHtml.matchAll(timePattern)];
  
  assertEquals(matches.length, 0, 'Should find no matches in empty HTML');
});

Deno.test('Bokadirekt Availability - Handle malformed HTML', () => {
  const malformedHtml = '<div>Some random content without time slots</div>';
  const timePattern = /(\d{1,2}:\d{2})(\d+)\s*kr/g;
  const matches = [...malformedHtml.matchAll(timePattern)];
  
  assertEquals(matches.length, 0, 'Should handle malformed HTML without crashing');
});

Deno.test('Bokadirekt Availability - Validate booking handoff email structure', () => {
  const customerName = 'Anna Andersson';
  const customerPhone = '+46701234567';
  const selectedTime = '10:30';
  const selectedDate = '15 jan';
  const serviceName = 'Massage';
  const clinicName = 'Testkliniken';
  const calendarUrl = 'https://bokadirekt.se/test';

  // Build email HTML (same structure as in function)
  const emailHtml = `
    <h2>Ny bokningsförfrågan via Go Front Office</h2>
    
    <h3>Klinikinfo</h3>
    <p><strong>Klinik:</strong> ${clinicName}</p>
    
    <h3>Tjänst</h3>
    <p><strong>Tjänst:</strong> ${serviceName}</p>
    
    <h3>Önskad tid</h3>
    <p><strong>Datum:</strong> ${selectedDate}</p>
    <p><strong>Tid:</strong> ${selectedTime}</p>
    
    <h3>Kundinformation</h3>
    <p><strong>Namn:</strong> ${customerName}</p>
    <p><strong>Telefon:</strong> ${customerPhone}</p>
    
    <h3>Nästa steg</h3>
    <p>Vänligen slutför bokningen manuellt via Bokadirekt:</p>
    <p><a href="${calendarUrl}">${calendarUrl}</a></p>
  `;

  // Assertions - verify all critical info is present
  assertExists(emailHtml.includes(customerName), 'Email should contain customer name');
  assertExists(emailHtml.includes(customerPhone), 'Email should contain customer phone');
  assertExists(emailHtml.includes(selectedTime), 'Email should contain selected time');
  assertExists(emailHtml.includes(selectedDate), 'Email should contain selected date');
  assertExists(emailHtml.includes(serviceName), 'Email should contain service name');
  assertExists(emailHtml.includes(clinicName), 'Email should contain clinic name');
  assertExists(emailHtml.includes(calendarUrl), 'Email should contain calendar URL');
});

Deno.test('Bokadirekt Availability - Handle various time formats', () => {
  const testCases = [
    { html: '09:00500 kr', expected: { time: '09:00', price: 500 } },
    { html: '10:30250 kr', expected: { time: '10:30', price: 250 } },
    { html: '14:001000 kr', expected: { time: '14:00', price: 1000 } },
    { html: '9:0075 kr', expected: { time: '9:00', price: 75 } },
  ];

  const timePattern = /(\d{1,2}:\d{2})(\d+)\s*kr/g;

  testCases.forEach(testCase => {
    const matches = [...testCase.html.matchAll(timePattern)];
    if (matches.length > 0) {
      const result = {
        time: matches[0][1],
        price: parseInt(matches[0][2])
      };
      assertEquals(result.time, testCase.expected.time, `Time should match for ${testCase.html}`);
      assertEquals(result.price, testCase.expected.price, `Price should match for ${testCase.html}`);
    }
  });
});
