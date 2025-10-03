-- Create invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_clinic ON public.team_invitations(clinic_id);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations for their clinics
CREATE POLICY "Admins can view invitations for their clinics"
ON public.team_invitations FOR SELECT
USING (user_is_clinic_admin(auth.uid(), clinic_id));

-- Admins can create invitations for their clinics
CREATE POLICY "Admins can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (user_is_clinic_admin(auth.uid(), clinic_id));

-- Admins can delete invitations for their clinics
CREATE POLICY "Admins can delete invitations"
ON public.team_invitations FOR DELETE
USING (user_is_clinic_admin(auth.uid(), clinic_id));

-- Anyone can view invitations by token (for signup page)
CREATE POLICY "Anyone can view invitations by token"
ON public.team_invitations FOR SELECT
USING (true);