import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Wrench, Bot, Calendar, DollarSign, Users } from "lucide-react";

interface TeamPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicUserId: string;
  memberName: string;
  memberRole: string;
  onPermissionsUpdated: () => void;
}

interface Permissions {
  can_manage_integrations: boolean;
  can_edit_prompts: boolean;
  can_toggle_assistant: boolean;
  can_change_ai_mode: boolean;
  can_edit_schedule: boolean;
  can_view_billing: boolean;
  can_manage_team: boolean;
}

export const TeamPermissionsDialog = ({
  open,
  onOpenChange,
  clinicUserId,
  memberName,
  memberRole,
  onPermissionsUpdated,
}: TeamPermissionsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({
    can_manage_integrations: false,
    can_edit_prompts: false,
    can_toggle_assistant: false,
    can_change_ai_mode: false,
    can_edit_schedule: false,
    can_view_billing: false,
    can_manage_team: false,
  });

  const isAdminOrOwner = memberRole === 'owner' || memberRole === 'admin';

  useEffect(() => {
    if (open && clinicUserId) {
      loadPermissions();
    }
  }, [open, clinicUserId]);

  const loadPermissions = async () => {
    try {
      const { data } = await supabase
        .from('team_member_permissions')
        .select('*')
        .eq('clinic_user_id', clinicUserId)
        .maybeSingle();

      if (data) {
        setPermissions({
          can_manage_integrations: data.can_manage_integrations || false,
          can_edit_prompts: data.can_edit_prompts || false,
          can_toggle_assistant: data.can_toggle_assistant || false,
          can_change_ai_mode: data.can_change_ai_mode || false,
          can_edit_schedule: data.can_edit_schedule || false,
          can_view_billing: data.can_view_billing || false,
          can_manage_team: data.can_manage_team || false,
        });
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_member_permissions')
        .upsert({
          clinic_user_id: clinicUserId,
          ...permissions,
        });

      if (error) throw error;

      toast.success('Permissions updated successfully');
      onPermissionsUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const permissionGroups = [
    {
      title: "Tools & Integrations",
      icon: Wrench,
      items: [
        {
          key: 'can_manage_integrations' as keyof Permissions,
          label: 'Manage Integrations',
          description: 'Connect and manage external tools (calendars, CRM, booking systems)',
        },
      ],
    },
    {
      title: "AI Assistant Configuration",
      icon: Bot,
      items: [
        {
          key: 'can_edit_prompts' as keyof Permissions,
          label: 'Edit AI Prompts',
          description: 'Modify AI assistant prompts and behavior',
        },
        {
          key: 'can_toggle_assistant' as keyof Permissions,
          label: 'Enable/Disable Assistant',
          description: 'Turn the AI assistant on or off',
        },
        {
          key: 'can_change_ai_mode' as keyof Permissions,
          label: 'Change AI Mode',
          description: 'Switch between Autopilot and Copilot modes',
        },
      ],
    },
    {
      title: "Schedule Management",
      icon: Calendar,
      items: [
        {
          key: 'can_edit_schedule' as keyof Permissions,
          label: 'Edit Schedule',
          description: 'Modify assistant availability schedule',
        },
      ],
    },
    {
      title: "Billing & Finance",
      icon: DollarSign,
      items: [
        {
          key: 'can_view_billing' as keyof Permissions,
          label: 'View Billing',
          description: 'Access billing information and usage reports',
        },
      ],
    },
    {
      title: "Team Management",
      icon: Users,
      items: [
        {
          key: 'can_manage_team' as keyof Permissions,
          label: 'Manage Team',
          description: 'Add, remove, and manage team members',
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Permissions: {memberName}
          </DialogTitle>
          <DialogDescription>
            {isAdminOrOwner ? (
              <span className="text-amber-600">
                Owners and Admins automatically have all permissions. These settings cannot be changed.
              </span>
            ) : (
              "Configure what this team member can access and modify."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {permissionGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-3">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{group.title}</h3>
              </div>
              <div className="space-y-4 ml-6">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <Label htmlFor={item.key} className="font-medium cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      id={item.key}
                      checked={isAdminOrOwner ? true : permissions[item.key]}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, [item.key]: checked })
                      }
                      disabled={isAdminOrOwner}
                    />
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || isAdminOrOwner}>
            {loading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
