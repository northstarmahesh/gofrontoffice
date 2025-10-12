-- Drop the restrictive policy that only allows platform admins to create clinics
DROP POLICY IF EXISTS "Only platform admins can create clinics" ON public.clinics;

-- Create new policy allowing any authenticated user to create their own clinic
CREATE POLICY "Authenticated users can create clinics"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment explaining the security model
COMMENT ON POLICY "Authenticated users can create clinics" ON public.clinics IS 
'Allows self-service clinic creation for micro-SaaS model. Security is maintained via:
- Users automatically become owners via handle_new_clinic() trigger
- SELECT policies ensure users only see their own clinics
- UPDATE/DELETE policies require admin privileges';
