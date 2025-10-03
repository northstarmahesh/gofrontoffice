import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicInfo } from "./clinic/ClinicInfo";
import { ResourcesManager } from "./clinic/ResourcesManager";
import { TeamManagement } from "./clinic/TeamManagement";
import { ConnectedServices } from "./clinic/ConnectedServices";
import { ClinicOnboarding } from "./clinic/ClinicOnboarding";
import { IntegrationsTools } from "./clinic/IntegrationsTools";
import { toast } from "sonner";

export const ClinicManagement = () => {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState(false);

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

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="intelligence">Assistant Intelligence</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <ClinicInfo clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6">
          <ResourcesManager clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <IntegrationsTools clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamManagement clinicId={clinicId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicManagement;
