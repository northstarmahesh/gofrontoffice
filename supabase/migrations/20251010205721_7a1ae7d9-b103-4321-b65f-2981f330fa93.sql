-- Create RLS policies for clinic_users table

-- Allow users to view their own clinic associations
CREATE POLICY "Users can view their own clinic associations"
  ON clinic_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own clinic associations
CREATE POLICY "Users can create their own clinic associations"
  ON clinic_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own clinic associations
CREATE POLICY "Users can update their own clinic associations"
  ON clinic_users
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own clinic associations
CREATE POLICY "Users can delete their own clinic associations"
  ON clinic_users
  FOR DELETE
  USING (auth.uid() = user_id);