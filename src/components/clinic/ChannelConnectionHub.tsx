import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageSquare, Instagram, MessageCircle, CheckCircle2, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
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
  });
  const [loading, setLoading] = useState(true);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [copiedVoice, setCopiedVoice] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [vonagePhone, setVonagePhone] = useState("");
  const [connecting, setConnecting] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "bzaqtvjereyqrymupapp";
  const smsWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-sms-webhook`;
  const voiceWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-voice-webhook`;
  const whatsappWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-whatsapp-webhook`;
  const instagramWebhookUrl = `https://${projectId}.supabase.co/functions/v1/instagram-webhook`;

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

      setConnectionStatus({
        phone: hasPhone,
        sms: hasSms,
        whatsapp: hasWhatsApp,
        instagram: hasInstagram,
        messenger: hasMessenger,
      });
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'sms' | 'voice' | 'whatsapp') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'sms') {
        setCopiedSMS(true);
        setTimeout(() => setCopiedSMS(false), 2000);
      } else if (type === 'voice') {
        setCopiedVoice(true);
        setTimeout(() => setCopiedVoice(false), 2000);
      } else {
        setCopiedWhatsApp(true);
        setTimeout(() => setCopiedWhatsApp(false), 2000);
      }
      toast.success("Webhook URL copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleConnectInstagram = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-oauth-start', {
        body: { clinicId, locationId }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.open(data.authUrl, '_blank');
        toast.success("Instagram connection started! Complete the authorization in the new window.");
      }
    } catch (error) {
      console.error("Error connecting Instagram:", error);
      toast.error("Failed to start Instagram connection");
    } finally {
      setConnecting(false);
    }
  };

  const handleAddVonageNumber = async () => {
    if (!vonagePhone) {
      toast.error("Please enter a phone number");
      return;
    }

    setConnecting(true);
    try {
      const { error } = await supabase
        .from("clinic_phone_numbers")
        .insert({
          clinic_id: clinicId,
          location_id: locationId,
          phone_number: vonagePhone,
          channels: ["sms", "voice", "whatsapp"],
          is_verified: true,
          is_active: true
        });

      if (error) throw error;

      toast.success("Phone number added successfully!");
      setVonagePhone("");
      checkConnections();
      onChannelsUpdated?.();
    } catch (error: any) {
      console.error("Error adding phone number:", error);
      toast.error(error.message || "Failed to add phone number");
    } finally {
      setConnecting(false);
    }
  };

  const channels = [
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
      color: "text-purple-500"
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
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Communication Channels</CardTitle>
              <CardDescription>
                Connect channels to enable AI-powered customer communication
              </CardDescription>
            </div>
            <Badge variant={connectedCount >= 2 ? "default" : "secondary"} className="text-lg px-4 py-2">
              {connectedCount}/5 Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <Icon className={`h-6 w-6 ${channel.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{channel.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                  </div>
                  {channel.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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

      {/* Connection Tabs */}
      <Tabs defaultValue="vonage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vonage">Vonage (SMS/Phone/WhatsApp)</TabsTrigger>
          <TabsTrigger value="social">Social Media (Instagram/Messenger)</TabsTrigger>
        </TabsList>

        <TabsContent value="vonage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Vonage Setup
              </CardTitle>
              <CardDescription>
                Connect SMS, WhatsApp, and Voice calls through Vonage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Webhook URLs */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Step 1: Configure Vonage Webhooks</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">SMS Webhook URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={smsWebhookUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(smsWebhookUrl, 'sms')}
                      >
                        {copiedSMS ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Voice Webhook URL (Answer URL)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={voiceWebhookUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(voiceWebhookUrl, 'voice')}
                      >
                        {copiedVoice ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">WhatsApp Webhook URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={whatsappWebhookUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(whatsappWebhookUrl, 'whatsapp')}
                      >
                        {copiedWhatsApp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('https://dashboard.nexmo.com', '_blank')}
                >
                  Open Vonage Dashboard
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Step 2: Add Phone Number */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Step 2: Add Your Vonage Phone Number</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="+46701234567"
                    value={vonagePhone}
                    onChange={(e) => setVonagePhone(e.target.value)}
                  />
                  <Button onClick={handleAddVonageNumber} disabled={connecting || !vonagePhone}>
                    {connecting ? "Adding..." : "Add Number"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the phone number you configured in Vonage Dashboard
                </p>
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-medium text-sm">Quick Setup Guide:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>Sign up at <a href="https://www.vonage.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vonage.com</a></li>
                  <li>Get your API Key & Secret from the dashboard</li>
                  <li>Configure the webhook URLs above in Vonage settings</li>
                  <li>Get a phone number from Vonage</li>
                  <li>Enter your phone number here and click "Add Number"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Social Media Channels
              </CardTitle>
              <CardDescription>
                Connect Instagram and Facebook Messenger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instagram */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      Instagram Direct Messages
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connect your Instagram Business account
                    </p>
                  </div>
                  {connectionStatus.instagram ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Button onClick={handleConnectInstagram} disabled={connecting}>
                      {connecting ? "Connecting..." : "Connect Instagram"}
                    </Button>
                  )}
                </div>

                {!connectionStatus.instagram && (
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <h5 className="font-medium text-xs">Requirements:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      <li>Instagram Business or Creator account</li>
                      <li>Facebook Page linked to your Instagram</li>
                      <li>Admin access to the Facebook Page</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      Facebook Messenger
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connect your Facebook Page for Messenger
                    </p>
                  </div>
                  {connectionStatus.messenger ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Button disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};