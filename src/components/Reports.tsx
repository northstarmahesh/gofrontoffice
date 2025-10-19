import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, MessageSquare, TrendingUp, CheckCircle, CalendarIcon, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const [weeklyStats, setWeeklyStats] = useState<Array<{ day: string; calls: number; messages: number }>>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [lastWeekCalls, setLastWeekCalls] = useState(0);
  const [lastWeekMessages, setLastWeekMessages] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUser) return;

      const clinicId = clinicUser.clinic_id;
      const startDate = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();

      // Get calls for the period
      const { data: calls, count: callsCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("type", "call")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Get messages for the period
      const { data: messages, count: messagesCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .in("type", ["sms", "whatsapp", "instagram", "messenger"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Get last week's data for comparison
      const lastWeekStart = subWeeks(startDate, 1);
      const lastWeekEnd = subWeeks(endDate, 1);

      const { count: lastWeekCallsCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("type", "call")
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      const { count: lastWeekMessagesCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .in("type", ["sms", "whatsapp", "instagram", "messenger"])
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      // Get tasks data
      const { data: allTasks, count: allTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId);

      const { count: completedTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("status", "completed");

      setTotalCalls(callsCount || 0);
      setTotalMessages(messagesCount || 0);
      setLastWeekCalls(lastWeekCallsCount || 0);
      setLastWeekMessages(lastWeekMessagesCount || 0);
      setTotalTasks(allTasksCount || 0);
      setCompletedTasks(completedTasksCount || 0);
      setCompletionRate(allTasksCount ? Math.round((completedTasksCount || 0) / allTasksCount * 100) : 0);

      // Build weekly stats
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const stats = days.slice(0, 7).map(day => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayCalls = calls?.filter(c => {
          const callDate = new Date(c.created_at);
          return callDate >= dayStart && callDate <= dayEnd;
        }).length || 0;

        const dayMessages = messages?.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate >= dayStart && msgDate <= dayEnd;
        }).length || 0;

        return {
          day: format(day, "EEE"),
          calls: dayCalls,
          messages: dayMessages
        };
      });

      setWeeklyStats(stats);

    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ["Date", "Calls", "Messages"],
      ...weeklyStats.map(stat => [stat.day, stat.calls, stat.messages])
    ].map(row => row.join(",")).join("\n");

    // Create blob and download
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `front-office-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Report exported successfully!");
  };

  const maxValue = weeklyStats.length > 0 ? Math.max(
    ...weeklyStats.map((stat) => Math.max(stat.calls, stat.messages))
  ) : 1;

  const callsChange = lastWeekCalls > 0 ? Math.round((totalCalls - lastWeekCalls) / lastWeekCalls * 100) : 0;
  const messagesChange = lastWeekMessages > 0 ? Math.round((totalMessages - lastWeekMessages) / lastWeekMessages * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track your assistant's performance
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Pick a date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
          <p className="text-xs text-muted-foreground">Total Calls This Week</p>
          <div className={`mt-2 flex items-center gap-1 text-xs ${callsChange >= 0 ? 'text-success' : 'text-warning'}`}>
            <TrendingUp className="h-3 w-3" />
            <span>{callsChange >= 0 ? '+' : ''}{callsChange}% from last week</span>
          </div>
        </Card>

        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
            <MessageSquare className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
          <p className="text-xs text-muted-foreground">Total Messages</p>
          <div className={`mt-2 flex items-center gap-1 text-xs ${messagesChange >= 0 ? 'text-success' : 'text-warning'}`}>
            <TrendingUp className="h-3 w-3" />
            <span>{messagesChange >= 0 ? '+' : ''}{messagesChange}% from last week</span>
          </div>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card className="border-0 p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Weekly Activity</h3>
        <div className="space-y-4">
          {weeklyStats.map((stat) => (
            <div key={stat.day}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{stat.day}</span>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {stat.calls} calls
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-secondary" />
                    {stat.messages} msgs
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${(stat.calls / maxValue) * 100}%` }}
                />
                <div
                  className="h-2 rounded-full bg-secondary transition-all"
                  style={{ width: `${(stat.messages / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Response Mode Distribution */}
      <Card className="border-0 p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Response Distribution</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Auto-Pilot</p>
                <p className="text-xs text-muted-foreground">Fully automated</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">65%</p>
              <p className="text-xs text-muted-foreground">122 cases</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Co-Pilot</p>
                <p className="text-xs text-muted-foreground">Human approval</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">35%</p>
              <p className="text-xs text-muted-foreground">65 cases</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="flex h-full">
              <div className="bg-success" style={{ width: "65%" }} />
              <div className="bg-info" style={{ width: "35%" }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Completion Rate */}
      <Card className="border-0 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-1 font-semibold text-foreground">Task Completion Rate</h3>
            <p className="text-xs text-muted-foreground">Tasks completed on time</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-success">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} tasks</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
