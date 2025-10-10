-- Add columns to team_invitations for BankID invitation system
ALTER TABLE team_invitations 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS personal_number TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the permissions structure
COMMENT ON COLUMN team_invitations.permissions IS 'JSONB object storing invited user permissions: {can_manage_integrations, can_edit_prompts, can_toggle_assistant, can_change_ai_mode, can_edit_schedule, can_view_billing, can_manage_team}';