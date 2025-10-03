import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Mail, Instagram, MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LocationManager } from "./LocationManager";

interface ChannelConnectionsProps {
  clinicId: string;
  onChannelsConnected?: (hasConnection: boolean) => void;
}

export const ChannelConnections = ({ clinicId, onChannelsConnected }: ChannelConnectionsProps) => {
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    email: false,
    instagram: false,
    facebook: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnections();
  }, [clinicId]);

  useEffect(() => {
    const hasAnyConnection = Object.values(connectionStatus).some(status => status);
    onChannelsConnected?.(hasAnyConnection);
  }, [connectionStatus]);

  const checkConnections = async () => {
    try {
      // Check phone numbers
      const { data: phoneData } = await supabase
        .from("clinic_phone_numbers")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_verified", true);

      // Check locations for social connections
      const { data: locationData } = await supabase
        .from("clinic_locations")
        .select("*")
        .eq("clinic_id", clinicId);

      const hasPhone = phoneData?.some(p => p.channels?.includes("voice")) || false;
      const hasSms = phoneData?.some(p => p.channels?.includes("sms")) || false;
      const hasInstagram = locationData?.some(l => l.instagram_connected) || false;
      const hasFacebook = locationData?.some(l => l.facebook_connected) || false;

      // Check email (clinic email)
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("email")
        .eq("id", clinicId)
        .single();

      setConnectionStatus({
        phone: hasPhone,
        sms: hasSms,
        email: !!clinicData?.email,
        instagram: hasInstagram,
        facebook: hasFacebook,
      });
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const channels = [
    { id: "phone", name: "Phone Calls", icon: Phone, connected: connectionStatus.phone, description: "Receive and make calls" },
    { id: "sms", name: "SMS", icon: MessageSquare, connected: connectionStatus.sms, description: "Send and receive text messages" },
    { id: "email", name: "Email", icon: Mail, connected: connectionStatus.email, description: "Email communication" },
    { id: "instagram", name: "Instagram DM", icon: Instagram, connected: connectionStatus.instagram, description: "Instagram direct messages" },
    { id: "facebook", name: "Messenger", icon: MessageCircle, connected: connectionStatus.facebook, description: "Facebook Messenger" },
  ];

  const hasAnyConnection = Object.values(connectionStatus).some(status => status);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Channels</CardTitle>
          <CardDescription>
            Connect at least one communication channel to get started. You can add more later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{channel.description}</p>
                    </div>
                  </div>
                  <Badge variant={channel.connected ? "default" : "secondary"}>
                    {channel.connected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </>
                    )}
                  </Badge>
                </div>
              );
            })}
          </div>

          {!hasAnyConnection && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning-foreground">
                ⚠️ Connect at least one channel to continue
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Manager for adding phone numbers and social connections */}
      <LocationManager clinicId={clinicId} onUpdate={checkConnections} />
    </div>
  );
};
