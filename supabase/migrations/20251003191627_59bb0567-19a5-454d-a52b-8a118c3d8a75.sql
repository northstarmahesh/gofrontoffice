-- Add location_id to clinic_phone_numbers and update constraints
ALTER TABLE clinic_phone_numbers 
  ADD COLUMN location_id uuid REFERENCES clinic_locations(id) ON DELETE CASCADE;

-- Update channel to support multiple channels per phone number
ALTER TABLE clinic_phone_numbers 
  ADD COLUMN channels text[] DEFAULT ARRAY['sms']::text[];

-- Add constraint to ensure only one WhatsApp per location
CREATE UNIQUE INDEX unique_whatsapp_per_location 
  ON clinic_phone_numbers (location_id) 
  WHERE 'whatsapp' = ANY(channels);

-- Update RLS policies to check location access
DROP POLICY IF EXISTS "Admins can manage phone numbers" ON clinic_phone_numbers;
DROP POLICY IF EXISTS "Users can view phone numbers for their clinics" ON clinic_phone_numbers;

CREATE POLICY "Users can manage phone numbers for their clinic locations"
  ON clinic_phone_numbers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = clinic_phone_numbers.location_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view phone numbers for their clinic locations"
  ON clinic_phone_numbers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = clinic_phone_numbers.location_id
        AND cu.user_id = auth.uid()
    )
  );