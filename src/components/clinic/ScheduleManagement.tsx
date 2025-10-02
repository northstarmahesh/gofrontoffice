import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock } from "lucide-react";

interface ScheduleManagementProps {
  clinicId: string;
}

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ScheduleManagement = ({ clinicId }: ScheduleManagementProps) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [clinicId]);

  const loadSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_schedules")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("day_of_week");

    if (error) {
      console.error("Error loading schedules:", error);
    } else if (data && data.length > 0) {
      setSchedules(data);
    } else {
      // Initialize default schedules (Mon-Fri 9-5)
      const defaultSchedules = DAYS.map((_, index) => ({
        day_of_week: index,
        start_time: "09:00",
        end_time: "17:00",
        is_available: index >= 1 && index <= 5, // Mon-Fri
      }));
      setSchedules(defaultSchedules);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing schedules
      await supabase
        .from("clinic_schedules")
        .delete()
        .eq("clinic_id", clinicId);

      // Insert new schedules
      const schedulesToInsert = schedules.map((schedule) => ({
        clinic_id: clinicId,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_available: schedule.is_available,
      }));

      const { error } = await supabase
        .from("clinic_schedules")
        .insert(schedulesToInsert);

      if (error) throw error;
      toast.success("Schedule saved successfully!");
      loadSchedules();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(error.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (dayIndex: number, field: keyof Schedule, value: any) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.day_of_week === dayIndex
          ? { ...schedule, [field]: value }
          : schedule
      )
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Operating Hours</CardTitle>
        </div>
        <CardDescription>
          Set your clinic's availability for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <span className="text-muted-foreground">Closed</span>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
};
