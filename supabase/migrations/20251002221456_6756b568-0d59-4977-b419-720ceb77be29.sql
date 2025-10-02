-- Create clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clinic_knowledge_base table
CREATE TABLE public.clinic_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT,
  answer TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clinic_schedules table
CREATE TABLE public.clinic_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clinic_phone_numbers table
CREATE TABLE public.clinic_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'sms',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clinic_users junction table (staff/admin access)
CREATE TABLE public.clinic_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- Add clinic_id to existing tables
ALTER TABLE public.activity_logs ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.draft_replies ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinics table
CREATE POLICY "Users can view their clinics"
  ON public.clinics FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic owners can update their clinic"
  ON public.clinics FOR UPDATE
  USING (
    id IN (
      SELECT clinic_id FROM public.clinic_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for clinic_knowledge_base
CREATE POLICY "Users can view knowledge base for their clinics"
  ON public.clinic_knowledge_base FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage knowledge base"
  ON public.clinic_knowledge_base FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for clinic_schedules
CREATE POLICY "Users can view schedules for their clinics"
  ON public.clinic_schedules FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage schedules"
  ON public.clinic_schedules FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for clinic_phone_numbers
CREATE POLICY "Users can view phone numbers for their clinics"
  ON public.clinic_phone_numbers FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage phone numbers"
  ON public.clinic_phone_numbers FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for clinic_users
CREATE POLICY "Users can view clinic memberships"
  ON public.clinic_users FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage clinic users"
  ON public.clinic_users FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Update RLS policies for activity_logs to include clinic_id
DROP POLICY IF EXISTS "Users can view their own logs" ON public.activity_logs;
CREATE POLICY "Users can view logs for their clinics"
  ON public.activity_logs FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

-- Update RLS policies for tasks to include clinic_id
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view tasks for their clinics"
  ON public.tasks FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clinic_knowledge_base_updated_at
  BEFORE UPDATE ON public.clinic_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clinic_schedules_updated_at
  BEFORE UPDATE ON public.clinic_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clinic_phone_numbers_updated_at
  BEFORE UPDATE ON public.clinic_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_clinic_knowledge_base_clinic_id ON public.clinic_knowledge_base(clinic_id);
CREATE INDEX idx_clinic_schedules_clinic_id ON public.clinic_schedules(clinic_id);
CREATE INDEX idx_clinic_phone_numbers_phone ON public.clinic_phone_numbers(phone_number);
CREATE INDEX idx_clinic_users_user_id ON public.clinic_users(user_id);
CREATE INDEX idx_clinic_users_clinic_id ON public.clinic_users(clinic_id);
CREATE INDEX idx_activity_logs_clinic_id ON public.activity_logs(clinic_id);
CREATE INDEX idx_tasks_clinic_id ON public.tasks(clinic_id);