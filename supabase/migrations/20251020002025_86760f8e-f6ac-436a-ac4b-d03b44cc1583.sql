-- Add separate autopilot settings for each messaging channel
ALTER TABLE assistant_settings 
  ADD COLUMN IF NOT EXISTS sms_auto_pilot boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_pilot boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS instagram_auto_pilot boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS messenger_auto_pilot boolean DEFAULT true;

-- Migrate existing auto_pilot_enabled value to all channels
UPDATE assistant_settings
SET 
  sms_auto_pilot = auto_pilot_enabled,
  whatsapp_auto_pilot = auto_pilot_enabled,
  instagram_auto_pilot = auto_pilot_enabled,
  messenger_auto_pilot = auto_pilot_enabled
WHERE 
  sms_auto_pilot IS NULL 
  OR whatsapp_auto_pilot IS NULL 
  OR instagram_auto_pilot IS NULL 
  OR messenger_auto_pilot IS NULL;