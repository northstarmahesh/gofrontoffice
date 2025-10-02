-- Add INSERT policy for clinics table
CREATE POLICY "Authenticated users can create clinics"
  ON public.clinics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add INSERT policy for clinic_users table
CREATE POLICY "Users can add themselves to clinics"
  ON public.clinic_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);