import { Phone, MessageSquare, CheckCircle2, Clock, DollarSign, TrendingUp, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ActivityLogs from "./ActivityLogs";
import { toast } from "sonner";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";

const Dashboard = () => {
  console.log('Dashboard component rendering');
  const { greeting, weather, backgroundGradient, emoji } = useGreetingAndWeather();
  console.log('Dashboard hook values:', { greeting, weather, backgroundGradient, emoji });

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
      label: "Completed",
      value: "18",
      change: "+22%",
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Pending",
      value: "8",
      change: "-5%",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const roiMetrics = [
    { label: "Time Saved", value: "4.5 hrs", subtext: "Today" },
    { label: "Cost Saved", value: "$180", subtext: "This week" },
    { label: "Response Rate", value: "98%", subtext: "Last 7 days" },
  ];

  const pendingTasks = [
    { id: 1, title: "Review prescription refill", priority: "high" },
    { id: 2, title: "Approve draft reply", priority: "medium" },
    { id: 3, title: "Follow up on insurance", priority: "medium" },
  ];

  const handleStatClick = (label: string) => {
    toast.info(`Viewing detailed ${label} analytics`);
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div className={`rounded-2xl ${backgroundGradient} p-4 text-white shadow-lg transition-all duration-1000`}>
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
          <Card key={metric.label} className="border-0 p-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-primary">
              <TrendingUp className="h-3 w-3" />
              <p className="text-lg font-bold">{metric.value}</p>
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

      {/* Pending Tasks Snapshot */}
      <Card className="border-0 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Your Pending Tasks</h3>
          <Badge variant="outline" className="ml-auto text-xs">
            {pendingTasks.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {pendingTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
              <p className="text-xs text-foreground">{task.title}</p>
              <Badge
                variant="outline"
                className={`text-xs ${
                  task.priority === "high"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-warning/30 bg-warning/10 text-warning"
                }`}
              >
                {task.priority}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity Logs */}
      <ActivityLogs />
    </div>
  );
};

export default Dashboard;
