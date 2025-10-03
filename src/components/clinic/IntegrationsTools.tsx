import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneNumbers } from "./PhoneNumbers";
import { Calendar, Mail, Database, Clock, ExternalLink } from "lucide-react";

interface IntegrationsToolsProps {
  clinicId: string;
}

const integrations = [
  {
    id: "calendar",
    name: "Calendar",
    description: "Connect your Google Calendar or Outlook",
    icon: Calendar,
    status: "not_connected",
    providers: ["Google Calendar", "Outlook", "Apple Calendar"],
  },
  {
    id: "email",
    name: "Email",
    description: "Connect your email for automated communications",
    icon: Mail,
    status: "not_connected",
    providers: ["Gmail", "Outlook", "Office 365"],
  },
  {
    id: "crm",
    name: "CRM",
    description: "Sync with your customer relationship management system",
    icon: Database,
    status: "not_connected",
    providers: ["Salesforce", "HubSpot", "Zoho CRM"],
  },
  {
    id: "booking",
    name: "Booking System",
    description: "Connect your appointment booking platform",
    icon: Clock,
    status: "not_connected",
    providers: ["Calendly", "Acuity Scheduling", "Square Appointments"],
  },
];

export const IntegrationsTools = ({ clinicId }: IntegrationsToolsProps) => {
  const handleConnect = (integrationId: string) => {
    console.log("Connecting to:", integrationId);
    // TODO: Implement connection logic
  };

  return (
    <div className="space-y-6">
      {/* Phone Numbers Section */}
      <PhoneNumbers clinicId={clinicId} />

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Tools</CardTitle>
          <CardDescription>
            Connect your essential business tools to streamline operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{integration.name}</h3>
                      <Badge
                        variant={
                          integration.status === "connected"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {integration.status === "connected"
                          ? "Connected"
                          : "Not Connected"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {integration.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {integration.providers.map((provider) => (
                        <Badge key={provider} variant="outline" className="text-xs">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  variant={
                    integration.status === "connected" ? "outline" : "default"
                  }
                  size="sm"
                  onClick={() => handleConnect(integration.id)}
                >
                  {integration.status === "connected" ? (
                    <>
                      Manage
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
