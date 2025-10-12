-- Drop the overly permissive policy that allows any authenticated user to create clinics
DROP POLICY IF EXISTS "Authenticated users can create clinics" ON public.clinics;

-- Create a policy that only allows platform admins to create clinics
CREATE POLICY "Only platform admins can create clinics"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

-- Ensure platform admins can delete clinics if needed for management
DROP POLICY IF EXISTS "Platform admins can delete clinics" ON public.clinics;
CREATE POLICY "Platform admins can delete clinics"
ON public.clinics
FOR DELETE
TO authenticated
USING (is_platform_admin(auth.uid()));