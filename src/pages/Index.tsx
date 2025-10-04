import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import frontOfficeLogo from "@/assets/front-office-logo-yellow-full.png";
import Status from "@/components/Status";
import ClinicManagement from "@/components/ClinicManagement";
import Contacts from "@/components/Contacts";
import Tasks from "@/components/Tasks";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";

type View = "status" | "contacts" | "tasks" | "clinic";

const Index = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>("status");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState<boolean | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkAuthAndClinic();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkClinicStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndClinic = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await checkClinicStatus(session.user.id);
    setLoading(false);
  };

  const checkClinicStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setHasClinic(true);
      } else {
        setHasClinic(false);
        setCurrentView("clinic"); // Show clinic setup
      }
    } catch (error) {
      console.error("Error checking clinic:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  useEffect(() => {
    // If user doesn't have a clinic, redirect to clinic for onboarding
    if (hasClinic === false && currentView !== "clinic") {
      setCurrentView("clinic");
      toast.info("Welcome! Let's set up your clinic first.");
    }
  }, [hasClinic]);

  // Clear selected contact when changing views (except when going to contacts)
  useEffect(() => {
    if (currentView !== "contacts") {
      setSelectedContactName(undefined);
    }
  }, [currentView]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-2xl bg-gradient-to-br from-primary to-primary-light" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNavigateToContact = (contactName: string) => {
    setSelectedContactName(contactName);
    setCurrentView("contacts");
  };

  const renderView = () => {
    // If user hasn't completed onboarding, show only onboarding
    if (hasClinic === false) {
      return <ClinicManagement />;
    }

    switch (currentView) {
      case "status":
        return <Status onNavigateToTasks={() => setCurrentView("tasks")} onNavigateToClinic={() => setCurrentView("clinic")} />;
      case "contacts":
        return <Contacts selectedContactName={selectedContactName} />;
      case "tasks":
        return <Tasks onNavigateToContact={handleNavigateToContact} />;
      case "clinic":
        return <ClinicManagement />;
      default:
        return <Status onNavigateToTasks={() => setCurrentView("tasks")} onNavigateToClinic={() => setCurrentView("clinic")} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-yellow-accent/20 bg-card/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img 
              src={frontOfficeLogo} 
              alt="Front Office Logo" 
              className="h-20 w-auto"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Bottom Navigation - Hidden during onboarding */}
      {hasClinic && <Navigation currentView={currentView} onViewChange={setCurrentView} />}
    </div>
  );
};

export default Index;
