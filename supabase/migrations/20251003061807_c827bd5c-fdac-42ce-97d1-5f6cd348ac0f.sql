-- Fix the SELECT policy to allow viewing clinics immediately after creation
-- This prevents transaction rollback when the .select() call happens after insert
DROP POLICY IF EXISTS "Users can view their clinics" ON public.clinics;

CREATE POLICY "Users can view their clinics" 
ON public.clinics 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_belongs_to_clinic(auth.uid(), id) OR
    -- Allow viewing for 10 seconds after creation to account for trigger delay
    created_at > (now() - interval '10 seconds')
  )
);