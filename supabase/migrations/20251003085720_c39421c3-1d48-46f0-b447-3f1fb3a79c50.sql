-- Add website field to clinics table
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS admin_email text;

-- Create clinic_locations table for multiple locations per clinic
CREATE TABLE IF NOT EXISTS public.clinic_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  admin_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on clinic_locations
ALTER TABLE public.clinic_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for clinic_locations
CREATE POLICY "Users can view locations for their clinics"
  ON public.clinic_locations
  FOR SELECT
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage locations"
  ON public.clinic_locations
  FOR ALL
  USING (user_is_clinic_admin(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_admin(auth.uid(), clinic_id));

-- Add trigger for updated_at
CREATE TRIGGER update_clinic_locations_updated_at
  BEFORE UPDATE ON public.clinic_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();