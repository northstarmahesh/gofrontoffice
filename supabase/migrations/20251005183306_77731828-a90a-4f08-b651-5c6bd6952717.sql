-- Migration to clean up duplicate contacts and activity logs
-- This should be run once to clean existing duplicates

-- Remove duplicate contacts (keep the earliest one for each phone number)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY clinic_id, phone ORDER BY created_at) as rn
  FROM contacts
)
DELETE FROM contacts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Remove duplicate activity logs (keep the earliest one for each unique combination)
WITH duplicate_logs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY clinic_id, contact_info, title, created_at 
      ORDER BY created_at
    ) as rn
  FROM activity_logs
  WHERE contact_name IS NOT NULL
)
DELETE FROM activity_logs
WHERE id IN (
  SELECT id FROM duplicate_logs WHERE rn > 1
);

-- Add a unique index to prevent future duplicates on contacts
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contact_per_clinic 
ON contacts(clinic_id, phone);

-- Add a comment to document this migration
COMMENT ON INDEX idx_unique_contact_per_clinic IS 
'Prevents duplicate contacts with the same phone number in the same clinic';