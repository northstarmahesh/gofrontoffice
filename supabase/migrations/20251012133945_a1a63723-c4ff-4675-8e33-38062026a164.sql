-- Add recording_url column to activity_logs table for storing call recordings
ALTER TABLE public.activity_logs
ADD COLUMN recording_url TEXT;

COMMENT ON COLUMN public.activity_logs.recording_url IS 'URL to the call recording file (for call type activities)';