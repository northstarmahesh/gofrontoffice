import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Instagram, Facebook, CheckCircle2, Building2, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ClinicManagement from "./ClinicManagement";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [phoneMode, setPhoneMode] = useState<"on" | "passive" | "off">("on");
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(true);
  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });

  // Load settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setPhoneMode(data.phone_mode as "on" | "passive" | "off");
        setAutoPilotEnabled(data.auto_pilot_enabled ?? true);
        setChannels({
          sms: data.sms_enabled,
          whatsapp: data.whatsapp_enabled,
          instagram: data.instagram_enabled,
          messenger: data.messenger_enabled,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handlePhoneModeChange = async (mode: "on" | "passive" | "off") => {
    setPhoneMode(mode);
    await updateSettings({ phone_mode: mode });
    toast.success(`Phone mode set to ${mode.toUpperCase()}`);
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

  const handleAutoPilotToggle = async () => {
    const newValue = !autoPilotEnabled;
    setAutoPilotEnabled(newValue);
    await updateSettings({ auto_pilot_enabled: newValue });
    toast.success(`Messaging mode: ${newValue ? "Autopilot" : "Co-pilot"}`);
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
          Clinic
        </TabsTrigger>
      </TabsList>

      <TabsContent value="assistant">
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Assistant Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how your assistant handles communications
            </p>
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
                    <p className="font-semibold text-foreground">Autopilot</p>
                    <p className="text-xs text-muted-foreground">AI answers calls, transcribes, summarizes, and takes action automatically</p>
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
                    <p className="font-semibold text-foreground">Co-pilot</p>
                    <p className="text-xs text-muted-foreground">AI transcribes and drafts responses, but you review before sending</p>
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
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        autoPilotEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !autoPilotEnabled
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
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        autoPilotEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !autoPilotEnabled
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
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        autoPilotEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !autoPilotEnabled
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
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        autoPilotEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Autopilot
                    </button>
                    <button
                      onClick={handleAutoPilotToggle}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        !autoPilotEnabled
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
        </div>
      </TabsContent>

      <TabsContent value="clinic">
        <ClinicManagement />
      </TabsContent>
    </Tabs>
  );
};

export default Settings;
