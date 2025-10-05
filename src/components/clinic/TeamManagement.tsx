import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TeamManagementProps {
  clinicId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email: string;
  full_name?: string;
}

export const TeamManagement = ({ clinicId }: TeamManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "staff">("staff");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadTeamMembers();
    getCurrentUser();
  }, [clinicId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("clinic_users")
        .select(`
          id,
          user_id,
          role,
          profiles!inner(email, full_name)
        `)
        .eq("clinic_id", clinicId);

      if (error) throw error;

      const members = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        role: item.role,
        email: item.profiles.email,
        full_name: item.profiles.full_name,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast.error("Failed to load team members");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, check if user exists with this email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newMemberEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast.error("No user found with this email. They need to sign up first.");
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("clinic_users")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        toast.error("This user is already a team member");
        return;
      }

      // Add to clinic
      const { error: addError } = await supabase
        .from("clinic_users")
        .insert({
          clinic_id: clinicId,
          user_id: profile.id,
          role: newMemberRole,
        });

      if (addError) throw addError;

      toast.success("Team member added successfully!");
      setNewMemberEmail("");
      setNewMemberRole("staff");
      loadTeamMembers();
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast.error(error.message || "Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === currentUserId) {
      toast.error("You cannot remove yourself");
      return;
    }

    try {
      const { error } = await supabase
        .from("clinic_users")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Team member removed");
      loadTeamMembers();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      owner: "default",
      admin: "secondary",
      staff: "secondary",
    };

    return (
      <Badge variant={variants[role] || "secondary"} className="gap-1">
        <Shield className="h-3 w-3" />
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Add Team Member</CardTitle>
          </div>
          <CardDescription>
            Invite users who have already signed up to join your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                User must already have an account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newMemberRole}
                onValueChange={(value) => setNewMemberRole(value as "admin" | "staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins can manage business settings and team members
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Adding..." : "Add Team Member"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Team Members</CardTitle>
          </div>
          <CardDescription>
            Current members of your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members yet
              </p>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(member.role)}
                    {member.role !== "owner" && member.user_id !== currentUserId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.email} from your business?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
