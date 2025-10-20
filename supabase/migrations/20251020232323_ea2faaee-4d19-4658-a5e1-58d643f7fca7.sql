-- Create elevenlabs_call_logs table
CREATE TABLE IF NOT EXISTS public.elevenlabs_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL UNIQUE,
  transcript JSONB,
  metadata JSONB,
  duration_seconds INTEGER,
  call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_elevenlabs_logs_clinic_id ON public.elevenlabs_call_logs(clinic_id);
CREATE INDEX idx_elevenlabs_logs_conversation_id ON public.elevenlabs_call_logs(conversation_id);
CREATE INDEX idx_elevenlabs_logs_created_at ON public.elevenlabs_call_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.elevenlabs_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their clinic's call logs"
  ON public.elevenlabs_call_logs
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert call logs"
  ON public.elevenlabs_call_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update call logs"
  ON public.elevenlabs_call_logs
  FOR UPDATE
  USING (true);

-- Add comments
COMMENT ON TABLE public.elevenlabs_call_logs IS 'Stores call logs and transcripts from Eleven Labs Conversational AI';
COMMENT ON COLUMN public.elevenlabs_call_logs.conversation_id IS 'Unique conversation ID from Eleven Labs';
COMMENT ON COLUMN public.elevenlabs_call_logs.transcript IS 'Full conversation transcript in JSONB format';
COMMENT ON COLUMN public.elevenlabs_call_logs.metadata IS 'Call metadata (cost, phone number, timestamps, etc.)';