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
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Completed",
      value: "18",
      change: "+22%",
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Pending",
      value: "8",
      change: "-5%",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
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
