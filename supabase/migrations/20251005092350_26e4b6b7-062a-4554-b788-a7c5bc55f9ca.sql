-- Add missing RLS policies for platform_admins table

-- Allow platform admins to update admin records
CREATE POLICY "Platform admins can update admins"
ON public.platform_admins
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow platform admins to delete admin records  
CREATE POLICY "Platform admins can delete admins"
ON public.platform_admins
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Bootstrap policy: Allow first admin creation when table is empty
-- This allows the initial admin setup, after which only admins can add more admins
CREATE POLICY "Allow first admin when table is empty"
ON public.platform_admins
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.platform_admins LIMIT 1)
);