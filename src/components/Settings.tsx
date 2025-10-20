import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Waves, Calendar, Building2, Plug, Users } from "lucide-react";
import ClinicManagement from "./ClinicManagement";
import { ScheduleManagement } from "./clinic/ScheduleManagement";
import { TeamManagement } from "./clinic/TeamManagement";
import { IntegrationsTools } from "./clinic/IntegrationsTools";
import { ChannelSettings } from "./settings/ChannelSettings";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [hasClinic, setHasClinic] = useState(false);

  useEffect(() => {
    loadUserClinic();
  }, []);

  const loadUserClinic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: clinicUser, error } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading business:", error);
        setLoading(false);
        return;
      }

      if (clinicUser) {
        setClinicId(clinicUser.clinic_id);
        setHasClinic(true);

        // Get first location
        const { data: locationData } = await supabase
          .from("clinic_locations")
          .select("id")
          .eq("clinic_id", clinicUser.clinic_id)
          .limit(1)
          .maybeSingle();

        if (locationData) {
          setLocationId(locationData.id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show onboarding if no clinic
  if (!hasClinic) {
    return <ClinicManagement />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-muted-foreground">
          Manage channels, schedule, business info, and team
        </p>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="channels" className="gap-2">
            <Waves className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Tools</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {locationId && <ChannelSettings locationId={locationId} />}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {locationId && <ScheduleManagement locationId={locationId} />}
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          {clinicId && <ClinicManagement />}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          {clinicId && <IntegrationsTools clinicId={clinicId} />}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {clinicId && <TeamManagement clinicId={clinicId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
