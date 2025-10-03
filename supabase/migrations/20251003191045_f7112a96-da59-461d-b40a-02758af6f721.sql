-- Fix assistant_settings and assistant_schedules to support multiple locations per user

-- 1. Drop unique constraint on user_id in assistant_settings (if it exists)
ALTER TABLE assistant_settings DROP CONSTRAINT IF EXISTS assistant_settings_user_id_key;

-- 2. Add composite unique constraint for (user_id, location_id)
ALTER TABLE assistant_settings 
  ADD CONSTRAINT assistant_settings_user_location_unique 
  UNIQUE (user_id, location_id);

-- 3. Add composite unique constraint for assistant_schedules (user_id, location_id, day_of_week)
ALTER TABLE assistant_schedules 
  DROP CONSTRAINT IF EXISTS assistant_schedules_pkey;

ALTER TABLE assistant_schedules 
  ADD CONSTRAINT assistant_schedules_user_location_day_unique 
  UNIQUE (user_id, location_id, day_of_week);

-- 4. Add id as primary key if not exists
ALTER TABLE assistant_schedules 
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
  
ALTER TABLE assistant_schedules 
  ADD PRIMARY KEY (id);