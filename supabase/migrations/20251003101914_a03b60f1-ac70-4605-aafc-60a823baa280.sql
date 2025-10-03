-- Add AI assistant configuration to clinics table
ALTER TABLE public.clinics 
ADD COLUMN assistant_prompt TEXT,
ADD COLUMN assistant_voice TEXT DEFAULT 'alloy';

-- Add comment explaining the columns
COMMENT ON COLUMN public.clinics.assistant_prompt IS 'Custom prompt/instructions for the AI assistant';
COMMENT ON COLUMN public.clinics.assistant_voice IS 'Selected voice for the AI assistant (alloy, echo, fable, onyx, nova, shimmer)';