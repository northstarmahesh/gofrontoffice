-- Create table for storing OAuth integration tokens
CREATE TABLE public.clinic_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  integration_type text NOT NULL, -- 'outlook_calendar', 'outlook_email', 'gmail_calendar', 'gmail_email'
  access_token text,
  refresh_token text,
  token_expiry timestamp with time zone,
  is_connected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(clinic_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.clinic_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view integrations for their clinics"
ON public.clinic_integrations
FOR SELECT
USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage integrations"
ON public.clinic_integrations
FOR ALL
USING (user_is_clinic_admin(auth.uid(), clinic_id))
WITH CHECK (user_is_clinic_admin(auth.uid(), clinic_id));

-- Trigger for updated_at
CREATE TRIGGER update_clinic_integrations_updated_at
  BEFORE UPDATE ON public.clinic_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();