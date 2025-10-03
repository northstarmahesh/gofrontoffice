import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Instagram, Facebook, Bot, TrendingUp, DollarSign, Clock, AlertCircle, ArrowRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface StatusProps {
  onNavigateToTasks?: () => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Status = ({ onNavigateToTasks }: StatusProps) => {
  const [loading, setLoading] = useState(true);
  const [phoneMode, setPhoneMode] = useState<"on" | "passive" | "off">("on");
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(true);
  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });
  const [delays, setDelays] = useState({
    sms: 3,
    whatsapp: 3,
    instagram: 3,
    messenger: 3,
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    loadSchedules();
    loadPendingTasks();
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
        setAutoPilotEnabled(data.auto_pilot_enabled ?? true);
        setChannels({
          sms: data.sms_enabled,
          whatsapp: data.whatsapp_enabled,
          instagram: data.instagram_enabled,
          messenger: data.messenger_enabled,
        });
        setDelays({
          sms: data.sms_delay_seconds ?? 3,
          whatsapp: data.whatsapp_delay_seconds ?? 3,
          instagram: data.instagram_delay_seconds ?? 3,
          messenger: data.messenger_delay_seconds ?? 3,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assistant_schedules")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week");

      if (error) throw error;

      if (data && data.length > 0) {
        setSchedules(data);
      } else {
        // Initialize default 24/7 schedule
        const defaultSchedules = DAYS.map((_, index) => ({
          day_of_week: index,
          start_time: "00:00",
          end_time: "23:59",
          is_available: true,
        }));
        setSchedules(defaultSchedules);
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  const loadPendingTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setPendingTasks(data || []);
    } catch (error) {
      console.error("Error loading pending tasks:", error);
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

  const handleDelayChange = async (channel: keyof typeof delays, value: number) => {
    setDelays((prev) => ({ ...prev, [channel]: value }));
    const updateKey = `${channel}_delay_seconds`;
    await updateSettings({ [updateKey]: value });
  };

  const handleScheduleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete existing schedules
      await supabase
        .from("assistant_schedules")
        .delete()
        .eq("user_id", user.id);

      // Insert new schedules
      const schedulesToInsert = schedules.map((schedule) => ({
        user_id: user.id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_available: schedule.is_available,
      }));

      const { error } = await supabase
        .from("assistant_schedules")
        .insert(schedulesToInsert);

      if (error) throw error;
      toast.success("Schedule saved successfully!");
      loadSchedules();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    }
  };

  const updateSchedule = (dayIndex: number, field: string, value: any) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.day_of_week === dayIndex
          ? { ...schedule, [field]: value }
          : schedule
      )
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="border-destructive/30 bg-destructive/10 text-destructive"><AlertCircle className="mr-1 h-3 w-3" />High</Badge>;
      case "medium":
        return <Badge className="border-warning/30 bg-warning/10 text-warning">Medium</Badge>;
      default:
        return <Badge className="border-muted-foreground/30 bg-muted text-muted-foreground">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Needs Attention Section - TOP */}
      {pendingTasks.length > 0 && (
        <Card className="border-0 p-6 shadow-lg bg-gradient-to-br from-warning/10 to-warning/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Needs Your Attention</h3>
              <p className="text-sm text-muted-foreground">Tasks requiring immediate action</p>
            </div>
            <Badge variant="outline" className="text-2xl font-bold px-4 py-2 bg-warning/20 border-warning text-warning">
              {pendingTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer border-0 p-4 shadow-sm transition-all hover:shadow-md bg-background"
                onClick={onNavigateToTasks}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{task.title}</h4>
                      {getPriorityBadge(task.priority)}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={onNavigateToTasks}
            >
              View All Tasks
            </Button>
          </div>
        </Card>
      )}

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
            <p className="text-sm text-muted-foreground">Choose how AI handles incoming calls</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handlePhoneModeChange("on")}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              phoneMode === "on"
                ? "border-primary bg-primary/5 shadow-md"
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
                <p className="font-bold text-foreground text-lg mb-1">Autopilot</p>
                <p className="text-sm text-muted-foreground">AI answers calls, transcribes, summarizes, and takes action automatically</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handlePhoneModeChange("passive")}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              phoneMode === "passive"
                ? "border-primary bg-primary/5 shadow-md"
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
                <p className="font-bold text-foreground text-lg mb-1">Co-pilot</p>
                <p className="text-sm text-muted-foreground">AI transcribes and drafts responses, but you review before sending</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handlePhoneModeChange("off")}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              phoneMode === "off"
                ? "border-primary bg-primary/5 shadow-md"
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
                <p className="font-bold text-foreground text-lg mb-1">Off</p>
                <p className="text-sm text-muted-foreground">AI does not handle calls</p>
              </div>
            </div>
          </button>
        </div>
      </Card>

      {/* Messaging Channels */}
      <Card className="border-0 p-6 shadow-lg">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-secondary/10 p-3">
                <MessageSquare className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Messaging Mode</h3>
                <p className="text-sm text-muted-foreground">
                  {autoPilotEnabled ? "AI replies automatically" : "AI drafts replies for your approval"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-foreground">
                {autoPilotEnabled ? "Autopilot" : "Co-pilot"}
              </span>
              <Switch
                checked={autoPilotEnabled}
                onCheckedChange={handleAutoPilotToggle}
                className="scale-125"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground mb-4">Active Channels</p>
          
          <div className="space-y-4">
            {/* SMS */}
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-3">
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
              {channels.sms && (
                <div className="flex items-center gap-2 ml-9">
                  <Label className="text-sm text-muted-foreground">Delay:</Label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={delays.sms}
                    onChange={(e) => handleDelayChange("sms", parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-3">
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
              {channels.whatsapp && (
                <div className="flex items-center gap-2 ml-9">
                  <Label className="text-sm text-muted-foreground">Delay:</Label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={delays.whatsapp}
                    onChange={(e) => handleDelayChange("whatsapp", parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              )}
            </div>

            {/* Instagram */}
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-3">
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
              {channels.instagram && (
                <div className="flex items-center gap-2 ml-9">
                  <Label className="text-sm text-muted-foreground">Delay:</Label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={delays.instagram}
                    onChange={(e) => handleDelayChange("instagram", parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              )}
            </div>

            {/* Messenger */}
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-3">
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
              {channels.messenger && (
                <div className="flex items-center gap-2 ml-9">
                  <Label className="text-sm text-muted-foreground">Delay:</Label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={delays.messenger}
                    onChange={(e) => handleDelayChange("messenger", parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Assistant Schedule */}
      <Card className="border-0 p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Assistant Schedule</h3>
            <p className="text-sm text-muted-foreground">Set when your AI assistant should work</p>
          </div>
        </div>

        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.day_of_week}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex items-center gap-2 w-32">
                <Switch
                  checked={schedule.is_available}
                  onCheckedChange={(checked) =>
                    updateSchedule(schedule.day_of_week, "is_available", checked)
                  }
                />
                <Label className="font-medium">
                  {DAYS[schedule.day_of_week]}
                </Label>
              </div>

              {schedule.is_available && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) =>
                      updateSchedule(schedule.day_of_week, "start_time", e.target.value)
                    }
                    className="px-3 py-2 border rounded-md"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) =>
                      updateSchedule(schedule.day_of_week, "end_time", e.target.value)
                    }
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
              )}

              {!schedule.is_available && (
                <span className="text-muted-foreground">Off</span>
              )}
            </div>
          ))}

          <Button onClick={handleScheduleSave} className="w-full">
            Save Schedule
          </Button>
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
