import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);

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

  const copyScheduleToDay = (targetDay: number) => {
    if (copyFromDay === null) return;
    
    const sourceSchedule = schedules.find(s => s.day_of_week === copyFromDay);
    if (!sourceSchedule) return;

    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.day_of_week === targetDay
          ? {
              ...schedule,
              start_time: sourceSchedule.start_time,
              end_time: sourceSchedule.end_time,
              is_available: sourceSchedule.is_available,
            }
          : schedule
      )
    );
    
    toast.success(`Copied schedule from ${DAYS[copyFromDay]} to ${DAYS[targetDay]}`);
    setCopyFromDay(null);
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
          Set your business's availability for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-sm">Copy schedule:</Label>
          <Select value={copyFromDay?.toString() || ""} onValueChange={(val) => setCopyFromDay(parseInt(val))}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {copyFromDay !== null && (
            <span className="text-xs text-muted-foreground">
              Click copy button on target day
            </span>
          )}
        </div>

        {schedules.map((schedule) => (
          <div
            key={schedule.day_of_week}
            className="flex items-center gap-2 p-2 border rounded-lg"
          >
            <div className="flex items-center gap-2 w-24">
              <Switch
                checked={schedule.is_available}
                onCheckedChange={(checked) =>
                  updateSchedule(schedule.day_of_week, "is_available", checked)
                }
              />
              <Label className="text-sm font-medium">
                {DAYS[schedule.day_of_week].slice(0, 3)}
              </Label>
            </div>

            {schedule.is_available && (
              <>
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) =>
                      updateSchedule(schedule.day_of_week, "start_time", e.target.value)
                    }
                    className="px-2 py-1 border rounded-md text-sm w-24"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) =>
                      updateSchedule(schedule.day_of_week, "end_time", e.target.value)
                    }
                    className="px-2 py-1 border rounded-md text-sm w-24"
                  />
                </div>
                {copyFromDay !== null && copyFromDay !== schedule.day_of_week && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyScheduleToDay(schedule.day_of_week)}
                    className="h-7 px-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}

            {!schedule.is_available && (
              <span className="text-muted-foreground text-sm flex-1">Closed</span>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
          {saving ? "Saving..." : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
};
