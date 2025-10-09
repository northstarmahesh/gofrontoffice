import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, CreditCard, Users as UsersIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [currentView, setCurrentView] = useState<View>("tasks");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null); // CRITICAL: Store session, not just user
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState<boolean | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string | undefined>(undefined);
  const [clinicTab, setClinicTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: NodeJS.Timeout;

    // Set up auth state listener FIRST (critical for catching all auth events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, 'Has session:', !!session);
      
      // Always update both session and user together
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth", { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed successfully');
        setSession(session);
        setUser(session.user);
      } else if (session?.user) {
        await checkClinicStatus(session.user.id);
      }
    });

    // Set up periodic session check (every 30 seconds)
    const checkSessionPeriodically = async () => {
      if (!mounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          return;
        }
        
        if (!session && mounted) {
          console.log('No session found during periodic check');
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        console.error('Error during session check:', error);
      }
    };

    // THEN check for existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('Initial session check:', !!session, 'Error:', error);
        
        if (error) {
          console.error('Session fetch error:', error);
          navigate("/auth", { replace: true });
          setLoading(false);
          return;
        }
        
        if (!session) {
          navigate("/auth", { replace: true });
          setLoading(false);
          return;
        }

        // Store both session and user
        setSession(session);
        setUser(session.user);
        await checkClinicStatus(session.user.id);
        
        if (mounted) {
          setLoading(false);
          // Start periodic session checks
          refreshTimer = setInterval(checkSessionPeriodically, 30000); // Check every 30 seconds
        }
      } catch (error) {
        console.error("Auth error:", error);
        if (mounted) {
          setLoading(false);
          navigate("/auth", { replace: true });
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (refreshTimer) clearInterval(refreshTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);


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
    // If user doesn't have a business, redirect to business setup for onboarding
    if (hasClinic === false && currentView !== "clinic") {
      setCurrentView("clinic");
      toast.info("Welcome! Let's set up your business first.");
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
        return <Contacts selectedContactName={selectedContactName} onNavigateToTools={() => {
          setClinicTab("tools");
          setCurrentView("clinic");
        }} />;
      case "tasks":
        return <Tasks onNavigateToContact={handleNavigateToContact} />;
      case "clinic":
        return <ClinicManagement initialTab={clinicTab} />;
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
          
          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-[100]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/team")} className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Team Mates</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Password management coming soon")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Password & Login</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
