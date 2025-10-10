-- Ensure platform_admins table has proper structure for super admins
-- This table already exists, but let's make sure we can add admins by email

-- Add a comment to clarify the purpose
COMMENT ON TABLE public.platform_admins IS 'Super administrators who can view and manage all clinics and users on the platform';

-- Create a function to check if an email should be a platform admin
CREATE OR REPLACE FUNCTION public.is_email_platform_admin(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.email = check_email
  )
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_email_platform_admin(text) TO authenticated;