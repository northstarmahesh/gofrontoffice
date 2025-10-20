import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Instagram, Facebook, CheckCircle2, Building2, Bot, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ClinicManagement from "./ClinicManagement";
import { ScheduleManagement } from "./clinic/ScheduleManagement";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [phoneMode, setPhoneMode] = useState<"on" | "passive" | "off">("on");
  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });
  const [channelAutoPilot, setChannelAutoPilot] = useState({
    sms: true,
    whatsapp: true,
    instagram: true,
    messenger: true,
  });

  // Load settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's clinic
      const { data: clinicUser, error: clinicUserError } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .single();

      if (clinicUserError || !clinicUser) {
        console.error("No clinic found for user");
        setLoading(false);
        return;
      }

      // Get clinic details
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", clinicUser.clinic_id)
        .single();

      setClinicName(clinic?.name || "");

      // Get first location for this clinic
      const { data: location, error: locationError } = await supabase
        .from("clinic_locations")
        .select("id, name")
        .eq("clinic_id", clinicUser.clinic_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (locationError || !location) {
        console.error("No location found for clinic");
        setLoading(false);
        return;
      }

      setLocationId(location.id);
      setLocationName(location.name);

      // Get settings for this location
      const { data: settings, error: settingsError } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("location_id", location.id)
        .maybeSingle();

      if (settingsError) {
        console.error("Error loading settings:", settingsError);
      }

      if (settings) {
        setSettingsId(settings.id);
        setPhoneMode(settings.phone_mode as "on" | "passive" | "off");
        setChannels({
          sms: settings.sms_enabled,
          whatsapp: settings.whatsapp_enabled,
          instagram: settings.instagram_enabled,
          messenger: settings.messenger_enabled,
        });
        setChannelAutoPilot({
          sms: settings.sms_auto_pilot ?? true,
          whatsapp: settings.whatsapp_auto_pilot ?? true,
          instagram: settings.instagram_auto_pilot ?? true,
          messenger: settings.messenger_auto_pilot ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: any) => {
    try {
      if (!locationId) {
        toast.error("No location configured");
        return;
      }

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("location_id", locationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handlePhoneModeChange = async (mode: "on" | "passive" | "off") => {
    setPhoneMode(mode);
    
    await updateSettings({ 
      phone_mode: mode
    });
    
    const modeLabel = mode === "on" ? "Auto-Pilot" : mode === "passive" ? "Co-Pilot" : "Off";
    toast.success(`Phone mode: ${modeLabel}`);
  };

  const handleChannelToggle = async (channel: keyof typeof channels) => {
    const newValue = !channels[channel];
    setChannels((prev) => ({ ...prev, [channel]: newValue }));
    
    const updateKey = `${channel}_enabled`;
    await updateSettings({ [updateKey]: newValue });
    
    toast.success(
      `${channel.charAt(0).toUpperCase() + channel.slice(1)} ${
        newValue ? "enabled" : "disabled"
      }`
    );
  };

  const handleChannelAutoPilotToggle = async (channel: keyof typeof channelAutoPilot) => {
    const newValue = !channelAutoPilot[channel];
    setChannelAutoPilot((prev) => ({ ...prev, [channel]: newValue }));
    
    const updateKey = `${channel}_auto_pilot`;
    await updateSettings({ [updateKey]: newValue });
    
    const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
    toast.success(`${channelName} mode: ${newValue ? "Autopilot" : "Co-pilot"}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-xl bg-primary/20" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="assistant" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="assistant" className="gap-2">
          <Bot className="h-4 w-4" />
          Assistant
        </TabsTrigger>
        <TabsTrigger value="clinic" className="gap-2">
          <Building2 className="h-4 w-4" />
          Business
        </TabsTrigger>
      </TabsList>

      <TabsContent value="assistant">
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Assistant Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how your assistant handles communications
            </p>
            {locationName && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{clinicName} • {locationName}</span>
              </div>
            )}
          </div>

          {/* Phone Settings */}
          <Card className="border-0 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Phone Calls</h3>
                <p className="text-xs text-muted-foreground">Choose how AI handles incoming calls</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handlePhoneModeChange("on")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  phoneMode === "on"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    phoneMode === "on" ? "border-primary" : "border-muted-foreground"
                  }`}>
                    {phoneMode === "on" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Auto-Pilot</p>
                    <p className="text-xs text-muted-foreground">AI answers calls and responds automatically</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePhoneModeChange("passive")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  phoneMode === "passive"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    phoneMode === "passive" ? "border-primary" : "border-muted-foreground"
                  }`}>
                    {phoneMode === "passive" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Co-Pilot</p>
                    <p className="text-xs text-muted-foreground">AI drafts responses for your review</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePhoneModeChange("off")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  phoneMode === "off"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    phoneMode === "off" ? "border-primary" : "border-muted-foreground"
                  }`}>
                    {phoneMode === "off" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Off</p>
                    <p className="text-xs text-muted-foreground">AI does not handle calls</p>
                  </div>
                </div>
              </button>
            </div>
          </Card>

          {/* Messaging Channels */}
          <Card className="border-0 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-secondary/10 p-2.5">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Messaging Channels</h3>
                <p className="text-xs text-muted-foreground">Configure mode per channel</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* SMS */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="sms" className="text-sm font-medium">SMS</Label>
                  </div>
                  <Switch
                    id="sms"
                    checked={channels.sms}
                    onCheckedChange={() => handleChannelToggle("sms")}
                  />
                </div>
                {channels.sms && (
                  <div className="flex gap-2 pl-8">
                    <button
                      onClick={() => handleChannelAutoPilotToggle("sms")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        channelAutoPilot.sms
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={() => handleChannelAutoPilotToggle("sms")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !channelAutoPilot.sms
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Co-pilot
                    </button>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                  </div>
                  <Switch
                    id="whatsapp"
                    checked={channels.whatsapp}
                    onCheckedChange={() => handleChannelToggle("whatsapp")}
                  />
                </div>
                {channels.whatsapp && (
                  <div className="flex gap-2 pl-8">
                    <button
                      onClick={() => handleChannelAutoPilotToggle("whatsapp")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        channelAutoPilot.whatsapp
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={() => handleChannelAutoPilotToggle("whatsapp")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !channelAutoPilot.whatsapp
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Co-pilot
                    </button>
                  </div>
                )}
              </div>

              {/* Instagram */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Instagram className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="instagram" className="text-sm font-medium">Instagram DM</Label>
                  </div>
                  <Switch
                    id="instagram"
                    checked={channels.instagram}
                    onCheckedChange={() => handleChannelToggle("instagram")}
                  />
                </div>
                {channels.instagram && (
                  <div className="flex gap-2 pl-8">
                    <button
                      onClick={() => handleChannelAutoPilotToggle("instagram")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        channelAutoPilot.instagram
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={() => handleChannelAutoPilotToggle("instagram")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !channelAutoPilot.instagram
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Co-pilot
                    </button>
                  </div>
                )}
              </div>

              {/* Messenger */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Facebook className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="messenger" className="text-sm font-medium">Messenger</Label>
                  </div>
                  <Switch
                    id="messenger"
                    checked={channels.messenger}
                    onCheckedChange={() => handleChannelToggle("messenger")}
                  />
                </div>
                {channels.messenger && (
                  <div className="flex gap-2 pl-8">
                    <button
                      onClick={() => handleChannelAutoPilotToggle("messenger")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        channelAutoPilot.messenger
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={() => handleChannelAutoPilotToggle("messenger")}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !channelAutoPilot.messenger
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Co-pilot
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Schedule Management */}
          {locationId && (
            <Card className="border-0 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-accent/10 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Business Hours</h3>
                  <p className="text-xs text-muted-foreground">Set when your assistant is available</p>
                </div>
              </div>
              <ScheduleManagement locationId={locationId} />
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="clinic">
        <ClinicManagement />
      </TabsContent>
    </Tabs>
  );
};

export default Settings;
