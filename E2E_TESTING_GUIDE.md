# End-to-End Testing Guide for All Channel Webhooks

## Story 1.13 - E2E Testing Checklist

### Pre-Testing Setup

#### Environment Verification
- [x] Lovable AI integration enabled (LOVABLE_API_KEY configured)
- [x] All webhook functions deployed and live
- [x] Active phone numbers configured in database
- [ ] Test clinic account created and configured
- [ ] All channel integrations connected (Vonage, Instagram, Messenger)

#### Webhook URLs (Configure in respective dashboards)
```
Base URL: https://bzaqtvjereyqrymupapp.supabase.co/functions/v1/

Vonage Voice:     {BASE_URL}vonage-voice-webhook
Vonage SMS:       {BASE_URL}vonage-sms-webhook  
Vonage WhatsApp:  {BASE_URL}vonage-whatsapp-webhook
Instagram:        {BASE_URL}instagram-webhook
Messenger:        {BASE_URL}messenger-webhook
```

---

## Test Execution

### 1. Vonage Voice Channel (AC #1)

**Test Procedure:**
1. From external phone, call: `[configured Vonage number]`
2. Listen to the greeting message
3. Speak a test message (e.g., "I'd like to book an appointment")
4. Wait for call to complete

**Verification Steps:**
- [ ] Call was answered and greeting played
- [ ] Recording was captured
- [ ] Activity log created in database
- [ ] Activity appears in UI under "Activity Logs"
- [ ] Task created in "Tasks" tab
- [ ] Recording URL is accessible (if applicable)

**Debug Commands:**
```sql
-- Check recent call activities
SELECT * FROM activity_logs 
WHERE type = 'call' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Status:** ⬜ NOT TESTED | ✅ PASS | ❌ FAIL  
**Notes:** _[Add observations here]_

---

### 2. Vonage SMS Channel (AC #2)

**Test Procedure:**
1. From external phone, send SMS to: `[configured Vonage number]`
2. Message content: "Hello, what are your opening hours?"
3. Wait 5-10 seconds for processing

**Verification Steps:**
- [ ] SMS received by webhook
- [ ] AI response generated
- [ ] In Autopilot mode: Response sent back to sender
- [ ] In Copilot mode: Draft reply created in `draft_replies` table
- [ ] Activity log created with correct contact info
- [ ] Activity appears in UI
- [ ] Task created if in Copilot mode

**Debug Commands:**
```sql
-- Check recent SMS activities
SELECT * FROM activity_logs 
WHERE type = 'sms' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check draft replies (Copilot mode)
SELECT * FROM draft_replies 
ORDER BY created_at DESC 
LIMIT 5;
```

**Status:** ⬜ NOT TESTED | ✅ PASS | ❌ FAIL  
**Notes:** _[Add observations here]_

---

### 3. Vonage WhatsApp Channel (AC #3)

**Test Procedure:**
1. From WhatsApp app, send message to: `[configured Vonage WhatsApp number]`
2. Message content: "Do you have any available appointments tomorrow?"
3. Wait 5-10 seconds for processing

**Verification Steps:**
- [ ] WhatsApp message received by webhook
- [ ] AI response generated
- [ ] In Autopilot mode: WhatsApp response sent
- [ ] In Copilot mode: Draft reply created
- [ ] Activity log created
- [ ] Contact info correctly captured
- [ ] Activity appears in UI

**Debug Commands:**
```sql
-- Check recent WhatsApp activities
SELECT * FROM activity_logs 
WHERE type = 'whatsapp' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check integration status
SELECT * FROM clinic_integrations 
WHERE integration_type = 'whatsapp';
```

**Status:** ⬜ NOT TESTED | ✅ PASS | ❌ FAIL  
**Notes:** _[Add observations here]_

---

### 4. Instagram Direct Channel (AC #4)

**Test Procedure:**
1. From test Instagram account, send DM to: `[connected Instagram business account]`
2. Message content: "Hi! I'm interested in your services"
3. Wait 5-10 seconds for processing

**Verification Steps:**
- [ ] Instagram DM received by webhook
- [ ] Webhook verification successful (if first time)
- [ ] AI response generated
- [ ] In Autopilot mode: Instagram response sent
- [ ] In Copilot mode: Draft reply created
- [ ] Activity log created with Instagram sender ID
- [ ] Activity appears in UI

**Debug Commands:**
```sql
-- Check recent Instagram activities
SELECT * FROM activity_logs 
WHERE type = 'instagram' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check Instagram integration
SELECT * FROM clinic_integrations 
WHERE integration_type = 'instagram';
```

**Status:** ⬜ NOT TESTED | ✅ PASS | ❌ FAIL  
**Notes:** _[Add observations here]_

---

### 5. Facebook Messenger Channel (AC #5)

**Test Procedure:**
1. From test Facebook account, send message to: `[connected Facebook Page]`
2. Message content: "What services do you offer?"
3. Wait 5-10 seconds for processing

**Verification Steps:**
- [ ] Messenger message received by webhook
- [ ] Webhook verification successful (if first time)
- [ ] AI response generated
- [ ] In Autopilot mode: Messenger response sent
- [ ] In Copilot mode: Draft reply created
- [ ] Activity log created with Facebook sender ID
- [ ] Activity appears in UI

**Debug Commands:**
```sql
-- Check recent Messenger activities
SELECT * FROM activity_logs 
WHERE type = 'messenger' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check Messenger integration
SELECT * FROM clinic_integrations 
WHERE integration_type = 'messenger';
```

**Status:** ⬜ NOT TESTED | ✅ PASS | ❌ FAIL  
**Notes:** _[Add observations here]_

---

## Common Debugging Steps

### 1. Check Edge Function Logs
Navigate to backend and check logs for each function:
- Look for error messages
- Verify request payloads
- Check AI API responses

### 2. Verify AI Service
```sql
-- Check if LOVABLE_API_KEY is configured
-- (This is done via Supabase dashboard secrets)

