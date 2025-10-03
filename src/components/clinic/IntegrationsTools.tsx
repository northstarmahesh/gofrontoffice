import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneNumbers } from "./PhoneNumbers";
import { Calendar, Mail, Users, Clock, DollarSign, ExternalLink, Instagram, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntegrationsToolsProps {
  clinicId: string;
}

const serviceCategories = [
  {
    category: "Social Media",
    icon: Instagram,
    services: [
      { id: "instagram", name: "Instagram DM", description: "Direct message integration" },
      { id: "messenger", name: "Facebook Messenger", description: "Facebook chat integration" },
    ]
  },
  {
    category: "Email",
    icon: Mail,
    services: [
      { id: "gmail", name: "Gmail", description: "Connect Gmail for email management" },
      { id: "outlook", name: "Outlook", description: "Connect Outlook/Microsoft 365" },
    ]
  },
  {
    category: "Calendar",
    icon: Calendar,
    services: [
      { id: "google-calendar", name: "Google Calendar", description: "Sync appointments and events" },
      { id: "outlook-calendar", name: "Outlook Calendar", description: "Microsoft calendar integration" },
    ]
  },
  {
    category: "CRM",
    icon: Users,
    services: [
      { id: "salesforce", name: "Salesforce", description: "Enterprise CRM platform" },
      { id: "hubspot", name: "HubSpot", description: "Marketing & sales CRM" },
      { id: "zoho", name: "Zoho CRM", description: "Cloud-based CRM solution" },
      { id: "pipedrive", name: "Pipedrive", description: "Sales-focused CRM" },
      { id: "lime", name: "Lime CRM", description: "Swedish CRM platform" },
    ]
  },
  {
    category: "Booking System",
    icon: Clock,
    services: [
      { id: "clinicbuddy", name: "Clinicbuddy", description: "Healthcare appointment system" },
      { id: "bokadirekt", name: "Bokadirekt", description: "Swedish booking platform" },
      { id: "google-sheets", name: "Google Sheets", description: "Spreadsheet-based booking" },
      { id: "airtable", name: "Airtable", description: "Flexible booking database" },
    ]
  },
  {
    category: "Accounting System",
    icon: DollarSign,
    services: [
      { id: "fortnox", name: "Fortnox", description: "Swedish accounting system" },
      { id: "bjornlunden", name: "Björn Lundén", description: "Swedish accounting & payroll" },
    ]
  },
];

export const IntegrationsTools = ({ clinicId }: IntegrationsToolsProps) => {
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  const handleConnect = async (serviceId: string, serviceName: string) => {
    setConnectingTo(serviceId);
    
    try {
      // Instagram OAuth flow
      if (serviceId === 'instagram') {
        console.log('Starting Instagram OAuth for clinic:', clinicId);
        
        const { data, error } = await supabase.functions.invoke('instagram-oauth-start', {
          body: { clinicId, locationId: null }
        });

        console.log('Instagram OAuth response:', { data, error });

        if (error) {
          console.error('Instagram OAuth error:', error);
          throw error;
        }
        if (!data?.authUrl) {
          console.error('No auth URL in response:', data);
          throw new Error('No auth URL returned');
        }

        console.log('Opening OAuth URL:', data.authUrl);

        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          data.authUrl,
          'Instagram OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          throw new Error('Popup was blocked. Please allow popups for this site.');
        }

        toast.success('Opening Instagram login...', {
          description: 'Please complete the authorization in the popup window.',
        });

        return;
      }

      // Check if integration already exists
      const { data: existing } = await supabase
        .from("clinic_integrations")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("integration_type", serviceId)
        .maybeSingle();

      if (existing) {
        toast.info(`${serviceName} is already configured. Opening settings...`);
        return;
      }

      // Create placeholder integration record
      const { error } = await supabase
        .from("clinic_integrations")
        .insert({
          clinic_id: clinicId,
          integration_type: serviceId,
          is_connected: false,
        });

      if (error) throw error;

      toast.success(`Starting ${serviceName} connection...`, {
        description: "You'll be redirected to authorize the integration.",
      });
      
      setTimeout(() => {
        toast.info("Integration setup", {
          description: `To complete ${serviceName} setup, you'll need to configure OAuth credentials in your integration settings.`,
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
      {/* Service Categories */}
      <div className="space-y-6">
        {serviceCategories.map((category) => {
          const CategoryIcon = category.icon;
          
          return (
            <Card key={category.category}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <CategoryIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                    <CardDescription>Connect your {category.category.toLowerCase()} services</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {category.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">{service.name}</h4>
                          <Badge variant="outline" className="bg-muted text-xs shrink-0">
                            Not Connected
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {service.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(service.id, service.name)}
                        disabled={connectingTo === service.id}
                        className="ml-3 shrink-0"
                      >
                        {connectingTo === service.id ? "..." : "Connect"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Phone Numbers Section - Coming Soon */}
      <PhoneNumbers clinicId={clinicId} />
    </div>
  );
};