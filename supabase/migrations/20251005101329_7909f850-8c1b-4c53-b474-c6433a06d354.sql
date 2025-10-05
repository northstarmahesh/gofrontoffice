
-- Add location_id to contacts table
ALTER TABLE public.contacts
ADD COLUMN location_id uuid REFERENCES public.clinic_locations(id);

-- Add location_id to activity_logs table  
ALTER TABLE public.activity_logs
ADD COLUMN location_id uuid REFERENCES public.clinic_locations(id);

-- Create index for better query performance
CREATE INDEX idx_contacts_location_id ON public.contacts(location_id);
CREATE INDEX idx_activity_logs_location_id ON public.activity_logs(location_id);

-- Update RLS policies for contacts to include location filtering
DROP POLICY IF EXISTS "Users can view contacts for their clinics" ON public.contacts;
CREATE POLICY "Users can view contacts for their clinics"
ON public.contacts
FOR SELECT
USING (
  user_belongs_to_clinic(auth.uid(), clinic_id)
);

-- Update RLS policies for activity_logs to include location filtering
DROP POLICY IF EXISTS "Users can view logs for their clinics" ON public.activity_logs;
CREATE POLICY "Users can view logs for their clinics"
ON public.activity_logs
FOR SELECT
USING (
  user_belongs_to_clinic(auth.uid(), clinic_id)
);
