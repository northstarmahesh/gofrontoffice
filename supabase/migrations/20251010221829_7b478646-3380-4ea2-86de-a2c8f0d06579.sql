-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.clinic_locations(id) ON DELETE CASCADE,
  
  -- Pending tasks notification settings
  pending_tasks_time TEXT NOT NULL DEFAULT '8am', -- '8am', '12pm', '8pm'
  
  -- Analytics notification settings
  analytics_frequency TEXT NOT NULL DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  
  -- Notification channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  
  -- Credit limit alerts
  credit_limit_alert_enabled BOOLEAN DEFAULT true,
  credit_limit_threshold INTEGER DEFAULT 90, -- percentage
  
  -- Auto top-up
  auto_topup_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, location_id)
);

-- Create billing and usage table
CREATE TABLE public.billing_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  
  -- Monthly subscription
  monthly_fee INTEGER DEFAULT 2950, -- kr
  setup_fee_paid BOOLEAN DEFAULT false,
  setup_fee_amount INTEGER DEFAULT 12950, -- kr
  
  -- Credits
  included_monthly_credits INTEGER DEFAULT 100,
  current_credits INTEGER DEFAULT 100,
  credits_used_this_month INTEGER DEFAULT 0,
  
  -- Auto top-up settings
  auto_topup_enabled BOOLEAN DEFAULT false,
  
  -- Billing cycle
  billing_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, clinic_id)
);

-- Create credit packages table
CREATE TABLE public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_kr INTEGER NOT NULL, -- in kronor
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price_kr, is_popular, display_order) VALUES
  ('100 krediter', 100, 225, false, 1),
  ('500 krediter', 500, 895, true, 2),
  ('1000 krediter', 1000, 1495, false, 3);

-- Create credit transactions table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'monthly_allocation'
  credits_amount INTEGER NOT NULL, -- positive for additions, negative for usage
  price_kr INTEGER, -- for purchases
  description TEXT,
  
  -- For usage tracking
  task_type TEXT, -- 'simple', 'advanced'
  related_log_id UUID REFERENCES public.activity_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for billing_usage
CREATE POLICY "Users can view billing for their clinics"
  ON public.billing_usage FOR SELECT
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Admins can manage billing for their clinics"
  ON public.billing_usage FOR ALL
  USING (user_is_clinic_admin(auth.uid(), clinic_id));

-- RLS Policies for credit_packages
CREATE POLICY "Anyone can view credit packages"
  ON public.credit_packages FOR SELECT
  USING (true);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view transactions for their clinics"
  ON public.credit_transactions FOR SELECT
  USING (user_belongs_to_clinic(auth.uid(), clinic_id));

CREATE POLICY "Users can insert transactions for their clinics"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (user_belongs_to_clinic(auth.uid(), clinic_id));

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_billing_usage_updated_at
  BEFORE UPDATE ON public.billing_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();