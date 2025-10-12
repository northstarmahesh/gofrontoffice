-- Create a table to track pending auto top-ups
CREATE TABLE IF NOT EXISTS public.pending_top_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kr integer NOT NULL,
  credits_to_add integer NOT NULL,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE public.pending_top_ups ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_top_ups
CREATE POLICY "Users can view top-ups for their clinics"
ON public.pending_top_ups
FOR SELECT
TO authenticated
USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage top-ups for their clinics"
ON public.pending_top_ups
FOR ALL
TO authenticated
USING (user_is_clinic_admin(auth.uid(), clinic_id))
WITH CHECK (user_is_clinic_admin(auth.uid(), clinic_id));

-- Create a function to atomically deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_clinic_id uuid,
  p_user_id uuid,
  p_action_type text,
  p_credits_amount integer,
  p_related_log_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
  v_auto_topup_enabled boolean;
  v_transaction_id uuid;
  v_topup_triggered boolean := false;
  v_topup_id uuid;
BEGIN
  -- Lock the billing_usage row for update
  SELECT current_credits, auto_topup_enabled
  INTO v_current_credits, v_auto_topup_enabled
  FROM billing_usage
  WHERE clinic_id = p_clinic_id
  FOR UPDATE;

  -- Check if clinic has enough credits
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'Clinic billing record not found';
  END IF;

  IF v_current_credits < p_credits_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', v_current_credits, p_credits_amount;
  END IF;

  -- Deduct credits from billing_usage
  UPDATE billing_usage
  SET 
    current_credits = current_credits - p_credits_amount,
    credits_used_this_month = credits_used_this_month + p_credits_amount,
    updated_at = now()
  WHERE clinic_id = p_clinic_id;

  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id,
    clinic_id,
    transaction_type,
    credits_amount,
    description,
    task_type,
    related_log_id
  )
  VALUES (
    p_user_id,
    p_clinic_id,
    'deduction',
    -p_credits_amount,
    'Credit deduction for ' || p_action_type,
    p_action_type,
    p_related_log_id
  )
  RETURNING id INTO v_transaction_id;

  -- Check if auto top-up should be triggered (when credits fall below 20)
  IF v_auto_topup_enabled AND (v_current_credits - p_credits_amount) < 20 THEN
    -- Create pending top-up record (default 100 credits for 295 kr)
    INSERT INTO pending_top_ups (
      clinic_id,
      user_id,
      amount_kr,
      credits_to_add
    )
    VALUES (
      p_clinic_id,
      p_user_id,
      29500, -- 295 kr in öre
      100
    )
    RETURNING id INTO v_topup_id;
    
    v_topup_triggered := true;
  END IF;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'remaining_credits', v_current_credits - p_credits_amount,
    'auto_topup_triggered', v_topup_triggered,
    'topup_id', v_topup_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback the transaction
    RAISE;
END;
$$;