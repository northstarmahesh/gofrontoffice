import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, MessageSquare, Instagram, Facebook, Mail, Bot, TrendingUp, DollarSign, Clock, Calendar as CalendarIcon, MapPin, ChevronDown, Power, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
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
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  const [channels, setChannels] = useState({
    phone: true,
    sms: true,
    whatsapp: true,
    instagram: false,
    messenger: false,
    email: false,
  });
  const [channelModes, setChannelModes] = useState({
    phone: "autopilot" as "autopilot" | "copilot",
    sms: "autopilot" as "autopilot" | "copilot",
    whatsapp: "autopilot" as "autopilot" | "copilot",
    instagram: "autopilot" as "autopilot" | "copilot",
    messenger: "autopilot" as "autopilot" | "copilot",
    email: "autopilot" as "autopilot" | "copilot",
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    whatsapp: false,
    instagram: false,
    messenger: false,
    email: false,
  });
  const [connectedNumbers, setConnectedNumbers] = useState<{
    phone?: string;
    sms?: string;
    whatsapp?: string;
  }>({});

  useEffect(() => {
    loadLocations();
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
        setSystemEnabled(data.system_enabled ?? true);
        setChannels({
          phone: data.phone_mode !== "off",
          sms: data.sms_enabled,
          whatsapp: data.whatsapp_enabled,
          instagram: data.instagram_enabled,
          messenger: data.messenger_enabled,
          email: true, // Email is always available
        });
        setChannelModes({
          phone: globalMode,
          sms: globalMode,
          whatsapp: globalMode,
          instagram: globalMode,
          messenger: globalMode,
          email: globalMode,
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
      // Get clinic ID first to check if it's a demo account
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let isDemoAccount = false;
      if (clinicUsers?.clinic_id) {
        const { data: clinicData } = await supabase
          .from("clinics")
          .select("is_demo_account")
          .eq("id", clinicUsers.clinic_id)
          .maybeSingle();
        
        isDemoAccount = clinicData?.is_demo_account || false;
      }

      // Check phone numbers
      const { data: phoneNumbers } = await supabase
        .from("clinic_phone_numbers")
        .select("phone_number, channels, is_verified")
        .eq("location_id", selectedLocation)
        .eq("is_active", true);

      // Check current location data for social media
      const currentLocation = locations.find(l => l.id === selectedLocation);

      const status = {
        phone: isDemoAccount || false,
        sms: isDemoAccount || false,
        whatsapp: isDemoAccount || false,
        instagram: isDemoAccount || currentLocation?.instagram_connected || false,
        messenger: isDemoAccount || currentLocation?.facebook_connected || false,
        email: isDemoAccount || true, // Email always available for demo accounts
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
    // Check if channel is connected first
    if (!connectionStatus[channel]) {
      toast.error(
        `Please connect ${channel.toUpperCase()} in Integrations & Tools first`,
        {
          description: "You need to set up this channel before enabling it.",
          action: {
            label: "Go to Tools",
            onClick: () => onNavigateToClinic?.()
          }
        }
      );
      return;
    }

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

  const handleSystemToggle = async (newValue: boolean) => {
    if (newValue) {
      setShowEnableDialog(true);
    } else {
      setSystemEnabled(false);
      await updateSettings({ system_enabled: false });
      toast.success("AI Assistant system disabled");
    }
  };

  const confirmSystemEnable = async () => {
    setSystemEnabled(true);
    await updateSettings({ system_enabled: true });
    setShowEnableDialog(false);
    toast.success("AI Assistant system activated");
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Date', 'Calls', 'Messages', 'Time Saved', 'Cost Saved'],
      ...weeklyStats.map(stat => [
        stat.day,
        stat.calls.toString(),
        stat.messages.toString(),
        '0.5h', // Mock data
        '$20'   // Mock data
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const locationName = locations.find(l => l.id === selectedLocation)?.name || 'location';
    const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
    const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
    a.download = `analytics_${locationName}_${fromDate}_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  };

  const weeklyStats = [
    { day: "Mon", calls: 3, messages: 5 },
    { day: "Tue", calls: 5, messages: 8 },
    { day: "Wed", calls: 4, messages: 6 },
    { day: "Thu", calls: 6, messages: 9 },
    { day: "Fri", calls: 7, messages: 10 },
    { day: "Sat", calls: 2, messages: 4 },
    { day: "Sun", calls: 1, messages: 2 },
  ];


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
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Time Saved",
      value: "4.5h",
      change: "Today",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Cost Saved",
      value: "$180",
      change: "This week",
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (locations.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground mb-2">No Locations Found</p>
        <p className="text-sm text-muted-foreground">Please add a location in Business Settings to get started.</p>
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
              {/* Master AI System Switch */}
              <Card className="border-2 border-primary/30 p-6 shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "rounded-2xl p-4 border-2 transition-all",
                      systemEnabled 
                        ? "bg-green-500/20 border-green-500/40" 
                        : "bg-muted border-border"
                    )}>
                      <Power className={cn(
                        "h-8 w-8 transition-colors",
                        systemEnabled ? "text-green-600" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        AI Assistant System
                        <Badge className={cn(
                          "text-sm font-semibold",
                          systemEnabled 
                            ? "bg-green-500/20 text-green-700 border-green-500/30" 
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          {systemEnabled ? "Active" : "Inactive"}
                        </Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {systemEnabled 
                          ? "AI is handling customer communication according to your settings" 
                          : "All automatic AI responses are paused"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={systemEnabled}
                    onCheckedChange={handleSystemToggle}
                    className="data-[state=checked]:bg-green-600 scale-150"
                  />
                </div>
              </Card>

              {/* Analytics Section - TOP */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">Analytics</h3>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {dateRange.from && dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                            </>
                          ) : (
                            "Select date range"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => range && setDateRange(range)}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportCSV}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    const isPositive = stat.change.startsWith('+');
                    const isNegative = stat.change.startsWith('-');
                    
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
                          <Badge 
                            className={cn(
                              "text-xs font-medium",
                              isPositive && "bg-green-500/10 text-green-600 border-green-500/30",
                              isNegative && "bg-red-500/10 text-red-600 border-red-500/30",
                              !isPositive && !isNegative && "bg-muted text-muted-foreground"
                            )}
                          >
                            {stat.change}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

      {/* AI Response System - Collapsible */}
      <Card className={cn(
        "border-2 p-6 shadow-lg bg-gradient-to-br transition-all",
        systemEnabled 
          ? "border-primary/20 from-primary/5 to-primary/10" 
          : "border-border from-muted/30 to-muted/10 opacity-60"
      )}>
        <Collapsible open={aiSystemOpen} onOpenChange={setAiSystemOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-xl p-3 border-2",
                  systemEnabled 
                    ? "bg-primary/20 border-primary/30" 
                    : "bg-muted border-border"
                )}>
                  <Bot className={cn(
                    "h-6 w-6",
                    systemEnabled ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-foreground">AI Response System</h3>
                  <p className="text-sm text-muted-foreground">
                    {systemEnabled 
                      ? (aiSystemOpen ? "Configure how AI handles each channel" : "Click to expand channel settings")
                      : "System is currently disabled"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${aiSystemOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-6">
            {!systemEnabled && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Channel settings are inactive while the AI system is disabled. Turn on the system above to activate these channels.
                </p>
              </div>
            )}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-muted-foreground mb-4">Channel Settings</p>
          
          <div className="grid gap-3">
            {/* Phone Calls */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
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
                  disabled={!connectionStatus.phone || !systemEnabled}
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
                  <MessageSquare className="h-5 w-5 text-primary" />
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
                  disabled={!connectionStatus.sms || !systemEnabled}
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
                  <MessageSquare className="h-5 w-5 text-primary" />
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
                  disabled={!connectionStatus.whatsapp || !systemEnabled}
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
                  <Instagram className="h-5 w-5 text-primary" />
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
                  disabled={!connectionStatus.instagram || !systemEnabled}
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
                  <Facebook className="h-5 w-5 text-primary" />
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
                  disabled={!connectionStatus.messenger || !systemEnabled}
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

            {/* Email */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="email" className="text-sm font-semibold cursor-pointer">Email</Label>
                      {!connectionStatus.email && (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={channels.email}
                  onCheckedChange={() => handleChannelToggle("email")}
                  disabled={!connectionStatus.email || !systemEnabled}
                />
              </div>
              {!connectionStatus.email ? (
                <div className="pl-8 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="font-medium text-foreground mb-1">Email Always Available</p>
                  <p>Email is enabled for all accounts and contacts.</p>
                </div>
              ) : channels.email && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={channelModes.email === "copilot" ? "default" : "outline"}
                      onClick={() => channelModes.email === "autopilot" && handleChannelModeToggle("email")}
                      className="flex-1"
                    >
                      Co-pilot
                    </Button>
                    <Button
                      size="sm"
                      variant={channelModes.email === "autopilot" ? "default" : "outline"}
                      onClick={() => channelModes.email === "copilot" && handleChannelModeToggle("email")}
                      className="flex-1"
                    >
                      Autopilot
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {channelModes.email === "copilot" ? (
                      <>
                        <span className="font-medium text-foreground">Co-pilot:</span> AI drafts email replies as{" "}
                        <button onClick={onNavigateToTasks} className="text-primary hover:underline">tasks</button> for you to approve before sending
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Autopilot:</span> AI sends email replies automatically without your review
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
      <Card className="border-2 border-primary/20 p-6 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
        <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/20 p-3 border-2 border-primary/30">
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

            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Confirmation Dialog for Enabling System */}
      <AlertDialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Assistant?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will enable automatic AI responses across all configured channels.</p>
              <p className="font-medium text-foreground">
                The AI will start handling customer communication immediately based on your current settings.
              </p>
              <p className="text-sm text-muted-foreground">
                You can turn off the system or adjust individual channel settings at any time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSystemEnable} className="bg-green-600 hover:bg-green-700">
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Status;
