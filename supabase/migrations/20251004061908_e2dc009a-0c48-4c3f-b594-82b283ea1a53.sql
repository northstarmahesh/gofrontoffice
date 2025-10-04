-- Add clinic_type column to clinics table
ALTER TABLE public.clinics 
ADD COLUMN clinic_type TEXT DEFAULT 'medical';

-- Add comment for documentation
COMMENT ON COLUMN public.clinics.clinic_type IS 'Type of clinic: medical, dental, veterinary, therapy, or default';
