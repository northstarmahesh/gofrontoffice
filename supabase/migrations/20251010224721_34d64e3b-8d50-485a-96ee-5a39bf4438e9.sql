-- Create team_member_permissions table for granular access control
CREATE TABLE team_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_user_id UUID NOT NULL REFERENCES clinic_users(id) ON DELETE CASCADE,
  
  -- Integration & Tools Permissions
  can_manage_integrations BOOLEAN DEFAULT false,
  
  -- AI Configuration Permissions
  can_edit_prompts BOOLEAN DEFAULT false,
  can_toggle_assistant BOOLEAN DEFAULT false,
  can_change_ai_mode BOOLEAN DEFAULT false,
  can_edit_schedule BOOLEAN DEFAULT false,
  
  -- Additional Permissions
  can_view_billing BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(clinic_user_id)
);

-- Enable RLS
ALTER TABLE team_member_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage permissions
CREATE POLICY "Admins can manage permissions"
ON team_member_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clinic_users cu
    WHERE cu.id = team_member_permissions.clinic_user_id
    AND user_is_clinic_admin(auth.uid(), cu.clinic_id)
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON team_member_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clinic_users cu
    WHERE cu.id = team_member_permissions.clinic_user_id
    AND cu.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER handle_team_member_permissions_updated_at
  BEFORE UPDATE ON team_member_permissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create helper function for permission checks
CREATE OR REPLACE FUNCTION user_has_permission(
  _user_id UUID,
  _clinic_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owners and admins always have all permissions
  SELECT CASE
    WHEN user_is_clinic_admin(_user_id, _clinic_id) THEN true
    ELSE (
      SELECT CASE _permission
        WHEN 'manage_integrations' THEN COALESCE(tmp.can_manage_integrations, false)
        WHEN 'edit_prompts' THEN COALESCE(tmp.can_edit_prompts, false)
        WHEN 'toggle_assistant' THEN COALESCE(tmp.can_toggle_assistant, false)
        WHEN 'change_ai_mode' THEN COALESCE(tmp.can_change_ai_mode, false)
        WHEN 'edit_schedule' THEN COALESCE(tmp.can_edit_schedule, false)
        WHEN 'view_billing' THEN COALESCE(tmp.can_view_billing, false)
        WHEN 'manage_team' THEN COALESCE(tmp.can_manage_team, false)
        ELSE false
      END
      FROM team_member_permissions tmp
      JOIN clinic_users cu ON cu.id = tmp.clinic_user_id
      WHERE cu.user_id = _user_id
        AND cu.clinic_id = _clinic_id
      LIMIT 1
    )
  END;
$$;