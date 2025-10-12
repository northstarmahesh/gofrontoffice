-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the send-notifications-cron function to run every hour
SELECT cron.schedule(
  'send-notifications-hourly',
  '0 * * * *', -- Run at the start of every hour
  $$
  SELECT
    net.http_post(
        url:='https://bzaqtvjereyqrymupapp.supabase.co/functions/v1/send-notifications-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YXF0dmplcmV5cXJ5bXVwYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjI5ODIsImV4cCI6MjA3NDk5ODk4Mn0.455jRRMQWbp4u78e-gtZdRiT88idQXRL3l5ec-vYHmA"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);