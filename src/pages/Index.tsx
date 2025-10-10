import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, CreditCard, Users as UsersIcon, ChevronDown, AlertTriangle, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [systemEnabled, setSystemEnabled] = useState<boolean>(true);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    
    // Aggressive fallback: force loading to false after 2 seconds no matter what
    const emergencyTimeout = setTimeout(() => {
      console.log('Emergency timeout - forcing app to load');
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth", { replace: true });
      }
    });

    // Check for existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error || !session) {
          navigate("/auth", { replace: true });
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);
        
        // Quick clinic check with timeout
        try {
          await Promise.race([
            checkClinicStatus(session.user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
          ]);
        } catch (error) {
          console.log("Clinic check timeout or error - showing onboarding");
          setHasClinic(false);
          setCurrentView("clinic");
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error("Init error:", error);
        setLoading(false);
        navigate("/auth", { replace: true });
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);


  const checkClinicStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking clinic:", error);
        setHasClinic(false);
        setCurrentView("clinic");
        return;
      }

      if (data) {
        setHasClinic(true);
        // Load AI system status
        await loadSystemStatus(userId, data.clinic_id);
      } else {
        setHasClinic(false);
        setCurrentView("clinic"); // Show clinic setup
      }
    } catch (error) {
      console.error("Error checking clinic:", error);
      setHasClinic(false);
      setCurrentView("clinic");
    }
  };

  const loadSystemStatus = async (userId: string, clinicId: string) => {
    try {
      // Get the first location for this clinic
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("id")
        .eq("clinic_id", clinicId)
        .limit(1);

      if (locations && locations.length > 0) {
        const locationId = locations[0].id;
        setSelectedLocation(locationId);

        // Get assistant settings for this location
        const { data: settings } = await supabase
          .from("assistant_settings")
          .select("system_enabled")
          .eq("location_id", locationId)
          .eq("user_id", userId)
          .maybeSingle();

        if (settings) {
          setSystemEnabled(settings.system_enabled ?? true);
        }
      }
    } catch (error) {
      console.error("Error loading system status:", error);
    }
  };

  const handleEnableSystem = async () => {
    if (!user || !selectedLocation) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({ system_enabled: true })
        .eq("location_id", selectedLocation)
        .eq("user_id", user.id);

      if (error) throw error;

      setSystemEnabled(true);
      setShowEnableDialog(false);
      toast.success("AI Assistant system activated");
    } catch (error) {
      console.error("Error enabling system:", error);
      toast.error("Failed to enable system");
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
      {/* Global AI System OFF Banner */}
      {!systemEnabled && hasClinic && (
        <Alert className="rounded-none border-x-0 border-t-0 border-b-2 border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="flex items-center justify-between ml-2">
            <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
              <Power className="inline h-4 w-4 mr-1" />
              AI Assistant is currently OFF - No automatic responses are being sent
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowEnableDialog(true)}
              className="ml-4 border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white"
            >
              Turn On Assistant
            </Button>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Confirmation Dialog for Enabling System */}
      <AlertDialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Assistant?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will enable automatic AI responses across all configured channels.</p>
              <p className="font-medium text-foreground">
                The AI will start handling customer communication immediately based on your current settings.
              </p>
              <p className="text-sm text-muted-foreground">
                You can turn off the system or adjust individual channel settings at any time in the Status tab.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnableSystem} className="bg-green-600 hover:bg-green-700">
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