-- Check recent credit transactions
SELECT * FROM credit_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Verify Assistant Settings
```sql
-- Check assistant mode and channel status
SELECT 
  cl.name as location,
  as2.auto_pilot_enabled,
  as2.phone_mode,
  as2.sms_enabled,
  as2.whatsapp_enabled,
  as2.instagram_enabled,
  as2.messenger_enabled
FROM assistant_settings as2
JOIN clinic_locations cl ON cl.id = as2.location_id;
```

### 4. Test Webhook Connectivity
Use curl to test webhook endpoints:

```bash
# Test SMS webhook
curl -X POST https://bzaqtvjereyqrymupapp.supabase.co/functions/v1/vonage-sms-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "46701234567",
    "to": "46707654321",
    "text": "Test message",
    "messageId": "test-123",
    "type": "text"
  }'
```

---

## Test Summary Report

### Overall Results
- **Total Channels Tested:** _[X/5]_
- **Passed:** _[X]_
- **Failed:** _[X]_
- **Not Tested:** _[X]_

### Channel Status Matrix
| Channel | Status | AI Response | Activity Log | Task Created | Notes |
|---------|--------|-------------|--------------|--------------|-------|
| Vonage Voice | ⬜ | ⬜ | ⬜ | ⬜ | |
| Vonage SMS | ⬜ | ⬜ | ⬜ | ⬜ | |
| Vonage WhatsApp | ⬜ | ⬜ | ⬜ | ⬜ | |
| Instagram DM | ⬜ | ⬜ | ⬜ | ⬜ | |
| Messenger | ⬜ | ⬜ | ⬜ | ⬜ | |

### Known Issues
_[Document any issues discovered during testing]_

### Recommendations
_[Document any improvements or fixes needed]_

---

## Automated Test Results

### Unit Tests Status
```bash
# Run AI service tests
cd supabase/functions/_shared
deno test ai-service.test.ts --allow-env

# Run webhook tests
deno test --allow-net --allow-env
```

**AI Service Tests:** ⬜ NOT RUN | ✅ PASS | ❌ FAIL  
**Webhook Tests:** ⬜ NOT RUN | ✅ PASS | ❌ FAIL

---

## Sign-off

**Tested By:** _[Name]_  
**Date:** _[Date]_  
**Environment:** Production / Staging  
**Story Status:** ⬜ In Progress | ⬜ Blocked | ⬜ Complete

**Ready for Launch:** ⬜ YES | ⬜ NO | ⬜ WITH CAVEATS

**Comments:**
_[Add final comments about overall system readiness]_
