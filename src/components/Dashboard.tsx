import { Phone, MessageSquare, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

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

  const recentActivity = [
    { type: "call", time: "2 min ago", message: "Incoming call from John Doe", status: "completed" },
    { type: "sms", time: "15 min ago", message: "SMS: Appointment confirmation", status: "auto-replied" },
    { type: "whatsapp", time: "1 hour ago", message: "WhatsApp: Prescription inquiry", status: "pending" },
    { type: "call", time: "2 hours ago", message: "Call from Sarah Smith", status: "completed" },
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

      {/* Recent Activity */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <Card key={index} className="border-0 p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {activity.type === "call" ? (
                    <Phone className="h-5 w-5 text-primary" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-secondary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-foreground">{activity.message}</p>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      activity.status === "completed"
                        ? "bg-success/10 text-success"
                        : activity.status === "auto-replied"
                        ? "bg-info/10 text-info"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
