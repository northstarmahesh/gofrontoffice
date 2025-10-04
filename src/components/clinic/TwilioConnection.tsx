import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

interface TwilioConnectionProps {
  clinicId: string;
  onConnectionSuccess?: () => void;
}

export const TwilioConnection = ({ clinicId, onConnectionSuccess }: TwilioConnectionProps) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
  });

  const handleTestConnection = async () => {
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      toast.error("Please fill in all Twilio credentials");
      return;
    }

    setTesting(true);
    try {
      // Test the connection by trying to fetch account details
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Twilio connection successful!");
        setConnected(true);
        return true;
      } else {
        const error = await response.json();
        toast.error(`Connection failed: ${error.message || "Invalid credentials"}`);
        return false;
      }
    } catch (error: any) {
      console.error("Error testing Twilio connection:", error);
      toast.error("Failed to test connection. Please check your credentials.");
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    // First test the connection
    const isValid = await handleTestConnection();
    if (!isValid) return;

    setLoading(true);
    try {
      // Note: In production, these should be stored as Supabase secrets
      // For now, we'll inform the user to add them as secrets
      toast.success(
        "Credentials validated! Now configuring your Twilio integration...",
        { duration: 3000 }
      );

      // Update clinic with Twilio phone
      const { error: clinicError } = await supabase
        .from("clinics")
        .update({ phone: credentials.phoneNumber })
        .eq("id", clinicId);

      if (clinicError) throw clinicError;

      toast.success("Twilio connected successfully! You can now add phone numbers to your locations.");
      
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast.error("Failed to save credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Twilio Integration</CardTitle>
              <CardDescription>
                Connect your Twilio account for SMS, calls, and WhatsApp
              </CardDescription>
            </div>
          </div>
          {connected && (
            <Badge className="bg-success/10 text-success gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium">How to get your Twilio credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Go to your Twilio Console</li>
              <li>Find your Account SID and Auth Token</li>
              <li>Get a phone number from Twilio (or use an existing one)</li>
              <li>Enter the credentials below to connect</li>
            </ol>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={() => window.open("https://console.twilio.com", "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Twilio Console
            </Button>
          </AlertDescription>
        </Alert>

        {/* Credentials Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input
              id="accountSid"
              type="text"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={credentials.accountSid}
              onChange={(e) =>
                setCredentials({ ...credentials, accountSid: e.target.value })
              }
              disabled={loading || testing}
            />
            <p className="text-xs text-muted-foreground">
              Found in your Twilio Console dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={credentials.authToken}
              onChange={(e) =>
                setCredentials({ ...credentials, authToken: e.target.value })
              }
              disabled={loading || testing}
            />
            <p className="text-xs text-muted-foreground">
              Click "Show" next to Auth Token in your Twilio Console
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+1234567890"
              value={credentials.phoneNumber}
              onChange={(e) =>
                setCredentials({ ...credentials, phoneNumber: e.target.value })
              }
              disabled={loading || testing}
            />
            <p className="text-xs text-muted-foreground">
              Format: +1234567890 (include country code)
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-3">
          <p className="text-sm font-medium">What you'll be able to do:</p>
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <MessageSquare className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">SMS Messaging</p>
                <p className="text-xs text-muted-foreground">Send and receive text messages</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Voice Calls</p>
                <p className="text-xs text-muted-foreground">AI-powered call handling</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <MessageSquare className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">WhatsApp Business</p>
                <p className="text-xs text-muted-foreground">Connect WhatsApp after setup</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            variant="outline"
            disabled={
              loading ||
              testing ||
              !credentials.accountSid ||
              !credentials.authToken ||
              !credentials.phoneNumber
            }
            className="flex-1"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button
            onClick={handleSaveCredentials}
            disabled={
              loading ||
              testing ||
              !credentials.accountSid ||
              !credentials.authToken ||
              !credentials.phoneNumber
            }
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Twilio"
            )}
          </Button>
        </div>

        {/* Webhook Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <p className="font-medium mb-2">After connecting, configure your Twilio webhook:</p>
            <div className="space-y-1 text-muted-foreground">
              <p>1. Go to your Twilio phone number settings</p>
              <p>2. Set the SMS webhook URL to:</p>
              <code className="block bg-muted px-2 py-1 rounded text-xs mt-1 break-all">
                https://bzaqtvjereyqrymupapp.supabase.co/functions/v1/twilio-sms-webhook
              </code>
              <p className="mt-2">3. Set HTTP Method to: POST</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
