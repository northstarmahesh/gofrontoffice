import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Instagram, MessageCircle, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChannelConnectionHubProps {
  clinicId: string;
  locationId?: string;
  onChannelsUpdated?: () => void;
}

export const ChannelConnectionHub = ({ clinicId, locationId, onChannelsUpdated }: ChannelConnectionHubProps) => {
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    whatsapp: false,
    instagram: false,
    messenger: false,
    email: false,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    checkConnections();
  }, [clinicId, locationId]);

  const checkConnections = async () => {
    try {
      // Check phone numbers
      const { data: phoneData } = await supabase
        .from("clinic_phone_numbers")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_verified", true);

      const hasPhone = phoneData?.some(p => p.channels?.includes("voice")) || false;
      const hasSms = phoneData?.some(p => p.channels?.includes("sms")) || false;
      const hasWhatsApp = phoneData?.some(p => p.channels?.includes("whatsapp")) || false;

      // Check integrations
      const { data: integrationData } = await supabase
        .from("clinic_integrations")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_connected", true);

      const hasInstagram = integrationData?.some(i => i.integration_type === "instagram") || false;
      const hasMessenger = integrationData?.some(i => i.integration_type === "messenger") || false;

      const hasEmail = integrationData?.some(i => i.integration_type === "gmail" || i.integration_type === "outlook") || false;

      setConnectionStatus({
        phone: hasPhone,
        sms: hasSms,
        whatsapp: hasWhatsApp,
        instagram: hasInstagram,
        messenger: hasMessenger,
        email: hasEmail,
      });
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectChannel = async (channelId: string) => {
    setConnecting(channelId);
    
    try {
      if (channelId === "instagram") {
        const { data, error } = await supabase.functions.invoke('instagram-oauth-start', {
          body: { clinicId, locationId }
        });

        if (error) throw error;

        if (data?.authUrl) {
          window.open(data.authUrl, '_blank');
          toast.success("Instagram connection started! Complete the authorization in the new window.");
        }
      } else if (channelId === "phone" || channelId === "sms" || channelId === "whatsapp") {
        toast.info("Set up Vonage", {
          description: "Visit dashboard.nexmo.com to configure your phone, SMS, and WhatsApp channels.",
          action: {
            label: "Open Vonage",
            onClick: () => window.open('https://dashboard.nexmo.com', '_blank')
          }
        });
      } else if (channelId === "email") {
        toast.info("Email integration coming soon", {
          description: "Gmail and Outlook integrations will be available soon.",
        });
      } else if (channelId === "messenger") {
        toast.info("Messenger integration coming soon", {
          description: "Facebook Messenger will be available soon.",
        });
      }
    } catch (error) {
      console.error(`Error connecting ${channelId}:`, error);
      toast.error(`Failed to connect ${channelId}`);
    } finally {
      setConnecting(null);
    }
  };


  const channels = [
    { 
      id: "email", 
      name: "Email", 
      icon: Mail, 
      connected: connectionStatus.email, 
      description: "Gmail & Outlook integration",
      color: "text-purple-500"
    },
    { 
      id: "sms", 
      name: "SMS", 
      icon: MessageSquare, 
      connected: connectionStatus.sms, 
      description: "Send and receive text messages",
      color: "text-blue-500"
    },
    { 
      id: "whatsapp", 
      name: "WhatsApp", 
      icon: MessageCircle, 
      connected: connectionStatus.whatsapp, 
      description: "WhatsApp Business messaging",
      color: "text-green-500"
    },
    { 
      id: "phone", 
      name: "Phone", 
      icon: Phone, 
      connected: connectionStatus.phone, 
      description: "Voice calls with AI assistant",
      color: "text-orange-500"
    },
    { 
      id: "instagram", 
      name: "Instagram DM", 
      icon: Instagram, 
      connected: connectionStatus.instagram, 
      description: "Instagram direct messages",
      color: "text-pink-500"
    },
    { 
      id: "messenger", 
      name: "Messenger", 
      icon: MessageCircle, 
      connected: connectionStatus.messenger, 
      description: "Facebook Messenger",
      color: "text-blue-600"
    },
  ];

  const connectedCount = Object.values(connectionStatus).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Communication Channels</CardTitle>
            <CardDescription>
              Connect all your channels to get maximum assistant coverage
            </CardDescription>
          </div>
          <Badge variant={connectedCount >= 2 ? "default" : "secondary"} className="text-lg px-4 py-2">
            {connectedCount}/6 Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div key={channel.id} className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${channel.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{channel.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                  </div>
                  {channel.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  ) : null}
                </div>
                {!channel.connected && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleConnectChannel(channel.id)}
                    disabled={connecting === channel.id}
                    className="w-full"
                  >
                    {connecting === channel.id ? "Connecting..." : "Connect"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {connectedCount < 2 && (
          <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground font-medium">
              ⚠️ Connect at least 2 channels to enable your AI assistant
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};