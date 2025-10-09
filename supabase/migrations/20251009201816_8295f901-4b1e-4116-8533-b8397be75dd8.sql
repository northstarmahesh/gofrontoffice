-- Create table for Bokadirekt calendar URLs
CREATE TABLE public.bokadirekt_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.clinic_locations(id) ON DELETE CASCADE,
  calendar_url TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bokadirekt_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view calendars for their clinics"
  ON public.bokadirekt_calendars
  FOR SELECT
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage calendars"
  ON public.bokadirekt_calendars
  FOR ALL
  USING (user_is_clinic_admin(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_admin(auth.uid(), clinic_id));

-- Trigger for updated_at
CREATE TRIGGER update_bokadirekt_calendars_updated_at
  BEFORE UPDATE ON public.bokadirekt_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();