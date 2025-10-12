import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, CreditCard, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingNotificationsProps {
  clinicId: string;
  onComplete: () => void;
}

export const OnboardingNotifications = ({ clinicId, onComplete }: OnboardingNotificationsProps) => {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    pending_tasks_time: "8am",
    analytics_frequency: "weekly",
    credit_limit_alert_enabled: true,
    credit_limit_threshold: 90,
    auto_topup_enabled: false,
  });

  useEffect(() => {
    loadLocationAndSettings();
  }, [clinicId]);

  const loadLocationAndSettings = async () => {
    try {
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("id")
        .eq("clinic_id", clinicId)
        .limit(1);

      if (locations && locations.length > 0) {
        setLocationId(locations[0].id);

        // Load existing settings if any
        const { data: existingSettings } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("location_id", locations[0].id)
          .maybeSingle();

        if (existingSettings) {
          setSettings({
            email_enabled: existingSettings.email_enabled,
            sms_enabled: existingSettings.sms_enabled,
            pending_tasks_time: existingSettings.pending_tasks_time,
            analytics_frequency: existingSettings.analytics_frequency,
            credit_limit_alert_enabled: existingSettings.credit_limit_alert_enabled,
            credit_limit_threshold: existingSettings.credit_limit_threshold,
            auto_topup_enabled: existingSettings.auto_topup_enabled,
          });
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    if (!locationId) {
      toast.error("No location found");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          location_id: locationId,
          user_id: user.id,
          ...settings,
        }, {
          onConflict: "location_id,user_id"
        });

      if (error) throw error;

      toast.success("Notification settings saved!");
      onComplete();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Notifieringsinställningar</CardTitle>
          </div>
          <CardDescription>
            Välj hur och när du vill få uppdateringar om din verksamhet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-notif">E-postnotifieringar</Label>
                <p className="text-xs text-muted-foreground">Få uppdateringar via e-post</p>
              </div>
            </div>
            <Switch
              id="email-notif"
              checked={settings.email_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
            />
          </div>

          {/* Daily Task Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="task-time">Daglig uppgiftssammanfattning</Label>
                <p className="text-xs text-muted-foreground">Tid för sammanfattning av väntande uppgifter</p>
              </div>
            </div>
            <Select
              value={settings.pending_tasks_time}
              onValueChange={(value) => setSettings({ ...settings, pending_tasks_time: value })}
            >
              <SelectTrigger id="task-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6am">06:00</SelectItem>
                <SelectItem value="7am">07:00</SelectItem>
                <SelectItem value="8am">08:00</SelectItem>
                <SelectItem value="9am">09:00</SelectItem>
                <SelectItem value="10am">10:00</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analytics Frequency */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="analytics-freq">Analysrapporter</Label>
                <p className="text-xs text-muted-foreground">Hur ofta vill du få prestationsrapporter?</p>
              </div>
            </div>
            <Select
              value={settings.analytics_frequency}
              onValueChange={(value) => setSettings({ ...settings, analytics_frequency: value })}
            >
              <SelectTrigger id="analytics-freq">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Dagligen</SelectItem>
                <SelectItem value="weekly">Veckovis</SelectItem>
                <SelectItem value="monthly">Månadsvis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credit Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="credit-alert">Kreditvarningar</Label>
                  <p className="text-xs text-muted-foreground">Bli aviserad när krediter blir låga</p>
                </div>
              </div>
              <Switch
                id="credit-alert"
                checked={settings.credit_limit_alert_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, credit_limit_alert_enabled: checked })}
              />
            </div>

            {settings.credit_limit_alert_enabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="credit-threshold">Varningsgräns (%)</Label>
                <Select
                  value={settings.credit_limit_threshold.toString()}
                  onValueChange={(value) => setSettings({ ...settings, credit_limit_threshold: parseInt(value) })}
                >
                  <SelectTrigger id="credit-threshold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90% återstående</SelectItem>
                    <SelectItem value="75">75% återstående</SelectItem>
                    <SelectItem value="50">50% återstående</SelectItem>
                    <SelectItem value="25">25% återstående</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tips:</strong> Vi rekommenderar att hålla e-postnotifieringar påslagna 
                så att du aldrig missar viktiga uppdateringar från din AI-assistent.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading} className="flex-1" size="lg">
          {loading ? "Sparar..." : "Spara och fortsätt"}
        </Button>
      </div>
    </div>
  );
};
