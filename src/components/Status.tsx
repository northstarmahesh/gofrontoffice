import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, MessageSquare, Instagram, Facebook, Bot, TrendingUp, DollarSign, Clock, AlertCircle, ArrowRight, Calendar, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
interface StatusProps {
  onNavigateToTasks?: () => void;
  onNavigateToClinic?: () => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Status = ({ onNavigateToTasks, onNavigateToClinic }: StatusProps) => {
  const { greeting, weather, backgroundGradient, emoji } = useGreetingAndWeather();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [aiSystemOpen, setAiSystemOpen] = useState(true);
  const [channels, setChannels] = useState({
    phone: true,
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
  });
  const [channelModes, setChannelModes] = useState({
    phone: "autopilot" as "autopilot" | "copilot",
    sms: "autopilot" as "autopilot" | "copilot",
    whatsapp: "autopilot" as "autopilot" | "copilot",
    instagram: "autopilot" as "autopilot" | "copilot",
    messenger: "autopilot" as "autopilot" | "copilot",
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    whatsapp: false,
    instagram: false,
    messenger: false,
  });
  const [connectedNumbers, setConnectedNumbers] = useState<{
    phone?: string;
    sms?: string;
    whatsapp?: string;
  }>({});

  useEffect(() => {
    loadLocations();
    loadPendingTasks();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setLoading(true);
      loadSettings();
      loadSchedules();
      checkConnectionStatus();

      // Set up real-time subscription for phone number changes
      const channel = supabase
        .channel(`phone-numbers-${selectedLocation}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clinic_phone_numbers',
            filter: `location_id=eq.${selectedLocation}`
          },
          () => {
            console.log('Phone number changed, refreshing status...');
            checkConnectionStatus();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedLocation]);

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
    if (!selectedLocation) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("location_id", selectedLocation)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading settings:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const globalMode = data.auto_pilot_enabled ? "autopilot" : "copilot";
        setChannels({
          phone: data.phone_mode !== "off",
          sms: data.sms_enabled,
          whatsapp: data.whatsapp_enabled,
          instagram: data.instagram_enabled,
          messenger: data.messenger_enabled,
        });
        setChannelModes({
          phone: globalMode,
          sms: globalMode,
          whatsapp: globalMode,
          instagram: globalMode,
          messenger: globalMode,
        });
      } else {
        // Create default settings for this location
        const { error: insertError } = await supabase
          .from("assistant_settings")
          .insert({
            user_id: user.id,
            location_id: selectedLocation,
            auto_pilot_enabled: true,
            phone_mode: 'on',
            sms_enabled: true,
            whatsapp_enabled: true,
            instagram_enabled: false,
            messenger_enabled: false,
          });
        
        if (insertError) {
          console.error("Error creating default settings:", insertError);
        } else {
          // Reload after creating defaults
          await loadSettings();
          return;
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedLocation) return;
    
    try {
      const { data, error } = await supabase
        .from("assistant_schedules")
        .select("*")
        .eq("location_id", selectedLocation)
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

  const checkConnectionStatus = async () => {
    if (!selectedLocation) return;

    try {
      // Check phone numbers
      const { data: phoneNumbers } = await supabase
        .from("clinic_phone_numbers")
        .select("phone_number, channels, is_verified")
        .eq("location_id", selectedLocation)
        .eq("is_active", true);

      // Check current location data for social media
      const currentLocation = locations.find(l => l.id === selectedLocation);

      const status = {
        phone: false,
        sms: false,
        whatsapp: false,
        instagram: currentLocation?.instagram_connected || false,
        messenger: currentLocation?.facebook_connected || false,
      };

      const numbers: { phone?: string; sms?: string; whatsapp?: string } = {};

      if (phoneNumbers) {
        phoneNumbers.forEach((phone) => {
          if (phone.is_verified && phone.channels) {
            if (phone.channels.includes("voice")) {
              status.phone = true;
              numbers.phone = phone.phone_number;
            }
            if (phone.channels.includes("sms")) {
              status.sms = true;
              numbers.sms = phone.phone_number;
            }
            if (phone.channels.includes("whatsapp")) {
              status.whatsapp = true;
              numbers.whatsapp = phone.phone_number;
            }
          }
        });
      }

      setConnectionStatus(status);
      setConnectedNumbers(numbers);
    } catch (error) {
      console.error("Error checking connection status:", error);
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
    if (!selectedLocation) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("location_id", selectedLocation)
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

  const handleChannelModeToggle = async (channel: keyof typeof channelModes) => {
    const newMode = channelModes[channel] === "autopilot" ? "copilot" : "autopilot";
    setChannelModes((prev) => ({ ...prev, [channel]: newMode }));
    
    // Update the global setting based on if any channel is in autopilot
    const anyAutopilot = Object.entries({ ...channelModes, [channel]: newMode }).some(
      ([key, mode]) => channels[key as keyof typeof channels] && mode === "autopilot"
    );
    await updateSettings({ auto_pilot_enabled: anyAutopilot });
    
    toast.success(
      `${channel.charAt(0).toUpperCase() + channel.slice(1)}: ${newMode === "autopilot" ? "Autopilot" : "Co-pilot"}`
    );
  };


  const handleScheduleSave = async () => {
    if (!selectedLocation) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete existing schedules for this location
      await supabase
        .from("assistant_schedules")
        .delete()
        .eq("location_id", selectedLocation);

      // Insert new schedules
      const schedulesToInsert = schedules.map((schedule) => ({
        user_id: user.id,
        location_id: selectedLocation,
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

      {/* AI Response System - Collapsible */}
      <Card className="border-0 p-6 shadow-lg">
        <Collapsible open={aiSystemOpen} onOpenChange={setAiSystemOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-secondary/10 p-3">
                  <Bot className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-foreground">AI Response System</h3>
                  <p className="text-sm text-muted-foreground">
                    {aiSystemOpen ? "Configure how AI handles each channel" : "Click to expand channel settings"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${aiSystemOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-6">
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-muted-foreground mb-4">Channel Settings</p>
          
          <div className="grid gap-3">
            {/* Phone Calls */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="phone" className="text-sm font-semibold cursor-pointer">Phone Calls</Label>
                      {!connectionStatus.phone && (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    {connectionStatus.phone && connectedNumbers.phone && (
                      <p className="text-xs text-muted-foreground">{connectedNumbers.phone}</p>
                    )}
                  </div>
                </div>
                <Switch
                  id="phone"
                  checked={channels.phone}
                  onCheckedChange={() => handleChannelToggle("phone")}
                  disabled={!connectionStatus.phone}
                />
              </div>
              {!connectionStatus.phone ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Setup Required</p>
                  <p>Connect a phone number to enable voice calls.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={onNavigateToClinic}
                  >
                    Go to Integrations & Tools →
                  </Button>
                </div>
              ) : channels.phone && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.phone === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.phone === "autopilot" && handleChannelModeToggle("phone")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.phone === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.phone === "copilot" && handleChannelModeToggle("phone")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.phone === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI transcribes calls and creates{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to review and respond
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI answers calls and responds immediately without your review
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SMS */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sms" className="text-sm font-semibold cursor-pointer">SMS</Label>
                      {!connectionStatus.sms && (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    {connectionStatus.sms && connectedNumbers.sms && (
                      <p className="text-xs text-muted-foreground">{connectedNumbers.sms}</p>
                    )}
                  </div>
                </div>
                <Switch
                  id="sms"
                  checked={channels.sms}
                  onCheckedChange={() => handleChannelToggle("sms")}
                  disabled={!connectionStatus.sms}
                />
              </div>
              {!connectionStatus.sms ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Setup Required</p>
                  <p>Connect a phone number with SMS capability.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={onNavigateToClinic}
                  >
                    Go to Integrations & Tools →
                  </Button>
                </div>
              ) : channels.sms && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.sms === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.sms === "autopilot" && handleChannelModeToggle("sms")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.sms === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.sms === "copilot" && handleChannelModeToggle("sms")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.sms === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI drafts SMS replies as{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to approve before sending
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI sends SMS replies automatically without your review
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="whatsapp" className="text-sm font-semibold cursor-pointer">WhatsApp</Label>
                      {!connectionStatus.whatsapp && (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    {connectionStatus.whatsapp && connectedNumbers.whatsapp && (
                      <p className="text-xs text-muted-foreground">{connectedNumbers.whatsapp}</p>
                    )}
                  </div>
                </div>
                <Switch
                  id="whatsapp"
                  checked={channels.whatsapp}
                  onCheckedChange={() => handleChannelToggle("whatsapp")}
                  disabled={!connectionStatus.whatsapp}
                />
              </div>
              {!connectionStatus.whatsapp ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Setup Required</p>
                  <p>Connect a WhatsApp Business number.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={onNavigateToClinic}
                  >
                    Go to Integrations & Tools →
                  </Button>
                </div>
              ) : channels.whatsapp && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.whatsapp === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.whatsapp === "autopilot" && handleChannelModeToggle("whatsapp")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.whatsapp === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.whatsapp === "copilot" && handleChannelModeToggle("whatsapp")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.whatsapp === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI drafts WhatsApp replies as{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to approve before sending
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI sends WhatsApp replies automatically without your review
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instagram */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="instagram" className="text-sm font-semibold cursor-pointer">Instagram</Label>
                    {!connectionStatus.instagram && (
                      <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  id="instagram"
                  checked={channels.instagram}
                  onCheckedChange={() => handleChannelToggle("instagram")}
                  disabled={!connectionStatus.instagram}
                />
              </div>
              {!connectionStatus.instagram ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Setup Required</p>
                  <p>Connect your Instagram account.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={onNavigateToClinic}
                  >
                    Go to Integrations & Tools →
                  </Button>
                </div>
              ) : channels.instagram && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.instagram === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.instagram === "autopilot" && handleChannelModeToggle("instagram")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.instagram === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.instagram === "copilot" && handleChannelModeToggle("instagram")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.instagram === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI drafts Instagram replies as{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to approve before sending
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI sends Instagram replies automatically without your review
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messenger */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Facebook className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="messenger" className="text-sm font-semibold cursor-pointer">Messenger</Label>
                    {!connectionStatus.messenger && (
                      <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  id="messenger"
                  checked={channels.messenger}
                  onCheckedChange={() => handleChannelToggle("messenger")}
                  disabled={!connectionStatus.messenger}
                />
              </div>
              {!connectionStatus.messenger ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Setup Required</p>
                  <p>Connect your Facebook Messenger.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={onNavigateToClinic}
                  >
                    Go to Integrations & Tools →
                  </Button>
                </div>
              ) : channels.messenger && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.messenger === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.messenger === "autopilot" && handleChannelModeToggle("messenger")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.messenger === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.messenger === "copilot" && handleChannelModeToggle("messenger")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.messenger === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI drafts Messenger replies as{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to approve before sending
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI sends Messenger replies automatically without your review
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Assistant Schedule - Collapsible */}
      <Card className="border-0 p-6 shadow-lg">
        <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-foreground">Assistant Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    {scheduleOpen ? "Set when your AI assistant should work" : "Click to expand schedule settings"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${scheduleOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-6">
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
          </CollapsibleContent>
        </Collapsible>
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
