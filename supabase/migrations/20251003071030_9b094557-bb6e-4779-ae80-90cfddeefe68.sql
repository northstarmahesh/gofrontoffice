-- Add phone call specific fields to activity_logs
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('inbound', 'outbound'));

-- Add comment for clarity
COMMENT ON COLUMN public.activity_logs.duration IS 'Duration of phone calls in MM:SS format';
COMMENT ON COLUMN public.activity_logs.direction IS 'Direction of phone calls: inbound or outbound';