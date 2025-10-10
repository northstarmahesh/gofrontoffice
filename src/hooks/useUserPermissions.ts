import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  can_manage_integrations: boolean;
  can_edit_prompts: boolean;
  can_toggle_assistant: boolean;
  can_change_ai_mode: boolean;
  can_edit_schedule: boolean;
  can_view_billing: boolean;
  can_manage_team: boolean;
}

export const useUserPermissions = (clinicId: string | null) => {
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_manage_integrations: false,
    can_edit_prompts: false,
    can_toggle_assistant: false,
    can_change_ai_mode: false,
    can_edit_schedule: false,
    can_view_billing: false,
    can_manage_team: false,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user is admin/owner (they have all permissions)
        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        const userIsAdmin = clinicUser?.role === 'owner' || clinicUser?.role === 'admin';
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          // Admins have all permissions
          setPermissions({
            can_manage_integrations: true,
            can_edit_prompts: true,
            can_toggle_assistant: true,
            can_change_ai_mode: true,
            can_edit_schedule: true,
            can_view_billing: true,
            can_manage_team: true,
          });
          setLoading(false);
          return;
        }

        // Load staff permissions from team_member_permissions
        const { data: clinicUserRecord } = await supabase
          .from('clinic_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (!clinicUserRecord) {
          setLoading(false);
          return;
        }

        const { data: perms } = await supabase
          .from('team_member_permissions')
          .select('*')
          .eq('clinic_user_id', clinicUserRecord.id)
          .maybeSingle();

        if (perms) {
          setPermissions({
            can_manage_integrations: perms.can_manage_integrations || false,
            can_edit_prompts: perms.can_edit_prompts || false,
            can_toggle_assistant: perms.can_toggle_assistant || false,
            can_change_ai_mode: perms.can_change_ai_mode || false,
            can_edit_schedule: perms.can_edit_schedule || false,
            can_view_billing: perms.can_view_billing || false,
            can_manage_team: perms.can_manage_team || false,
          });
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [clinicId]);

  return { permissions, loading, isAdmin };
};
