import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicInfo } from "./clinic/ClinicInfo";
import { ResourcesManager } from "./clinic/ResourcesManager";
import { TeamManagement } from "./clinic/TeamManagement";
import { ClinicOnboarding } from "./clinic/ClinicOnboarding";
import { IntegrationsTools } from "./clinic/IntegrationsTools";
import { toast } from "sonner";

export const ClinicManagement = () => {
  const [clinicId, setClinicId] = useState<string | null>(null);
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
        console.error("Error loading business:", error);
        toast.error("Failed to load business");
        return;
      }

      if (clinicUser) {
        setClinicId(clinicUser.clinic_id);
        setHasClinic(true);
        
        // Check if social accounts are connected to default to tools tab
        const { data: locationData } = await supabase
          .from("clinic_locations")
          .select("instagram_connected, facebook_connected")
          .eq("clinic_id", clinicUser.clinic_id)
          .limit(1)
          .maybeSingle();
        
        if (locationData && !locationData.instagram_connected && !locationData.facebook_connected) {
          setDefaultTab("tools");
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
        <h2 className="text-2xl font-bold mb-2">Your Business</h2>
        <p className="text-muted-foreground">
          Configure your business profile, knowledge base, and availability
        </p>
      </div>

      <Tabs value={defaultTab} onValueChange={setDefaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="intelligence">Assistant Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <ClinicInfo 
            clinicId={clinicId!} 
            onNavigateToTools={() => setDefaultTab("tools")}
          />
          <TeamManagement clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6">
          <ResourcesManager clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <IntegrationsTools clinicId={clinicId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicManagement;
