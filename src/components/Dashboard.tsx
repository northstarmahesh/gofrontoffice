import { useState, useEffect } from "react";
import { Phone, MessageSquare, CheckCircle2, Clock, DollarSign, TrendingUp, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ActivityLogs from "./ActivityLogs";
import { toast } from "sonner";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  console.log('Dashboard component rendering');
  const { greeting, weather, backgroundGradient, emoji } = useGreetingAndWeather();
  console.log('Dashboard hook values:', { greeting, weather, backgroundGradient, emoji });

  const [stats, setStats] = useState([
    {
      label: "Calls Today",
      value: "0",
      change: "+0%",
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Messages",
      value: "0",
      change: "+0%",
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Completed",
      value: "0",
      change: "+0%",
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Pending",
      value: "0",
      change: "+0%",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ]);

  const [roiMetrics, setRoiMetrics] = useState([
    { label: "Time Saved", value: "0 hrs", subtext: "Today" },
    { label: "Cost Saved", value: "$0", subtext: "This week" },
    { label: "Response Rate", value: "0%", subtext: "Last 7 days" },
  ]);

  const [pendingTasks, setPendingTasks] = useState<Array<{ id: string; title: string; priority: string }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's clinic
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUser) return;

      const clinicId = clinicUser.clinic_id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get today's calls
      const { data: callsToday, count: callsTodayCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("type", "call")
        .gte("created_at", today.toISOString());

      // Get yesterday's calls for comparison
      const { count: callsYesterdayCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("type", "call")
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      // Get today's messages (SMS, WhatsApp, Instagram, Messenger)
      const { count: messagesTodayCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .in("type", ["sms", "whatsapp", "instagram", "messenger"])
        .gte("created_at", today.toISOString());

      // Get yesterday's messages
      const { count: messagesYesterdayCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .in("type", ["sms", "whatsapp", "instagram", "messenger"])
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      // Get completed tasks
      const { count: completedCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("status", "completed");

      // Get pending tasks
      const { data: pendingTasksData, count: pendingCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      // Calculate changes
      const callsChange = callsYesterdayCount ? 
        Math.round(((callsTodayCount || 0) - callsYesterdayCount) / callsYesterdayCount * 100) : 0;
      const messagesChange = messagesYesterdayCount ?
        Math.round(((messagesTodayCount || 0) - messagesYesterdayCount) / messagesYesterdayCount * 100) : 0;

      // Calculate time saved (avg 5 minutes per interaction)
      const totalInteractions = (callsTodayCount || 0) + (messagesTodayCount || 0);
      const timeSavedMinutes = totalInteractions * 5;
      const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);

      // Calculate cost saved ($40/hour)
      const costSaved = Math.round((timeSavedMinutes / 60) * 40);

      // Calculate response rate
      const totalThisWeek = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .gte("created_at", weekAgo.toISOString());
      
      const respondedThisWeek = await supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("status", "completed")
        .gte("created_at", weekAgo.toISOString());

      const responseRate = totalThisWeek.count ? 
        Math.round((respondedThisWeek.count || 0) / totalThisWeek.count * 100) : 0;

      // Update stats
      setStats([
        {
          label: "Calls Today",
          value: (callsTodayCount || 0).toString(),
          change: `${callsChange >= 0 ? '+' : ''}${callsChange}%`,
          icon: Phone,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          label: "Messages",
          value: (messagesTodayCount || 0).toString(),
          change: `${messagesChange >= 0 ? '+' : ''}${messagesChange}%`,
          icon: MessageSquare,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          label: "Completed",
          value: (completedCount || 0).toString(),
          change: "+0%",
          icon: CheckCircle2,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          label: "Pending",
          value: (pendingCount || 0).toString(),
          change: "+0%",
          icon: Clock,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
      ]);

      setRoiMetrics([
        { label: "Time Saved", value: `${timeSavedHours} hrs`, subtext: "Today" },
        { label: "Cost Saved", value: `$${costSaved}`, subtext: "This week" },
        { label: "Response Rate", value: `${responseRate}%`, subtext: "Last 7 days" },
      ]);

      setPendingTasks(pendingTasksData?.map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority || "medium"
      })) || []);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const handleStatClick = (label: string) => {
    toast.info(`Viewing detailed ${label} analytics`);
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div className={`rounded-2xl ${backgroundGradient} p-4 text-white shadow-lg transition-all duration-1000 border-2 border-yellow-accent/20`}>
        <h2 className="mb-1 text-xl font-bold">{greeting}! {emoji}</h2>
        <p className="text-xs opacity-90">
          Your assistant is active and handling all incoming communications
        </p>
        {weather && (
          <p className="mt-1 text-xs opacity-75">
            Currently {Math.round(weather.temp)}°F
          </p>
        )}
      </div>

      {/* ROI Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {roiMetrics.map((metric) => (
          <Card key={metric.label} className="border-2 border-primary/20 p-3 text-center shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <p className="text-lg font-bold text-primary">{metric.value}</p>
            </div>
            <p className="text-xs font-medium text-foreground">{metric.label}</p>
            <p className="text-xs text-muted-foreground">{metric.subtext}</p>
          </Card>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="cursor-pointer border-0 p-3 shadow-sm transition-all hover:shadow-md"
              onClick={() => handleStatClick(stat.label)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-0.5 text-xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-xs ${stat.change.startsWith('+') ? 'text-success' : 'text-warning'}`}>
                    {stat.change} vs yesterday
                  </p>
                </div>
                <div className={`rounded-lg ${stat.bgColor} p-2`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pending Tasks Banner */}
      {pendingTasks.length > 0 && (
        <Card className="border-2 border-yellow-accent/30 p-4 shadow-lg bg-gradient-to-br from-yellow-accent/10 to-yellow-accent/5 hover:shadow-xl transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-accent/20 flex items-center justify-center flex-shrink-0">
                <ListTodo className="h-5 w-5 text-yellow-accent" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Needs Your Attention</h3>
                <p className="text-xs text-muted-foreground">Tasks requiring immediate action</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-yellow-accent border-yellow-accent text-secondary">
              {pendingTasks.length}
            </Badge>
          </div>
        </Card>
      )}

      {/* Activity Logs */}
      <ActivityLogs />
    </div>
  );
};

export default Dashboard;
