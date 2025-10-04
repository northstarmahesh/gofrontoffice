import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Building2, 
  Instagram, 
  Facebook, 
  Phone, 
  Mail, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { LocationManager } from "./LocationManager";
import { KnowledgeBase } from "./KnowledgeBase";
import { ClinicInfo } from "./ClinicInfo";
import { TwilioConnection } from "./TwilioConnection";

interface ChannelStatus {
  instagram: boolean;
  facebook: boolean;
  phone: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

const ClinicManagement = () => {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
    instagram: false,
    facebook: false,
    phone: false,
    email: false,
    sms: false,
    whatsapp: false,
  });
  const [connectingInstagram, setConnectingInstagram] = useState(false);

  useEffect(() => {
    loadClinicData();
  }, []);

  const loadClinicData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get clinic ID
      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .single();

      if (clinicUsers?.clinic_id) {
        setClinicId(clinicUsers.clinic_id);
        await checkChannelStatus(clinicUsers.clinic_id);
      }
    } catch (error) {
      console.error("Error loading clinic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkChannelStatus = async (clinicIdToCheck: string) => {
    try {
      // Check Instagram/Facebook integrations
      const { data: integrations } = await supabase
        .from("clinic_integrations")
        .select("integration_type, is_connected")
        .eq("clinic_id", clinicIdToCheck);

      // Check phone numbers
      const { data: phoneNumbers } = await supabase
        .from("clinic_phone_numbers")
        .select("channels, is_verified")
        .eq("clinic_id", clinicIdToCheck)
        .eq("is_verified", true);

      // Check clinic email
      const { data: clinic } = await supabase
        .from("clinics")
        .select("email")
        .eq("id", clinicIdToCheck)
        .single();

      setChannelStatus({
        instagram: integrations?.some(i => i.integration_type === "instagram" && i.is_connected) || false,
        facebook: integrations?.some(i => i.integration_type === "facebook" && i.is_connected) || false,
        phone: phoneNumbers?.some(p => p.channels?.includes("voice")) || false,
        sms: phoneNumbers?.some(p => p.channels?.includes("sms")) || false,
        whatsapp: phoneNumbers?.some(p => p.channels?.includes("whatsapp")) || false,
        email: !!clinic?.email,
      });
    } catch (error) {
      console.error("Error checking channel status:", error);
    }
  };

  const handleConnectInstagram = async () => {
    if (!clinicId) {
      toast.error("Please set up your clinic first");
      return;
    }

    setConnectingInstagram(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-oauth-start", {
        body: { clinicId, locationId: null },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.open(data.authUrl, "_blank", "width=600,height=700");
        toast.success("Instagram connection window opened");
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          await checkChannelStatus(clinicId);
          const { data: integration } = await supabase
            .from("clinic_integrations")
            .select("is_connected")
            .eq("clinic_id", clinicId)
            .eq("integration_type", "instagram")
            .single();

          if (integration?.is_connected) {
            clearInterval(pollInterval);
            setConnectingInstagram(false);
            toast.success("Instagram connected successfully!");
          }
        }, 3000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setConnectingInstagram(false);
        }, 120000);
      }
    } catch (error: any) {
      console.error("Error connecting Instagram:", error);
      toast.error(error.message || "Failed to connect Instagram");
      setConnectingInstagram(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Clinic Found</CardTitle>
          <CardDescription>
            You need to create a clinic first before managing channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicInfo />
        </CardContent>
      </Card>
    );
  }

  const connectedCount = Object.values(channelStatus).filter(Boolean).length;
  const totalChannels = 6;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Communication Channels</CardTitle>
                <CardDescription>
                  Connect and manage all your communication channels
                </CardDescription>
              </div>
            </div>
            <Badge variant={connectedCount > 0 ? "default" : "secondary"} className="text-sm">
              {connectedCount} / {totalChannels} Connected
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="twilio">Twilio Setup</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {/* Social Media Channels */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Social Media</CardTitle>
              <CardDescription>Connect your social media accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instagram */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-2">
                    <Instagram className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Instagram Direct Messages</p>
                    <p className="text-sm text-muted-foreground">
                      Respond to Instagram DMs automatically
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channelStatus.instagram ? (
                    <Badge className="bg-success/10 text-success gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Button 
                      onClick={handleConnectInstagram}
                      disabled={connectingInstagram}
                      size="sm"
                    >
                      {connectingInstagram ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Facebook Messenger */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card opacity-60">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#0084FF] p-2">
                    <Facebook className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Facebook Messenger</p>
                    <p className="text-sm text-muted-foreground">
                      Respond to Messenger conversations
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Phone & Messaging */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Phone & Messaging</CardTitle>
              <CardDescription>
                Manage phone numbers for calls, SMS, and WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SMS */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">SMS Messages</p>
                    <p className="text-sm text-muted-foreground">
                      Send and receive text messages
                    </p>
                  </div>
                </div>
                {channelStatus.sms ? (
                  <Badge className="bg-success/10 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add in Locations
                  </Badge>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#25D366] p-2">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp Business</p>
                    <p className="text-sm text-muted-foreground">
                      Connect via WhatsApp Business API
                    </p>
                  </div>
                </div>
                {channelStatus.whatsapp ? (
                  <Badge className="bg-success/10 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add in Locations
                  </Badge>
                )}
              </div>

              {/* Voice Calls */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Voice Calls</p>
                    <p className="text-sm text-muted-foreground">
                      AI-powered call handling
                    </p>
                  </div>
                </div>
                {channelStatus.phone ? (
                  <Badge className="bg-success/10 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add in Locations
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Phone numbers are managed per location. Go to the Locations tab to add phone numbers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Email</CardTitle>
              <CardDescription>Configure email communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Set up email for notifications and responses
                    </p>
                  </div>
                </div>
                {channelStatus.email ? (
                  <Badge className="bg-success/10 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add in Locations
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="twilio">
          <TwilioConnection 
            clinicId={clinicId}
            onConnectionSuccess={() => checkChannelStatus(clinicId)}
          />
        </TabsContent>

        <TabsContent value="locations">
          <LocationManager
            clinicId={clinicId} 
            onUpdate={() => checkChannelStatus(clinicId)}
          />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeBase clinicId={clinicId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicManagement;
