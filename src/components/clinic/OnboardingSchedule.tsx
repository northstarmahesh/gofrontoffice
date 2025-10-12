import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingScheduleProps {
  clinicId: string;
  onComplete: () => void;
}

const DAYS = [
  { id: 1, name: "Måndag", nameEn: "Monday" },
  { id: 2, name: "Tisdag", nameEn: "Tuesday" },
  { id: 3, name: "Onsdag", nameEn: "Wednesday" },
  { id: 4, name: "Torsdag", nameEn: "Thursday" },
  { id: 5, name: "Fredag", nameEn: "Friday" },
  { id: 6, name: "Lördag", nameEn: "Saturday" },
  { id: 0, name: "Söndag", nameEn: "Sunday" },
];

const DEFAULT_SCHEDULE = {
  start_time: "09:00",
  end_time: "17:00",
};

export const OnboardingSchedule = ({ clinicId, onComplete }: OnboardingScheduleProps) => {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<number, { enabled: boolean; start: string; end: string }>>(() => {
    const initialSchedule: Record<number, { enabled: boolean; start: string; end: string }> = {};
    DAYS.forEach(day => {
      initialSchedule[day.id] = { 
        enabled: day.id !== 0 && day.id !== 6, 
        start: DEFAULT_SCHEDULE.start_time, 
        end: DEFAULT_SCHEDULE.end_time 
      };
    });
    return initialSchedule;
  });

  useEffect(() => {
    loadLocationAndSchedule();
  }, [clinicId]);

  const loadLocationAndSchedule = async () => {
    try {
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("id")
        .eq("clinic_id", clinicId)
        .limit(1);

      if (locations && locations.length > 0) {
        setLocationId(locations[0].id);

        // Load existing schedule if any
        const { data: existingSchedule } = await supabase
          .from("assistant_schedules")
          .select("*")
          .eq("location_id", locations[0].id);

        if (existingSchedule && existingSchedule.length > 0) {
          const scheduleMap: Record<number, { enabled: boolean; start: string; end: string }> = {};
          existingSchedule.forEach(item => {
            scheduleMap[item.day_of_week] = {
              enabled: item.is_available,
              start: item.start_time.slice(0, 5),
              end: item.end_time.slice(0, 5),
            };
          });
          setSchedule(scheduleMap);
        }
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
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

      // Delete existing schedule
      await supabase
        .from("assistant_schedules")
        .delete()
        .eq("location_id", locationId);

      // Insert new schedule
      const scheduleEntries = Object.entries(schedule).map(([day, config]) => ({
        location_id: locationId,
        user_id: user.id,
        day_of_week: parseInt(day),
        start_time: config.start,
        end_time: config.end,
        is_available: config.enabled,
      }));

      const { error } = await supabase
        .from("assistant_schedules")
        .insert(scheduleEntries);

      if (error) throw error;

      toast.success("Schedule saved!");
      onComplete();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(error.message || "Failed to save schedule");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], enabled: !prev[dayId].enabled }
    }));
  };

  const updateTime = (dayId: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const applyToAll = () => {
    const mondayConfig = schedule[1];
    setSchedule(prev => {
      const updated = { ...prev };
      DAYS.forEach(day => {
        if (day.id !== 0 && day.id !== 6) { // Skip weekends
          updated[day.id] = { ...mondayConfig };
        }
      });
      return updated;
    });
    toast.success("Applied Monday's schedule to all weekdays");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Business Hours</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={applyToAll}>
              Copy Monday to Weekdays
            </Button>
          </div>
          <CardDescription>
            Set when your AI assistant should be active and respond to messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {DAYS.map(day => {
              const daySchedule = schedule[day.id];
              const isWeekend = day.id === 0 || day.id === 6;

              return (
                <Card key={day.id} className={!daySchedule.enabled ? "opacity-60" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {isWeekend ? (
                          <Moon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{day.name}</p>
                          <p className="text-xs text-muted-foreground">{day.nameEn}</p>
                        </div>
                      </div>

                      {daySchedule.enabled && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Label htmlFor={`start-${day.id}`} className="sr-only">Start time</Label>
                            <input
                              id={`start-${day.id}`}
                              type="time"
                              value={daySchedule.start}
                              onChange={(e) => updateTime(day.id, 'start', e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-24"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Label htmlFor={`end-${day.id}`} className="sr-only">End time</Label>
                            <input
                              id={`end-${day.id}`}
                              type="time"
                              value={daySchedule.end}
                              onChange={(e) => updateTime(day.id, 'end', e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-24"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!daySchedule.enabled && (
                          <Badge variant="secondary" className="text-xs">Stängd / Closed</Badge>
                        )}
                        <Switch
                          checked={daySchedule.enabled}
                          onCheckedChange={() => toggleDay(day.id)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">
                ⏰ <strong>Tip:</strong> Your AI will automatically respond "Vi är stängda just nu" (We're closed right now) 
                outside of business hours and provide your opening times.
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
