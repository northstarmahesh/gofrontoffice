import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageSquare, Instagram, Facebook, Bot, TrendingUp, DollarSign, Clock, AlertCircle, ArrowRight, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
import { useNavigate } from "react-router-dom";

interface StatusProps {
  onNavigateToTasks?: () => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Status = ({ onNavigateToTasks }: StatusProps) => {
  const navigate = useNavigate();
  const { greeting, weather, backgroundGradient, emoji } = useGreetingAndWeather();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [messagingMode, setMessagingMode] = useState<"autopilot" | "copilot">("autopilot");
  const [channels, setChannels] = useState({
    phone: true,
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    loadLocations();
    loadSettings();
    loadSchedules();
    loadPendingTasks();
  }, []);

  const loadLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .single();

      if (clinicUsers?.clinic_id) {
        const { data: locationData } = await supabase
          .from("clinic_locations")
          .select("*")
          .eq("clinic_id", clinicUsers.clinic_id);

        if (locationData && locationData.length > 0) {
          setLocations(locationData);
          setSelectedLocation(locationData[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

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
        setMessagingMode(data.auto_pilot_enabled ? "autopilot" : "copilot");
        setChannels({
          phone: data.phone_mode !== "off",
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

  const handleChannelToggle = async (channel: keyof typeof channels) => {
    const newValue = !channels[channel];
    setChannels((prev) => ({ ...prev, [channel]: newValue }));
    
    if (channel === "phone") {
      await updateSettings({ phone_mode: newValue ? "on" : "off" });
    } else {
      const updateKey = `${channel}_enabled`;
      await updateSettings({ [updateKey]: newValue });
    }
    
    toast.success(
      `${channel.charAt(0).toUpperCase() + channel.slice(1)} ${
        newValue ? "enabled" : "disabled"
      }`
    );
  };

  const handleMessagingModeToggle = async () => {
    const newMode = messagingMode === "autopilot" ? "copilot" : "autopilot";
    setMessagingMode(newMode);
    await updateSettings({ auto_pilot_enabled: newMode === "autopilot" });
    toast.success(`Messaging mode: ${newMode === "autopilot" ? "Autopilot" : "Co-pilot"}`);
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

  if (locations.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground mb-2">No Locations Found</p>
        <p className="text-sm text-muted-foreground">Please add a location in Clinic Settings to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Tabs */}
      {locations.length > 0 && (
        <Tabs value={selectedLocation} onValueChange={setSelectedLocation} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${locations.length}, 1fr)` }}>
            {locations.map((location) => (
              <TabsTrigger key={location.id} value={location.id} className="gap-2">
                <MapPin className="h-4 w-4" />
                {location.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {locations.map((location) => (
            <TabsContent key={location.id} value={location.id} className="space-y-6 mt-6">
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
      <div className={`rounded-2xl ${backgroundGradient} p-6 text-white shadow-lg transition-all duration-1000`}>
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-8 w-8" />
          <h2 className="text-2xl font-bold">{greeting}! {emoji}</h2>
        </div>
        <p className="text-base opacity-90">
          Your assistant is active and handling all incoming communications
        </p>
        {weather && (
          <p className="mt-2 text-sm opacity-75">
            Currently {Math.round(weather.temp)}°C
          </p>
        )}
      </div>

      {/* AI Response System */}
      <Card className="border-0 p-6 shadow-lg">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-secondary/10 p-3">
                <Bot className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">AI Response System</h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-foreground">
                {messagingMode === "autopilot" ? "Autopilot" : "Co-pilot"}
              </span>
              <Switch
                checked={messagingMode === "autopilot"}
                onCheckedChange={handleMessagingModeToggle}
                className="scale-125"
              />
            </div>
          </div>

          {/* Explanation Box */}
          <div className="rounded-lg bg-muted/50 p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                {messagingMode === "autopilot" ? (
                  <>
                    <p className="font-semibold text-foreground">Autopilot Mode Active</p>
                    <p className="text-muted-foreground">
                      Your AI assistant will automatically respond to all incoming communications across enabled channels. 
                      Responses are sent immediately without your review. Perfect for high-volume scenarios where speed matters.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Co-pilot Mode Active</p>
                    <p className="text-muted-foreground">
                      Your AI assistant will draft responses and create tasks for your review. You'll see these as{" "}
                      <button
                        onClick={() => navigate("/?tab=tasks")}
                        className="text-primary hover:underline font-medium"
                      >
                        pending tasks
                      </button>
                      {" "}where you can approve, edit, or reject before sending. Ideal when you want oversight.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground mb-4">Active Channels</p>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Phone Calls */}
            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="phone" className="text-sm font-medium cursor-pointer">Phone Calls</Label>
                </div>
                <Switch
                  id="phone"
                  checked={channels.phone}
                  onCheckedChange={() => handleChannelToggle("phone")}
                />
              </div>
              {channels.phone && (
                <p className="text-xs text-muted-foreground pl-7">
                  AI {messagingMode === "autopilot" ? "answers and responds to" : "transcribes and drafts responses for"} phone calls
                </p>
              )}
            </div>

            {/* SMS */}
            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="sms" className="text-sm font-medium cursor-pointer">SMS</Label>
                </div>
                <Switch
                  id="sms"
                  checked={channels.sms}
                  onCheckedChange={() => handleChannelToggle("sms")}
                />
              </div>
              {channels.sms && (
                <p className="text-xs text-muted-foreground pl-7">
                  AI {messagingMode === "autopilot" ? "automatically replies to" : "drafts responses for"} text messages
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="whatsapp" className="text-sm font-medium cursor-pointer">WhatsApp</Label>
                </div>
                <Switch
                  id="whatsapp"
                  checked={channels.whatsapp}
                  onCheckedChange={() => handleChannelToggle("whatsapp")}
                />
              </div>
              {channels.whatsapp && (
                <p className="text-xs text-muted-foreground pl-7">
                  AI {messagingMode === "autopilot" ? "automatically replies to" : "drafts responses for"} WhatsApp messages
                </p>
              )}
            </div>

            {/* Instagram */}
            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="instagram" className="text-sm font-medium cursor-pointer">Instagram</Label>
                </div>
                <Switch
                  id="instagram"
                  checked={channels.instagram}
                  onCheckedChange={() => handleChannelToggle("instagram")}
                />
              </div>
              {channels.instagram && (
                <p className="text-xs text-muted-foreground pl-7">
                  AI {messagingMode === "autopilot" ? "automatically replies to" : "drafts responses for"} Instagram DMs
                </p>
              )}
            </div>

            {/* Messenger */}
            <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="messenger" className="text-sm font-medium cursor-pointer">Messenger</Label>
                </div>
                <Switch
                  id="messenger"
                  checked={channels.messenger}
                  onCheckedChange={() => handleChannelToggle("messenger")}
                />
              </div>
              {channels.messenger && (
                <p className="text-xs text-muted-foreground pl-7">
                  AI {messagingMode === "autopilot" ? "automatically replies to" : "drafts responses for"} Facebook messages
                </p>
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

        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.day_of_week}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              <div className="flex items-center gap-2 w-28">
                <Switch
                  checked={schedule.is_available}
                  onCheckedChange={(checked) =>
                    updateSchedule(schedule.day_of_week, "is_available", checked)
                  }
                />
                <Label className="text-sm font-medium">
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
                    className="px-2 py-1 border rounded-md text-sm w-28"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) =>
                      updateSchedule(schedule.day_of_week, "end_time", e.target.value)
                    }
                    className="px-2 py-1 border rounded-md text-sm w-28"
                  />
                </div>
              )}

              {!schedule.is_available && (
                <span className="text-muted-foreground text-sm flex-1">Closed</span>
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleScheduleSave} className="w-full mt-4">
          Save Schedule
        </Button>
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

            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default Status;
