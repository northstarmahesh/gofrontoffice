import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Plug } from "lucide-react";

export const ConnectedServices = () => {
  const integrations = [
    { name: "Calendar", status: "connected", icon: CheckCircle2 },
    { name: "Email", status: "connected", icon: CheckCircle2 },
    { name: "Booking System", status: "pending", icon: CheckCircle2 },
    { name: "CRM", status: "pending", icon: CheckCircle2 },
    { name: "Knowledge Base", status: "connected", icon: CheckCircle2 },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <CardTitle>Connected Services</CardTitle>
        </div>
        <CardDescription>
          Integrations that power your assistant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <span className="text-sm font-medium text-foreground">{integration.name}</span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  integration.status === "connected"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {integration.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
