import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, Clock, Search, Instagram, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ActivityLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  const logs = [
    {
      id: 1,
      type: "call",
      channel: "call",
      timestamp: "Today, 10:24 AM",
      title: "Incoming call from John Doe",
      summary: "Patient inquired about appointment availability for next week. Provided available slots and confirmed booking for Tuesday 3PM.",
      status: "completed",
      actions: ["Created appointment", "Sent confirmation SMS"],
      date: "Today",
    },
    {
      id: 2,
      type: "sms",
      channel: "sms",
      timestamp: "Today, 9:45 AM",
      title: "SMS from Sarah Smith",
      summary: "Appointment confirmation request. Auto-replied with confirmation and clinic address.",
      status: "auto-replied",
      actions: ["Sent auto-reply"],
      date: "Today",
    },
    {
      id: 3,
      type: "whatsapp",
      channel: "whatsapp",
      timestamp: "Today, 8:30 AM",
      title: "WhatsApp from Mike Johnson",
      summary: "Question about prescription refill. Requires doctor approval.",
      status: "pending",
      actions: ["Created task for review"],
      date: "Today",
    },
    {
      id: 4,
      type: "call",
      channel: "call",
      timestamp: "Yesterday, 4:15 PM",
      title: "Call from Emily Davis",
      summary: "Rescheduling request for appointment. Updated to Friday 2PM as requested.",
      status: "completed",
      actions: ["Rescheduled appointment", "Sent update"],
      date: "Yesterday",
    },
    {
      id: 5,
      type: "instagram",
      channel: "instagram",
      timestamp: "Yesterday, 2:30 PM",
      title: "Instagram DM inquiry",
      summary: "New patient asking about services and pricing. Draft reply prepared for approval.",
      status: "co-pilot",
      actions: ["Draft ready for review"],
      date: "Yesterday",
    },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "call":
        return <Phone className="h-4 w-4 text-primary" />;
      case "sms":
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-secondary" />;
      case "instagram":
        return <Instagram className="h-4 w-4 text-secondary" />;
      case "email":
        return <Mail className="h-4 w-4 text-secondary" />;
      default:
        return <MessageSquare className="h-4 w-4 text-secondary" />;
    }
  };

  const filteredLogs = logs
    .filter((log) => {
      const matchesSearch = log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = channelFilter === "all" || log.channel === channelFilter;
      return matchesSearch && matchesChannel;
    });

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-xl font-bold text-foreground">Activity Logs</h2>
        <p className="text-xs text-muted-foreground">
          Complete history of all assistant interactions
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={channelFilter} onValueChange={setChannelFilter}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="call" className="text-xs">Calls</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs">Social</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grouped Logs */}
      <div className="space-y-4">
        {Object.entries(groupedLogs).map(([date, dateLogs]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{date}</h3>
            <div className="space-y-2">
              {dateLogs.map((log) => (
                <Card key={log.id} className="border-0 p-3 shadow-sm transition-all hover:shadow-md">
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      {getChannelIcon(log.channel)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{log.title}</h4>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-xs ${
                            log.status === "completed"
                              ? "border-success/30 bg-success/10 text-success"
                              : log.status === "auto-replied"
                              ? "border-info/30 bg-info/10 text-info"
                              : log.status === "co-pilot"
                              ? "border-secondary/30 bg-secondary/10 text-secondary"
                              : "border-warning/30 bg-warning/10 text-warning"
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{log.timestamp}</span>
                      </div>

                      <p className="text-xs text-foreground">{log.summary}</p>

                      {log.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {log.actions.map((action, index) => (
                            <span
                              key={index}
                              className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                              ✓ {action}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLogs;
