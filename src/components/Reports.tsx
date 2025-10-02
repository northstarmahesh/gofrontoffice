import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, TrendingUp, CheckCircle } from "lucide-react";

const Reports = () => {
  const weeklyStats = [
    { day: "Mon", calls: 8, messages: 15 },
    { day: "Tue", calls: 12, messages: 18 },
    { day: "Wed", calls: 10, messages: 22 },
    { day: "Thu", calls: 14, messages: 20 },
    { day: "Fri", calls: 16, messages: 24 },
    { day: "Sat", calls: 6, messages: 10 },
    { day: "Sun", calls: 4, messages: 8 },
  ];

  const maxValue = Math.max(
    ...weeklyStats.map((stat) => Math.max(stat.calls, stat.messages))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Track your assistant's performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">70</p>
          <p className="text-xs text-muted-foreground">Total Calls This Week</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            <span>+12% from last week</span>
          </div>
        </Card>

        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
            <MessageSquare className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-foreground">117</p>
          <p className="text-xs text-muted-foreground">Total Messages</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            <span>+8% from last week</span>
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
            <p className="text-3xl font-bold text-success">94%</p>
            <p className="text-xs text-muted-foreground">168 of 179 tasks</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
