-- Add delay settings to assistant_settings table
ALTER TABLE public.assistant_settings 
ADD COLUMN sms_delay_seconds INTEGER DEFAULT 3,
ADD COLUMN whatsapp_delay_seconds INTEGER DEFAULT 3,
ADD COLUMN instagram_delay_seconds INTEGER DEFAULT 3,
ADD COLUMN messenger_delay_seconds INTEGER DEFAULT 3;

-- Add assistant schedule table (simplified - just on/off times for each day)
CREATE TABLE public.assistant_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '00:00',
  end_time TIME NOT NULL DEFAULT '23:59',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.assistant_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view their own schedule
CREATE POLICY "Users can view their own schedule"
ON public.assistant_schedules FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own schedule
CREATE POLICY "Users can manage their own schedule"
ON public.assistant_schedules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_assistant_schedules_updated_at
BEFORE UPDATE ON public.assistant_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();