-- Add conversation_id column to activity_logs for direct lookup
ALTER TABLE activity_logs 
ADD COLUMN conversation_id TEXT;

-- Create index for efficient lookups
CREATE INDEX idx_activity_logs_conversation_id 
ON activity_logs(conversation_id);