import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicInfo } from "./clinic/ClinicInfo";
import { ResourcesManager } from "./clinic/ResourcesManager";
import { TeamManagement } from "./clinic/TeamManagement";
import { ConnectedServices } from "./clinic/ConnectedServices";
import { ClinicOnboarding } from "./clinic/ClinicOnboarding";
import { IntegrationsTools } from "./clinic/IntegrationsTools";
import { TaskRouting } from "./clinic/TaskRouting";
import { toast } from "sonner";

export const ClinicManagement = () => {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>("info");

  useEffect(() => {
    loadUserClinic();
  }, []);

  const loadUserClinic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Check if user has a clinic
      const { data: clinicUser, error } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading clinic:", error);
        toast.error("Failed to load clinic");
        return;
      }

      if (clinicUser) {
        setClinicId(clinicUser.clinic_id);
        setHasClinic(true);
        
        // Load first location for this clinic
        const { data: locationData } = await supabase
          .from("clinic_locations")
          .select("id, instagram_connected, facebook_connected")
          .eq("clinic_id", clinicUser.clinic_id)
          .limit(1)
          .maybeSingle();
        
        if (locationData) {
          setLocationId(locationData.id);
          
          // If social accounts aren't connected, default to tools tab
          if (!locationData.instagram_connected && !locationData.facebook_connected) {
            setDefaultTab("tools");
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = (newClinicId: string) => {
    setClinicId(newClinicId);
    setHasClinic(true);
    // Reload to update parent state and show main app
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!hasClinic) {
    return <ClinicOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Clinic Management</h2>
        <p className="text-muted-foreground">
          Configure your clinic's profile, knowledge base, and availability
        </p>
      </div>

      <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="intelligence">Assistant Intelligence</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="routing">Task Routing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <ClinicInfo 
            clinicId={clinicId!} 
            onNavigateToTools={() => setDefaultTab("tools")}
          />
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6">
          <ResourcesManager clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <IntegrationsTools clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="routing" className="mt-6">
          {locationId ? (
            <TaskRouting clinicId={clinicId!} locationId={locationId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please create a location first to configure task routing</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamManagement clinicId={clinicId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicManagement;
