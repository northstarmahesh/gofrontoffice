-- Add unique constraint to prevent duplicate activity logs
-- This will prevent the same activity from being logged multiple times
CREATE UNIQUE INDEX IF NOT EXISTS unique_activity_log 
ON activity_logs (clinic_id, contact_info, title, type, COALESCE(summary, ''), created_at);

-- Remove any existing duplicates before adding the constraint
-- Keep only the first occurrence of each duplicate
DELETE FROM activity_logs a
USING activity_logs b
WHERE a.id > b.id
  AND a.clinic_id = b.clinic_id
  AND COALESCE(a.contact_info, '') = COALESCE(b.contact_info, '')
  AND a.title = b.title
  AND a.type = b.type
  AND COALESCE(a.summary, '') = COALESCE(b.summary, '')
  AND a.created_at = b.created_at;