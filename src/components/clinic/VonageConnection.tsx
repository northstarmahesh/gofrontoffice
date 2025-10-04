import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Check } from "lucide-react";

const VonageConnection = () => {
  const { toast } = useToast();
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [copiedVoice, setCopiedVoice] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const smsWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-sms-webhook`;
  const voiceWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-voice-webhook`;
  const whatsappWebhookUrl = `https://${projectId}.supabase.co/functions/v1/vonage-whatsapp-webhook`;

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
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vonage Setup</CardTitle>
          <CardDescription>
            Configure your Vonage account to handle SMS, Voice, and WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>SMS Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={smsWebhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(smsWebhookUrl, 'sms')}
              >
                {copiedSMS ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Set this as your Inbound SMS Webhook URL in Vonage Dashboard → Settings → API Settings
            </p>
          </div>

          <div className="space-y-2">
            <Label>Voice Webhook URL (Answer URL)</Label>
            <div className="flex gap-2">
              <Input
                value={voiceWebhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(voiceWebhookUrl, 'voice')}
              >
                {copiedVoice ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Set this as your Answer URL in Vonage Dashboard → Voice → Your Applications → Edit Settings
            </p>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={whatsappWebhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(whatsappWebhookUrl, 'whatsapp')}
              >
                {copiedWhatsApp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Set this as your Inbound Message Webhook in Vonage Dashboard → Messages & Dispatch → Sandbox
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Sign up for a Vonage account at vonage.com</li>
              <li>Get your API Key and API Secret from the Vonage Dashboard</li>
              <li>Add these credentials in Settings → Secrets (already done)</li>
              <li>Configure the webhook URLs above in your Vonage Dashboard</li>
              <li>For WhatsApp, enable the WhatsApp Sandbox in Messages & Dispatch</li>
              <li>Add your Vonage phone number to a location in Settings → Locations</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VonageConnection;
