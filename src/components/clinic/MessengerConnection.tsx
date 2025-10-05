import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface MessengerConnectionProps {
  clinicId: string;
  locationId: string;
  isConnected: boolean;
  onConnectionChange: () => void;
}

export function MessengerConnection({ 
  clinicId, 
  locationId, 
  isConnected,
  onConnectionChange 
}: MessengerConnectionProps) {
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!pageAccessToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Page Access Token",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Get a valid locationId - if not provided, use the first location for this clinic
      let validLocationId = locationId && locationId.trim() !== "" ? locationId : null;
      
      if (!validLocationId) {
        const { data: locations } = await supabase
          .from('clinic_locations')
          .select('id')
          .eq('clinic_id', clinicId)
          .limit(1)
          .maybeSingle();
        
        validLocationId = locations?.id || null;
      }

      // Check if integration exists
      const { data: existing } = await supabase
        .from('clinic_integrations')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('integration_type', 'messenger')
        .maybeSingle();

      if (existing) {
        // Update existing integration
        const { error } = await supabase
          .from('clinic_integrations')
          .update({
            access_token: pageAccessToken,
            is_connected: true,
            location_id: validLocationId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new integration
        const { error } = await supabase
          .from('clinic_integrations')
          .insert({
            clinic_id: clinicId,
            location_id: validLocationId,
            integration_type: 'messenger',
            access_token: pageAccessToken,
            is_connected: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Messenger connected successfully!",
      });

      setPageAccessToken("");
      onConnectionChange();
    } catch (error: any) {
      console.error('Error connecting Messenger:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect Messenger",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);

    try {
      const { error } = await supabase
        .from('clinic_integrations')
        .update({
          is_connected: false,
          access_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('clinic_id', clinicId)
        .eq('integration_type', 'messenger');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Messenger disconnected successfully",
      });

      onConnectionChange();
    } catch (error: any) {
      console.error('Error disconnecting Messenger:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Messenger",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle>Facebook Messenger</CardTitle>
          {isConnected && (
            <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
          )}
        </div>
        <CardDescription>
          Connect your Facebook Page to receive and respond to Messenger messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="page-access-token">Page Access Token</Label>
              <Input
                id="page-access-token"
                type="password"
                placeholder="Enter your Facebook Page Access Token"
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get your token from Meta App Dashboard → Messenger → Settings → Access Tokens
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect Messenger"}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Messenger is connected and active
              </span>
            </div>

            <Button 
              onClick={handleDisconnect} 
              disabled={isConnecting}
              variant="destructive"
              className="w-full"
            >
              {isConnecting ? "Disconnecting..." : "Disconnect Messenger"}
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Webhook Configuration:</p>
              <p>Make sure your webhook is configured in Meta App Dashboard with:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Callback URL: Your webhook endpoint</li>
                <li>Subscriptions: messages, messaging_postbacks</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
