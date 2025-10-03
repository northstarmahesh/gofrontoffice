-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_phone_per_clinic UNIQUE(clinic_id, phone)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view contacts for their clinics"
  ON public.contacts
  FOR SELECT
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Users can insert contacts for their clinics"
  ON public.contacts
  FOR INSERT
  WITH CHECK (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Users can update contacts for their clinics"
  ON public.contacts
  FOR UPDATE
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Users can delete contacts for their clinics"
  ON public.contacts
  FOR DELETE
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

-- Create trigger for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();