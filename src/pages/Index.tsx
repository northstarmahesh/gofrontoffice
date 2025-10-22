import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings as SettingsIcon, CreditCard, Users as UsersIcon, ChevronDown, AlertTriangle, Power, X, Bell } from "lucide-react";
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
import Settings from "@/components/Settings";
import Contacts from "@/components/Contacts";
import Tasks from "@/components/Tasks";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { useInvitationAcceptance } from "@/hooks/useInvitationAcceptance";

type View = "tasks" | "status" | "contacts" | "settings";

const Index = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>("tasks");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState<boolean | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string | undefined>(undefined);
  const [disabledLocations, setDisabledLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [selectedLocationToEnable, setSelectedLocationToEnable] = useState<string>("");
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  
  // Handle invitation acceptance after BankID redirect
  useInvitationAcceptance();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth", { replace: true });
      }
    });

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
          setCurrentView("settings");
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error("Init error:", error);
        if (mounted) {
          setLoading(false);
          navigate("/auth", { replace: true });
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
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

      if (error || !data) {
        console.error("Error checking clinic:", error);
        setHasClinic(false);
        setCurrentView("settings");
        return;
      }

      if (data) {
        setHasClinic(true);
        // Load AI system status
        await loadSystemStatus(userId, data.clinic_id);
      } else {
        setHasClinic(false);
        setCurrentView("settings");
      }
    } catch (error) {
      console.error("Error checking clinic:", error);
      setHasClinic(false);
      setCurrentView("settings");
    }
  };

  const loadSystemStatus = async (userId: string, clinicId: string) => {
    try {
      // Get all locations for this clinic
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("id, name")
        .eq("clinic_id", clinicId);

      if (locations && locations.length > 0) {
        const locationsWithDisabledAI: Array<{ id: string; name: string }> = [];

        // Check each location's AI system status
        for (const location of locations) {
          const { data: settings } = await supabase
            .from("assistant_settings")
            .select("system_enabled")
            .eq("location_id", location.id)
            .eq("user_id", userId)
            .maybeSingle();

          const isEnabled = settings?.system_enabled ?? true;
          
          if (!isEnabled) {
            locationsWithDisabledAI.push({
              id: location.id,
              name: location.name
            });
          }
        }

        setDisabledLocations(locationsWithDisabledAI);
      }
    } catch (error) {
      console.error("Error loading system status:", error);
    }
  };

  const handleEnableSystem = async () => {
    if (!user || !selectedLocationToEnable) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({ system_enabled: true })
        .eq("location_id", selectedLocationToEnable)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove the location from disabled list
      setDisabledLocations(prev => prev.filter(loc => loc.id !== selectedLocationToEnable));
      setShowEnableDialog(false);
      
      const locationName = disabledLocations.find(loc => loc.id === selectedLocationToEnable)?.name;
      toast.success(`AI Assistant activated for ${locationName}`);
    } catch (error) {
      console.error("Error enabling system:", error);
      toast.error("Failed to enable system");
    }
  };

  const openEnableDialog = (locationId: string) => {
    setSelectedLocationToEnable(locationId);
    setShowEnableDialog(true);
  };

  const dismissBanner = (locationId: string) => {
    setDismissedBanners(prev => new Set([...prev, locationId]));
  };

  // Get visible disabled locations (not dismissed in this session)
  const visibleDisabledLocations = disabledLocations.filter(
    loc => !dismissedBanners.has(loc.id)
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  useEffect(() => {
    // If user doesn't have a business, redirect to business setup for onboarding
    if (hasClinic === false && currentView !== "settings") {
      setCurrentView("settings");
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
      return <Settings />;
    }

    switch (currentView) {
      case "status":
        return <Status
          onNavigateToTasks={() => setCurrentView("tasks")}
          onNavigateToClinic={() => setCurrentView("settings")}
        />;
      case "contacts":
        return <Contacts selectedContactName={selectedContactName} onNavigateToTools={() => {
          setCurrentView("settings");
        }} />;
      case "tasks":
        return <Tasks onNavigateToContact={handleNavigateToContact} />;
      case "settings":
        return <Settings />;
      default:
        return <Status
          onNavigateToTasks={() => setCurrentView("tasks")}
          onNavigateToClinic={() => setCurrentView("settings")}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 pb-20">
      {/* Global AI System OFF Banner - Shows per location */}
      {visibleDisabledLocations.length > 0 && hasClinic && (
        <div className="space-y-0">
          {visibleDisabledLocations.map((location) => (
            <Alert key={location.id} className="rounded-none border-x-0 border-t-0 border-b border-amber-500 bg-amber-500/10 relative pr-12">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="flex items-center justify-between ml-2">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  <Power className="inline h-4 w-4 mr-1" />
                  AI Assistant is currently OFF for <strong className="font-bold">{location.name}</strong> - No automatic responses are being sent
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEnableDialog(location.id)}
                  className="ml-4 border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white whitespace-nowrap"
                >
                  Turn On Assistant
                </Button>
              </AlertDescription>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => dismissBanner(location.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-amber-700 hover:text-amber-900 hover:bg-amber-500/20"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          ))}
        </div>
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
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-[100]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/team")} className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Team</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/auth-settings")} className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Password & Login</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/notifications")} className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/usage-billing")} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Usage & Billing</span>
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
            <AlertDialogTitle>
              Activate AI Assistant for {disabledLocations.find(loc => loc.id === selectedLocationToEnable)?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will enable automatic AI responses across all configured channels for this location.</p>
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
