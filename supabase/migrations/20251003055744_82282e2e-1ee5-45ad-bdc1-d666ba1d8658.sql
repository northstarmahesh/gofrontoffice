-- Create function to automatically add clinic creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_clinic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the creator as the clinic owner
  INSERT INTO public.clinic_users (clinic_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after clinic insert
CREATE TRIGGER on_clinic_created
  AFTER INSERT ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_clinic();