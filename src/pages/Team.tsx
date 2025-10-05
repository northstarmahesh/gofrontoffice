import { useState, useEffect } from "react";
import { Users, LogOut, Settings, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TeamDetails } from "@/components/clinic/TeamDetails";
import { TeamManagement } from "@/components/clinic/TeamManagement";
import frontOfficeLogo from "@/assets/front-office-logo-yellow-full.png";

const Team = () => {
  const navigate = useNavigate();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadClinicData();
  }, []);

  const loadClinicData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      setUserName(profile?.full_name || profile?.email || "User");

      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clinicUser?.clinic_id) {
        setClinicId(clinicUser.clinic_id);
      }
    } catch (error) {
      console.error("Error loading clinic:", error);
      toast.error("Failed to load clinic data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={frontOfficeLogo} alt="Front Office" className="h-8" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{userName}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate("/team")}
                className="cursor-pointer bg-primary/10 text-primary font-medium"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Team Mates</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate("/")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Business Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage team members and their access levels
              </p>
            </div>
          </div>
        </div>

        {/* Team Management Component */}
        {loading ? (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">Loading team data...</p>
          </Card>
        ) : clinicId ? (
          <div className="space-y-6">
            <TeamManagement clinicId={clinicId} />
            <TeamDetails clinicId={clinicId} />
          </div>
        ) : (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">No clinic found</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Team;
