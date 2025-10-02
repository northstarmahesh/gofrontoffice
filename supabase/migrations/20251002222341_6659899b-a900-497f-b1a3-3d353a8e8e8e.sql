-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view clinic memberships" ON public.clinic_users;
DROP POLICY IF EXISTS "Owners can manage clinic users" ON public.clinic_users;

-- Create security definer function to check clinic membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_clinic(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_users
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
  )
$$;

-- Create security definer function to check if user is clinic owner/admin
CREATE OR REPLACE FUNCTION public.user_is_clinic_admin(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_users
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view clinic memberships"
  ON public.clinic_users FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );

CREATE POLICY "Owners can manage clinic users"
  ON public.clinic_users FOR ALL
  USING (
    public.user_is_clinic_admin(auth.uid(), clinic_id)
  )
  WITH CHECK (
    public.user_is_clinic_admin(auth.uid(), clinic_id)
  );

-- Also update other policies that were causing issues
DROP POLICY IF EXISTS "Users can view their clinics" ON public.clinics;
DROP POLICY IF EXISTS "Clinic owners can update their clinic" ON public.clinics;

CREATE POLICY "Users can view their clinics"
  ON public.clinics FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), id)
  );

CREATE POLICY "Clinic owners can update their clinic"
  ON public.clinics FOR UPDATE
  USING (
    public.user_is_clinic_admin(auth.uid(), id)
  );

-- Update other table policies to use the function
DROP POLICY IF EXISTS "Users can view knowledge base for their clinics" ON public.clinic_knowledge_base;
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON public.clinic_knowledge_base;

CREATE POLICY "Users can view knowledge base for their clinics"
  ON public.clinic_knowledge_base FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );

CREATE POLICY "Admins can manage knowledge base"
  ON public.clinic_knowledge_base FOR ALL
  USING (
    public.user_is_clinic_admin(auth.uid(), clinic_id)
  );

DROP POLICY IF EXISTS "Users can view schedules for their clinics" ON public.clinic_schedules;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.clinic_schedules;

CREATE POLICY "Users can view schedules for their clinics"
  ON public.clinic_schedules FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );

CREATE POLICY "Admins can manage schedules"
  ON public.clinic_schedules FOR ALL
  USING (
    public.user_is_clinic_admin(auth.uid(), clinic_id)
  );

DROP POLICY IF EXISTS "Users can view phone numbers for their clinics" ON public.clinic_phone_numbers;
DROP POLICY IF EXISTS "Admins can manage phone numbers" ON public.clinic_phone_numbers;

CREATE POLICY "Users can view phone numbers for their clinics"
  ON public.clinic_phone_numbers FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );

CREATE POLICY "Admins can manage phone numbers"
  ON public.clinic_phone_numbers FOR ALL
  USING (
    public.user_is_clinic_admin(auth.uid(), clinic_id)
  );

DROP POLICY IF EXISTS "Users can view logs for their clinics" ON public.activity_logs;

CREATE POLICY "Users can view logs for their clinics"
  ON public.activity_logs FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );

DROP POLICY IF EXISTS "Users can view tasks for their clinics" ON public.tasks;

CREATE POLICY "Users can view tasks for their clinics"
  ON public.tasks FOR SELECT
  USING (
    public.user_belongs_to_clinic(auth.uid(), clinic_id)
  );