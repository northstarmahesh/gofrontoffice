import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plug, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface ConnectedServicesProps {
  clinicId?: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "connected" | "disconnected";
  icon: typeof CheckCircle2;
}

export const ConnectedServices = ({ clinicId }: ConnectedServicesProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "outlook_calendar", name: "Outlook Calendar", type: "outlook_calendar", description: "Sync your Outlook calendar", status: "disconnected", icon: CheckCircle2 },
    { id: "outlook_email", name: "Outlook Email", type: "outlook_email", description: "Access your Outlook emails", status: "disconnected", icon: CheckCircle2 },
    { id: "gmail_calendar", name: "Google Calendar", type: "gmail_calendar", description: "Sync your Google calendar", status: "disconnected", icon: CheckCircle2 },
    { id: "gmail_email", name: "Gmail", type: "gmail_email", description: "Access your Gmail", status: "disconnected", icon: CheckCircle2 },
  ]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (clinicId) {
      loadIntegrations();
    } else {
      setLoading(false);
    }
  }, [clinicId]);

  const loadIntegrations = async () => {
    if (!clinicId) return;
    
    try {
      const { data, error } = await supabase
        .from("clinic_integrations")
        .select("*")
        .eq("clinic_id", clinicId);

      if (error) throw error;

      if (data) {
        setIntegrations(prev => 
          prev.map(integration => {
            const connected = data.find(d => d.integration_type === integration.type && d.is_connected);
            return {
              ...integration,
              status: connected ? "connected" : "disconnected"
            };
          })
        );
      }
    } catch (error) {
      console.error("Error loading integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationType: string) => {
    if (!clinicId) {
      toast.error("Please complete business setup first");
      return;
    }

    setConnecting(integrationType);
    try {
      // For now, we'll simulate the OAuth flow
      // In production, this would redirect to the OAuth provider
      toast.info("OAuth integration coming soon! This will redirect you to authorize the service.");
      
      // Simulated connection for demo purposes
      // await supabase.from("clinic_integrations").upsert({
      //   clinic_id: clinicId,
      //   integration_type: integrationType,
      //   is_connected: true
      // });
      
      // await loadIntegrations();
    } catch (error) {
      console.error("Error connecting integration:", error);
      toast.error("Failed to connect integration");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationType: string) => {
    if (!clinicId) return;

    try {
      const { error } = await supabase
        .from("clinic_integrations")
        .update({ is_connected: false, access_token: null, refresh_token: null })
        .eq("clinic_id", clinicId)
        .eq("integration_type", integrationType);

      if (error) throw error;

      toast.success("Integration disconnected");
      await loadIntegrations();
    } catch (error) {
      console.error("Error disconnecting integration:", error);
      toast.error("Failed to disconnect integration");
    }
  };

  if (loading) {
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }


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
            <div key={integration.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {integration.status === "connected" ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-success/10 text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(integration.type)}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Not connected
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(integration.type)}
                      disabled={connecting === integration.type}
                    >
                      {connecting === integration.type ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
