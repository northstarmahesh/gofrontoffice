import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Instagram, Facebook, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [phoneMode, setPhoneMode] = useState<"on" | "passive" | "off">("on");
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

  const integrations = [
    { name: "Calendar", status: "connected", icon: CheckCircle2 },
    { name: "Email", status: "connected", icon: CheckCircle2 },
    { name: "Booking System", status: "pending", icon: CheckCircle2 },
    { name: "CRM", status: "pending", icon: CheckCircle2 },
    { name: "Knowledge Base", status: "connected", icon: CheckCircle2 },
  ];

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
            <p className="text-xs text-muted-foreground">How should calls be handled?</p>
          </div>
        </div>

        <div className="flex gap-2">
          {["on", "passive", "off"].map((mode) => (
            <button
              key={mode}
              onClick={() => handlePhoneModeChange(mode as "on" | "passive" | "off")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                phoneMode === mode
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
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
            <p className="text-xs text-muted-foreground">Enable or disable channels</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="sms" className="text-sm font-medium">
                SMS
              </Label>
            </div>
            <Switch
              id="sms"
              checked={channels.sms}
              onCheckedChange={() => handleChannelToggle("sms")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="whatsapp" className="text-sm font-medium">
                WhatsApp
              </Label>
            </div>
            <Switch
              id="whatsapp"
              checked={channels.whatsapp}
              onCheckedChange={() => handleChannelToggle("whatsapp")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="instagram" className="text-sm font-medium">
                Instagram DM
              </Label>
            </div>
            <Switch
              id="instagram"
              checked={channels.instagram}
              onCheckedChange={() => handleChannelToggle("instagram")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Facebook className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="messenger" className="text-sm font-medium">
                Messenger
              </Label>
            </div>
            <Switch
              id="messenger"
              checked={channels.messenger}
              onCheckedChange={() => handleChannelToggle("messenger")}
            />
          </div>
        </div>
      </Card>

      {/* Integrations */}
      <Card className="border-0 p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Connected Services</h3>
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{integration.name}</span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  integration.status === "connected"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {integration.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Settings;
