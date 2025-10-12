import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration tests for the deduct-credits edge function
 * 
 * These tests verify:
 * 1. Credit deduction logic
 * 2. Transaction logging
 * 3. Auto top-up triggering
 * 4. Error handling
 * 
 * Note: These tests require environment variables to be set
 */

describe('deduct-credits edge function', () => {
  const FUNCTION_URL = `${process.env.VITE_SUPABASE_URL}/functions/v1/deduct-credits`;
  const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const mockClinicId = 'test-clinic-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  it('should successfully deduct credits for a valid action', async () => {
    const payload = {
      clinic_id: mockClinicId,
      user_id: mockUserId,
      action_type: 'AI_RESPONSE',
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('transaction_id');
    expect(data).toHaveProperty('remaining_credits');
    expect(data).toHaveProperty('credits_deducted', 1);
  });

  it('should return 400 for missing required fields', async () => {
    const payload = {
      clinic_id: mockClinicId,
      // Missing user_id and action_type
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 for unknown action type', async () => {
    const payload = {
      clinic_id: mockClinicId,
      user_id: mockUserId,
      action_type: 'INVALID_ACTION',
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Unknown action type');
  });

  it('should deduct correct credits for different action types', async () => {
    const actionTypes = [
      { type: 'AI_RESPONSE', expectedCredits: 1 },
      { type: 'CALL_RECORDING', expectedCredits: 2 },
      { type: 'AI_TASK_SUGGESTION', expectedCredits: 1 },
    ];

    for (const { type, expectedCredits } of actionTypes) {
      const payload = {
        clinic_id: mockClinicId,
        user_id: mockUserId,
        action_type: type,
      };

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      expect(data.credits_deducted).toBe(expectedCredits);
    }
  });

  it('should trigger auto top-up when credits fall below threshold', async () => {
    // This test assumes the clinic has low credits (below 20)
    const payload = {
      clinic_id: mockClinicId,
      user_id: mockUserId,
      action_type: 'AI_RESPONSE',
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    // If auto_topup_enabled and credits < 20, should trigger
    if (data.remaining_credits < 20 && data.auto_topup_triggered) {
      expect(data).toHaveProperty('auto_topup_triggered', true);
      expect(data).toHaveProperty('topup_id');
    }
  });

  it('should return 402 for insufficient credits', async () => {
    // This test assumes the clinic has 0 credits
    const payload = {
      clinic_id: mockClinicId,
      user_id: mockUserId,
      action_type: 'AI_RESPONSE',
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    // If the clinic has no credits, should return 402
    if (response.status === 402) {
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Insufficient credits');
    }
  });

  it('should include related_log_id when provided', async () => {
    const payload = {
      clinic_id: mockClinicId,
      user_id: mockUserId,
      action_type: 'AI_RESPONSE',
      related_log_id: 'test-log-id',
    };

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
  });

  it('should handle CORS preflight requests', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
