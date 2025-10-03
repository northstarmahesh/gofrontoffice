import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicProfile } from "./clinic/ClinicProfile";
import { KnowledgeBase } from "./clinic/KnowledgeBase";
import { ScheduleManagement } from "./clinic/ScheduleManagement";
import { PhoneNumbers } from "./clinic/PhoneNumbers";
import { TeamManagement } from "./clinic/TeamManagement";
import { ConnectedServices } from "./clinic/ConnectedServices";
import { ClinicOnboarding } from "./clinic/ClinicOnboarding";
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

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="phones">Phones</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ClinicProfile clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamManagement clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBase clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleManagement clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="phones" className="mt-6">
          <PhoneNumbers clinicId={clinicId!} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <ConnectedServices />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicManagement;
