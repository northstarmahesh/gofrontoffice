import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Instagram, Facebook, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface ChannelSettingsProps {
  locationId: string;
}

export const ChannelSettings = ({ locationId }: ChannelSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const { permissions, isAdmin } = useUserPermissions(clinicId);
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
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    whatsapp: false,
    instagram: false,
    messenger: false,
  });

  useEffect(() => {
    loadSettings();
    checkConnectionStatus();
  }, [locationId]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get clinic ID
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clinicUser?.clinic_id) {
        setClinicId(clinicUser.clinic_id);
      }

      const { data: settings, error: settingsError } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("location_id", locationId)
        .maybeSingle();

      if (settingsError) {
        console.error("Error loading settings:", settingsError);
      }

      if (settings) {
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

  const checkConnectionStatus = async () => {
    if (!locationId) return;

    try {
      // Check phone numbers
      const { data: phoneNumbers } = await supabase
        .from("clinic_phone_numbers")
        .select("phone_number, channels, is_verified")
        .eq("location_id", locationId)
        .eq("is_active", true);

      // Check location data for social media
      const { data: locationData } = await supabase
        .from("clinic_locations")
        .select("instagram_connected, facebook_connected")
        .eq("id", locationId)
        .maybeSingle();

      const status = {
        phone: false,
        sms: false,
        whatsapp: false,
        instagram: locationData?.instagram_connected || false,
        messenger: locationData?.facebook_connected || false,
      };

      if (phoneNumbers) {
        phoneNumbers.forEach((phone) => {
          if (phone.is_verified && phone.channels) {
            if (phone.channels.includes("voice")) {
              status.phone = true;
            }
            if (phone.channels.includes("sms")) {
              status.sms = true;
            }
            if (phone.channels.includes("whatsapp")) {
              status.whatsapp = true;
            }
          }
        });
      }

      setConnectionStatus(status);
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  const updateSettings = async (updates: any) => {
    if (!locationId) return;

    try {
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

  const handlePhoneToggle = async (checked: boolean) => {
    if (!isAdmin && !permissions.can_change_ai_mode) {
      toast.error("You don't have permission to change phone mode");
      return;
    }

    const newMode = checked ? "on" : "off";
    setPhoneMode(newMode);
    await updateSettings({ phone_mode: newMode });

    toast.success(`Phone calls ${checked ? "enabled (Autopilot)" : "disabled"}`);
  };

  const handlePhoneModeChange = async (mode: "on" | "passive") => {
    if (!isAdmin && !permissions.can_change_ai_mode) {
      toast.error("You don't have permission to change phone mode");
      return;
    }

    setPhoneMode(mode);
    await updateSettings({ phone_mode: mode });

    const modeLabel = mode === "on" ? "Autopilot" : "Co-pilot";
    toast.success(`Phone mode: ${modeLabel}`);
  };

  const handleChannelToggle = async (channel: keyof typeof channels) => {
    if (!isAdmin && !permissions.can_manage_integrations) {
      toast.error("You don't have permission to toggle channels");
      return;
    }

    if (!connectionStatus[channel]) {
      toast.error(
        `Please connect ${channel.toUpperCase()} in the Integrations tab first`
      );
      return;
    }

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
    if (!isAdmin && !permissions.can_change_ai_mode) {
      toast.error("You don't have permission to change AI mode");
      return;
    }

    const newValue = !channelAutoPilot[channel];
    setChannelAutoPilot((prev) => ({ ...prev, [channel]: newValue }));

    const updateKey = `${channel}_auto_pilot`;
    await updateSettings({ [updateKey]: newValue });

    const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
    toast.success(`${channelName} mode: ${newValue ? "Autopilot" : "Co-pilot"}`);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Communication Channels */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-secondary/10 p-2.5">
            <MessageSquare className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold">Communication Channels</h3>
            <p className="text-xs text-muted-foreground">Configure each channel independently</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Phone Calls */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    {connectionStatus.phone ? "Connected" : "Not Connected"}
                  </p>
                </div>
              </div>
              <Switch
                id="phone"
                checked={phoneMode !== "off"}
                onCheckedChange={handlePhoneToggle}
              />
            </div>
            {phoneMode !== "off" && (
              <div className="flex gap-2 pl-8">
                <button
                  onClick={() => handlePhoneModeChange("on")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    phoneMode === "on"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Autopilot
                </button>
                <button
                  onClick={() => handlePhoneModeChange("passive")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    phoneMode === "passive"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Co-pilot
                </button>
              </div>
            )}
          </div>

          {/* SMS */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="sms" className="text-sm font-medium">SMS</Label>
                  {connectionStatus.sms && (
                    <p className="text-xs text-muted-foreground">Connected</p>
                  )}
                </div>
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

          {/* WhatsApp - Coming Soon */}
          <div className="rounded-lg border p-4 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Meta integration required</p>
                </div>
              </div>
              <Switch
                id="whatsapp"
                checked={false}
                disabled={true}
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="instagram" className="text-sm font-medium">Instagram DM</Label>
                  {connectionStatus.instagram && (
                    <p className="text-xs text-muted-foreground">Connected</p>
                  )}
                </div>
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
                <div>
                  <Label htmlFor="messenger" className="text-sm font-medium">Messenger</Label>
                  {connectionStatus.messenger && (
                    <p className="text-xs text-muted-foreground">Connected</p>
                  )}
                </div>
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
    </div>
  );
};
