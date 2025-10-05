import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Shield, Key, LogIn } from "lucide-react";
import { toast } from "sonner";

interface TeamDetailsProps {
  clinicId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export const TeamDetails = ({ clinicId }: TeamDetailsProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
  }, [clinicId]);

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("clinic_users")
        .select(`
          id,
          user_id,
          role,
          created_at,
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
        created_at: item.created_at,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "staff":
        return "outline";
      default:
        return "outline";
    }
  };

  const getAccessRights = (role: string) => {
    switch (role) {
      case "owner":
        return "Full access - Can manage everything including team members";
      case "admin":
        return "Admin access - Can manage settings and team members";
      case "staff":
        return "Limited access - Can view and respond to messages";
      default:
        return "Unknown access level";
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading team...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Team Overview</CardTitle>
        </div>
        <CardDescription>
          All team members and their access levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members found
            </p>
          ) : (
            teamMembers.map((member) => (
              <Card key={member.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header with name and role */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {member.full_name || "Unknown User"}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {member.email}
                        </div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                        <Shield className="h-3 w-3" />
                        {member.role.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Access Rights */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Key className="h-4 w-4 text-primary" />
                        <span>Access Rights</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {getAccessRights(member.role)}
                      </p>
                    </div>

                    {/* Login Type */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <LogIn className="h-4 w-4 text-primary" />
                        <span>Login Type</span>
                      </div>
                      <div className="pl-6">
                        <Badge variant="outline" className="text-xs">
                          Email & Password
                        </Badge>
                      </div>
                    </div>

                    {/* Password Management */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Password Management:</span> Users manage their own passwords via account settings
                      </div>
                    </div>

                    {/* Member Since */}
                    <div className="text-xs text-muted-foreground">
                      Member since {new Date(member.created_at).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
