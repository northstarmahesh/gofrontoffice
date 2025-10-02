import { Phone, MessageSquare, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import ActivityLogs from "./ActivityLogs";

const Dashboard = () => {
  const stats = [
    {
      label: "Calls Today",
      value: "12",
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Messages",
      value: "24",
      icon: MessageSquare,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Completed",
      value: "18",
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Pending",
      value: "8",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-primary-foreground shadow-lg">
        <h2 className="mb-2 text-2xl font-bold">Good Morning! 👋</h2>
        <p className="text-sm opacity-90">
          Your assistant is active and handling all incoming communications
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`rounded-xl ${stat.bgColor} p-2.5`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Activity Logs */}
      <ActivityLogs />
    </div>
  );
};

export default Dashboard;
