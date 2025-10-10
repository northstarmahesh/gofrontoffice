import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Bell, Mail, MessageSquare } from "lucide-react";

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    pending_tasks_time: "8am",
    analytics_frequency: "weekly",
    email_enabled: true,
    sms_enabled: false,
    credit_limit_alert_enabled: true,
    credit_limit_threshold: 90,
    auto_topup_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Bell className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Notification Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Pending Tasks */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pending Tasks Notifications</h2>
            <RadioGroup
              value={settings.pending_tasks_time}
              onValueChange={(value) =>
                setSettings({ ...settings, pending_tasks_time: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="8am" id="8am" />
                <Label htmlFor="8am">Every Morning 8 AM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12pm" id="12pm" />
                <Label htmlFor="12pm">Every Day 12 PM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="8pm" id="8pm" />
                <Label htmlFor="8pm">Every Evening 8 PM</Label>
              </div>
            </RadioGroup>
          </Card>

          {/* Analytics & Credit Usage */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics & Credit Usage</h2>
            <RadioGroup
              value={settings.analytics_frequency}
              onValueChange={(value) =>
                setSettings({ ...settings, analytics_frequency: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">Daily</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly">Monthly</Label>
              </div>
            </RadioGroup>
          </Card>

          {/* Notification Channels */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Channels</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <Label>Email Notifications</Label>
                </div>
                <Switch
                  checked={settings.email_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, email_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label>SMS Notifications</Label>
                </div>
                <Switch
                  checked={settings.sms_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sms_enabled: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Credit Limits */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Credit Limits</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Notify when 90% credits consumed</Label>
                <Switch
                  checked={settings.credit_limit_alert_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, credit_limit_alert_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto top-up credits</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically find the cheapest pack based on historical usage
                  </p>
                </div>
                <Switch
                  checked={settings.auto_topup_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_topup_enabled: checked })
                  }
                />
              </div>
            </div>
          </Card>

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
