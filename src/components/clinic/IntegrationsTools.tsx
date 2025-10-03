import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneNumbers } from "./PhoneNumbers";
import { Calendar, Mail, Database, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntegrationsToolsProps {
  clinicId: string;
}

const integrations = [
  {
    id: "google",
    name: "Google Workspace",
    description: "Connect Google Calendar, Gmail, and Drive",
    icon: Calendar,
    status: "not_connected",
    providers: ["Google Calendar", "Gmail", "Google Drive", "Google Contacts"],
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Connect Outlook, Teams, and OneDrive",
    icon: Mail,
    status: "not_connected",
    providers: ["Outlook Calendar", "Microsoft Teams", "OneDrive", "Exchange"],
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business",
    description: "Connect WhatsApp Business API for messaging",
    icon: Mail,
    status: "not_connected",
    providers: ["WhatsApp Business API"],
    note: "One WhatsApp number per location",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect Instagram for direct messaging",
    icon: Mail,
    status: "not_connected",
    providers: ["Instagram Direct Messages"],
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Connect Facebook Messenger for customer chat",
    icon: Mail,
    status: "not_connected",
    providers: ["Facebook Messenger"],
  },
  {
    id: "crm",
    name: "CRM Systems",
    description: "Connect your customer relationship management platform",
    icon: Database,
    status: "not_connected",
    providers: ["Salesforce", "HubSpot", "Zoho CRM", "Pipedrive", "Lime CRM"],
  },
  {
    id: "booking",
    name: "Booking Systems",
    description: "Connect appointment booking platforms",
    icon: Clock,
    status: "not_connected",
    providers: ["Clinicbuddy", "Bokadirekt", "Google Sheets", "Airtable"],
  },
];

export const IntegrationsTools = ({ clinicId }: IntegrationsToolsProps) => {
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  const handleConnect = async (integrationId: string, integrationName: string) => {
    setConnectingTo(integrationId);
    
    try {
      // Check if integration already exists
      const { data: existing } = await supabase
        .from("clinic_integrations")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("integration_type", integrationId)
        .maybeSingle();

      if (existing) {
        toast.info(`${integrationName} is already configured. Opening settings...`);
        // TODO: Open integration management dialog
        return;
      }

      // Create placeholder integration record
      const { error } = await supabase
        .from("clinic_integrations")
        .insert({
          clinic_id: clinicId,
          integration_type: integrationId,
          is_connected: false,
        });

      if (error) throw error;

      toast.success(`Starting ${integrationName} connection...`, {
        description: "You'll be redirected to authorize the integration.",
      });
      
      // In a real implementation, this would redirect to OAuth flow
      // For now, show a helpful message
      setTimeout(() => {
        toast.info("Integration setup", {
          description: `To complete ${integrationName} setup, you'll need to configure OAuth credentials in your integration settings.`,
        });
      }, 1500);
      
    } catch (error) {
      console.error("Error connecting integration:", error);
      toast.error("Failed to start connection process");
    } finally {
      setConnectingTo(null);
    }
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
                        className={
                          integration.status === "connected"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
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
                    {(integration as any).note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {(integration as any).note}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant={
                    integration.status === "connected" ? "outline" : "default"
                  }
                  size="sm"
                  onClick={() => handleConnect(integration.id, integration.name)}
                  disabled={connectingTo === integration.id}
                >
                  {connectingTo === integration.id ? (
                    "Connecting..."
                  ) : integration.status === "connected" ? (
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
