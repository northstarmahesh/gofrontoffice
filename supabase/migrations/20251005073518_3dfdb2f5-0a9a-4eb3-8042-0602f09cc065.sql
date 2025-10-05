-- Create table to store onboarding leads
CREATE TABLE public.onboarding_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  phone TEXT,
  additional_info TEXT,
  meeting_booked BOOLEAN DEFAULT false,
  meeting_booked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for lead capture)
CREATE POLICY "Anyone can submit lead information"
ON public.onboarding_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Only authenticated admins can view leads
CREATE POLICY "Admins can view all leads"
ON public.onboarding_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create index for email lookups
CREATE INDEX idx_onboarding_leads_email ON public.onboarding_leads(email);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_onboarding_leads
  BEFORE UPDATE ON public.onboarding_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();