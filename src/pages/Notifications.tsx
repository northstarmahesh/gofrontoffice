import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Mail, MessageSquare, Settings, LogOut, CreditCard, Users as UsersIcon, ChevronDown } from "lucide-react";
const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    pending_tasks_times: ["8am"] as string[],
    analytics_frequencies: ["weekly"] as string[],
    email_enabled: true,
    sms_enabled: false,
    credit_limit_alert_enabled: true,
    credit_limit_threshold: 90,
    auto_topup_enabled: false
  });
  useEffect(() => {
    loadSettings();
  }, []);
  const loadSettings = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const {
        data,
        error
      } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          ...data,
          pending_tasks_times: data.pending_tasks_time ? [data.pending_tasks_time] : ["8am"],
          analytics_frequencies: data.analytics_frequency ? [data.analytics_frequency] : ["weekly"]
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };
  const saveSettings = async () => {
    setSaving(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        error
      } = await supabase.from("notification_settings").upsert({
        user_id: user.id,
        email_enabled: settings.email_enabled,
        sms_enabled: settings.sms_enabled,
        credit_limit_alert_enabled: settings.credit_limit_alert_enabled,
        credit_limit_threshold: settings.credit_limit_threshold,
        auto_topup_enabled: settings.auto_topup_enabled,
        pending_tasks_time: settings.pending_tasks_times[0] || "8am",
        analytics_frequency: settings.analytics_frequencies[0] || "weekly"
      });
      if (error) throw error;
      toast.success("Notification settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Notification Settings</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-[100]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/team")} className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Team</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Password management coming soon")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Password & Login</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer font-semibold text-primary">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/usage-billing")} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Usage & Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Logged out successfully");
                navigate("/auth");
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-6">
          {/* Pending Tasks */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Pending Tasks Notifications</h2>
            <p className="text-sm text-muted-foreground mb-4">Get reminders about tasks that need your attention -  like customer follow-ups, or unresolved chats — especially when your assistant is on co-pilot mode.</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="8am" checked={settings.pending_tasks_times.includes("8am")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    pending_tasks_times: [...settings.pending_tasks_times, "8am"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    pending_tasks_times: settings.pending_tasks_times.filter(t => t !== "8am")
                  });
                }
              }} />
                <Label htmlFor="8am" className="cursor-pointer">Every Morning 8 AM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="12pm" checked={settings.pending_tasks_times.includes("12pm")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    pending_tasks_times: [...settings.pending_tasks_times, "12pm"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    pending_tasks_times: settings.pending_tasks_times.filter(t => t !== "12pm")
                  });
                }
              }} />
                <Label htmlFor="12pm" className="cursor-pointer">Every Day 12 PM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="8pm" checked={settings.pending_tasks_times.includes("8pm")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    pending_tasks_times: [...settings.pending_tasks_times, "8pm"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    pending_tasks_times: settings.pending_tasks_times.filter(t => t !== "8pm")
                  });
                }
              }} />
                <Label htmlFor="8pm" className="cursor-pointer">Every Evening 8 PM</Label>
              </div>
            </div>
          </Card>

          {/* Analytics & Credit Usage */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Analytics & Credit Usage Reports</h2>
            <p className="text-sm text-muted-foreground mb-4">Receive daily or weekly summaries of your business performance — including total conversations, response times, customer satisfaction, and credit usage. Stay informed and track how your business is doing at a glance</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="daily" checked={settings.analytics_frequencies.includes("daily")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    analytics_frequencies: [...settings.analytics_frequencies, "daily"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    analytics_frequencies: settings.analytics_frequencies.filter(f => f !== "daily")
                  });
                }
              }} />
                <Label htmlFor="daily" className="cursor-pointer">Daily</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="weekly" checked={settings.analytics_frequencies.includes("weekly")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    analytics_frequencies: [...settings.analytics_frequencies, "weekly"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    analytics_frequencies: settings.analytics_frequencies.filter(f => f !== "weekly")
                  });
                }
              }} />
                <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="monthly" checked={settings.analytics_frequencies.includes("monthly")} onCheckedChange={checked => {
                if (checked) {
                  setSettings({
                    ...settings,
                    analytics_frequencies: [...settings.analytics_frequencies, "monthly"]
                  });
                } else {
                  setSettings({
                    ...settings,
                    analytics_frequencies: settings.analytics_frequencies.filter(f => f !== "monthly")
                  });
                }
              }} />
                <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
              </div>
            </div>
          </Card>

          {/* Notification Channels */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Notification Channels</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how you want to receive notifications. These channels apply to all notification types (tasks, analytics, credit alerts).
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <Label>Email Notifications</Label>
                </div>
                <Switch checked={settings.email_enabled} onCheckedChange={checked => setSettings({
                ...settings,
                email_enabled: checked
              })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label>SMS Notifications</Label>
                </div>
                <Switch checked={settings.sms_enabled} onCheckedChange={checked => setSettings({
                ...settings,
                sms_enabled: checked
              })} />
              </div>
            </div>
          </Card>

          {/* Credit Limits */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Credit Limits</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Alert when credits consumed</Label>
                  <Switch checked={settings.credit_limit_alert_enabled} onCheckedChange={checked => setSettings({
                  ...settings,
                  credit_limit_alert_enabled: checked
                })} />
                </div>
                
                {settings.credit_limit_alert_enabled && <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Notification threshold</span>
                      <span className="text-2xl font-bold text-primary">{settings.credit_limit_threshold}%</span>
                    </div>
                    <Slider value={[settings.credit_limit_threshold]} onValueChange={([value]) => setSettings({
                  ...settings,
                  credit_limit_threshold: value
                })} min={50} max={95} step={5} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      You'll be notified via your enabled channels (email/SMS) when {settings.credit_limit_threshold}% of your monthly credits are consumed.
                    </p>
                  </div>}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Auto top-up credits</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically find the cheapest pack based on historical usage
                  </p>
                </div>
                <Switch checked={settings.auto_topup_enabled} onCheckedChange={checked => setSettings({
                ...settings,
                auto_topup_enabled: checked
              })} />
              </div>
            </div>
          </Card>

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>;
};
export default Notifications;