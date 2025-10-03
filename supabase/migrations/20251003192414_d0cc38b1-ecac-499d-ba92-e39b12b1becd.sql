-- Add verification status to phone numbers
ALTER TABLE clinic_phone_numbers 
  ADD COLUMN is_verified boolean DEFAULT false,
  ADD COLUMN verification_code text,
  ADD COLUMN verification_expires_at timestamp with time zone;

-- Add social media connections to locations
ALTER TABLE clinic_locations
  ADD COLUMN instagram_handle text,
  ADD COLUMN facebook_page_id text,
  ADD COLUMN instagram_connected boolean DEFAULT false,
  ADD COLUMN facebook_connected boolean DEFAULT false;

-- Update clinic_integrations to support location-specific integrations
ALTER TABLE clinic_integrations
  ADD COLUMN location_id uuid REFERENCES clinic_locations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_clinic_integrations_location ON clinic_integrations(location_id);
CREATE INDEX idx_phone_numbers_verification ON clinic_phone_numbers(is_verified);