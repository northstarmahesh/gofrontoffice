import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Instagram, Facebook, Bot, TrendingUp, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Status = () => {
  const [loading, setLoading] = useState(true);
  const [phoneMode, setPhoneMode] = useState<"on" | "passive" | "off">("on");
  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });
  const [pendingTasksCount, setPendingTasksCount] = useState(8);

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

  const stats = [
    {
      label: "Calls Today",
      value: "12",
      change: "+15%",
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Messages",
      value: "24",
      change: "+8%",
      icon: MessageSquare,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Time Saved",
      value: "4.5h",
      change: "Today",
      icon: Clock,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Cost Saved",
      value: "$180",
      change: "This week",
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-8 w-8" />
          <h2 className="text-2xl font-bold">Good Morning! 👋</h2>
        </div>
        <p className="text-base opacity-90">
          Your assistant is active and handling all incoming communications
        </p>
      </div>

      {/* Main Controls - Phone Handling */}
      <Card className="border-0 p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Phone Calls</h3>
            <p className="text-sm text-muted-foreground">How should calls be handled?</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["on", "passive", "off"].map((mode) => (
            <button
              key={mode}
              onClick={() => handlePhoneModeChange(mode as "on" | "passive" | "off")}
              className={`rounded-xl border-2 px-6 py-4 text-base font-semibold transition-all ${
                phoneMode === mode
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:scale-102"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Messaging Channels */}
      <Card className="border-0 p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-secondary/10 p-3">
            <MessageSquare className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Messaging Channels</h3>
            <p className="text-sm text-muted-foreground">Enable or disable channels</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
              <Label htmlFor="sms" className="text-base font-semibold cursor-pointer">
                SMS
              </Label>
            </div>
            <Switch
              id="sms"
              checked={channels.sms}
              onCheckedChange={() => handleChannelToggle("sms")}
              className="scale-125"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
              <Label htmlFor="whatsapp" className="text-base font-semibold cursor-pointer">
                WhatsApp
              </Label>
            </div>
            <Switch
              id="whatsapp"
              checked={channels.whatsapp}
              onCheckedChange={() => handleChannelToggle("whatsapp")}
              className="scale-125"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <Instagram className="h-6 w-6 text-muted-foreground" />
              <Label htmlFor="instagram" className="text-base font-semibold cursor-pointer">
                Instagram DM
              </Label>
            </div>
            <Switch
              id="instagram"
              checked={channels.instagram}
              onCheckedChange={() => handleChannelToggle("instagram")}
              className="scale-125"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <Facebook className="h-6 w-6 text-muted-foreground" />
              <Label htmlFor="messenger" className="text-base font-semibold cursor-pointer">
                Messenger
              </Label>
            </div>
            <Switch
              id="messenger"
              checked={channels.messenger}
              onCheckedChange={() => handleChannelToggle("messenger")}
              className="scale-125"
            />
          </div>
        </div>
      </Card>

      {/* Pending Tasks Count */}
      <Card className="border-0 p-6 shadow-lg bg-gradient-to-br from-warning/10 to-warning/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">Pending Tasks</h3>
            <p className="text-sm text-muted-foreground">Items requiring your attention</p>
          </div>
          <Badge variant="outline" className="text-3xl font-bold px-6 py-3 bg-warning/20 border-warning text-warning">
            {pendingTasksCount}
          </Badge>
        </div>
      </Card>

      {/* Analytics - Bigger, More Visual */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">Analytics</h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="border-0 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`rounded-2xl ${stat.bgColor} p-4 mb-3`}>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-sm font-semibold text-foreground mb-1">{stat.label}</p>
                  <p className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-success' : 'text-muted-foreground'}`}>
                    {stat.change}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Status;
