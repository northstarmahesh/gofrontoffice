import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ActivityLogs = () => {
  const logs = [
    {
      id: 1,
      type: "call",
      timestamp: "Today, 10:24 AM",
      title: "Incoming call from John Doe",
      summary: "Patient inquired about appointment availability for next week. Provided available slots and confirmed booking for Tuesday 3PM.",
      status: "completed",
      actions: ["Created appointment", "Sent confirmation SMS"],
    },
    {
      id: 2,
      type: "sms",
      timestamp: "Today, 9:45 AM",
      title: "SMS from Sarah Smith",
      summary: "Appointment confirmation request. Auto-replied with confirmation and clinic address.",
      status: "auto-replied",
      actions: ["Sent auto-reply"],
    },
    {
      id: 3,
      type: "whatsapp",
      timestamp: "Today, 8:30 AM",
      title: "WhatsApp from Mike Johnson",
      summary: "Question about prescription refill. Requires doctor approval.",
      status: "pending",
      actions: ["Created task for review"],
    },
    {
      id: 4,
      type: "call",
      timestamp: "Yesterday, 4:15 PM",
      title: "Call from Emily Davis",
      summary: "Rescheduling request for appointment. Updated to Friday 2PM as requested.",
      status: "completed",
      actions: ["Rescheduled appointment", "Sent update"],
    },
    {
      id: 5,
      type: "instagram",
      timestamp: "Yesterday, 2:30 PM",
      title: "Instagram DM inquiry",
      summary: "New patient asking about services and pricing. Draft reply prepared for approval.",
      status: "co-pilot",
      actions: ["Draft ready for review"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Activity Logs</h2>
        <p className="text-sm text-muted-foreground">
          Complete history of all assistant interactions
        </p>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id} className="border-0 p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex gap-4">
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {log.type === "call" ? (
                  <Phone className="h-6 w-6 text-primary" />
                ) : (
                  <MessageSquare className="h-6 w-6 text-secondary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground">{log.title}</h4>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
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
                  <Clock className="h-3.5 w-3.5" />
                  <span>{log.timestamp}</span>
                </div>

                <p className="text-sm text-foreground">{log.summary}</p>

                {log.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {log.actions.map((action, index) => (
                      <span
                        key={index}
                        className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
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
  );
};

export default ActivityLogs;
