-- Migration: Make assistant settings and schedules location-specific instead of user-specific

-- 1. Add location_id to assistant_settings
ALTER TABLE assistant_settings 
  ADD COLUMN location_id UUID REFERENCES clinic_locations(id) ON DELETE CASCADE;

-- 2. Add location_id to assistant_schedules
ALTER TABLE assistant_schedules
  ADD COLUMN location_id UUID REFERENCES clinic_locations(id) ON DELETE CASCADE;

-- 3. Drop old RLS policies for assistant_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON assistant_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON assistant_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON assistant_settings;

-- 4. Create new RLS policies for assistant_settings based on location access
CREATE POLICY "Users can view settings for their clinic locations"
  ON assistant_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_settings.location_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update settings for their clinic locations"
  ON assistant_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_settings.location_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert settings for their clinic locations"
  ON assistant_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_settings.location_id
        AND cu.user_id = auth.uid()
    )
  );

-- 5. Drop old RLS policies for assistant_schedules
DROP POLICY IF EXISTS "Users can view their own schedule" ON assistant_schedules;
DROP POLICY IF EXISTS "Users can manage their own schedule" ON assistant_schedules;

-- 6. Create new RLS policies for assistant_schedules based on location access
CREATE POLICY "Users can view schedules for their clinic locations"
  ON assistant_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_schedules.location_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage schedules for their clinic locations"
  ON assistant_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_schedules.location_id
        AND cu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = assistant_schedules.location_id
        AND cu.user_id = auth.uid()
    )
  );

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_settings_location_id ON assistant_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_assistant_schedules_location_id ON assistant_schedules(location_id);

-- 8. Add task routing rules table for task assignment
CREATE TABLE IF NOT EXISTS task_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES clinic_locations(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('round_robin', 'specific_user', 'by_priority', 'by_source', 'manual')),
  priority_filter TEXT CHECK (priority_filter IN ('high', 'medium', 'low', 'all')),
  source_filter TEXT,
  assigned_user_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Enable RLS on task_routing_rules
ALTER TABLE task_routing_rules ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for task_routing_rules
CREATE POLICY "Users can view routing rules for their clinic locations"
  ON task_routing_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      JOIN clinic_users cu ON cl.clinic_id = cu.clinic_id
      WHERE cl.id = task_routing_rules.location_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage routing rules"
  ON task_routing_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      WHERE cl.id = task_routing_rules.location_id
        AND user_is_clinic_admin(auth.uid(), cl.clinic_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_locations cl
      WHERE cl.id = task_routing_rules.location_id
        AND user_is_clinic_admin(auth.uid(), cl.clinic_id)
    )
  );

-- 11. Add trigger for updated_at on task_routing_rules
CREATE TRIGGER update_task_routing_rules_updated_at
  BEFORE UPDATE ON task_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();