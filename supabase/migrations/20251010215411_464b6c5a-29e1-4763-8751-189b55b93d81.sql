-- Add system_enabled column to assistant_settings table
ALTER TABLE assistant_settings 
ADD COLUMN IF NOT EXISTS system_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN assistant_settings.system_enabled IS 'Master switch to enable/disable entire AI assistant system for a location';