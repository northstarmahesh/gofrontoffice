-- Create platform admins table
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check platform admin status
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- RLS policies for platform_admins
CREATE POLICY "Platform admins can view all admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only platform admins can insert admins"
ON public.platform_admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Add status to clinics table
ALTER TABLE public.clinics
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('pending_setup', 'active', 'suspended'));

-- Add prepared_by field to track which admin created the clinic
ALTER TABLE public.clinics
ADD COLUMN prepared_by_admin_id UUID REFERENCES public.platform_admins(id);

-- Update clinic policies to allow platform admins full access
CREATE POLICY "Platform admins can view all clinics"
ON public.clinics
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR (auth.uid() IS NOT NULL AND user_belongs_to_clinic(auth.uid(), id)));

CREATE POLICY "Platform admins can update all clinics"
ON public.clinics
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR user_is_clinic_admin(auth.uid(), id));

-- Allow platform admins to manage clinic users
CREATE POLICY "Platform admins can manage all clinic users"
ON public.clinic_users
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR user_is_clinic_admin(auth.uid(), clinic_id))
WITH CHECK (public.is_platform_admin(auth.uid()) OR user_is_clinic_admin(auth.uid(), clinic_id));