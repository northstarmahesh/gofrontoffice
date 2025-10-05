import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Instagram, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface InstagramConnectionProps {
  clinicId: string;
  locationId: string;
  isConnected: boolean;
  onConnectionChange: () => void;
}

export function InstagramConnection({ 
  clinicId, 
  locationId, 
  isConnected,
  onConnectionChange 
}: InstagramConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
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

      const { data, error } = await supabase.functions.invoke('instagram-oauth-start', {
        body: { clinicId, locationId: validLocationId }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.authUrl,
          'Instagram Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (popup) {
          toast({
            title: "Authorization Started",
            description: "Please complete the authorization in the popup window.",
          });

          // Poll for connection status
          const pollInterval = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollInterval);
              
              // Check if connection was successful
              const { data: integration } = await supabase
                .from('clinic_integrations')
                .select('is_connected')
                .eq('clinic_id', clinicId)
                .eq('integration_type', 'instagram')
                .maybeSingle();

              if (integration?.is_connected) {
                toast({
                  title: "Success",
                  description: "Instagram connected successfully!",
                });
                onConnectionChange();
              }
              setIsConnecting(false);
            }
          }, 1000);

          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            if (!popup.closed) {
              popup.close();
            }
            setIsConnecting(false);
          }, 300000);
        } else {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and try again.",
            variant: "destructive",
          });
          setIsConnecting(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting Instagram:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start Instagram connection",
        variant: "destructive",
      });
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
        .eq('integration_type', 'instagram');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Instagram disconnected successfully",
      });

      onConnectionChange();
    } catch (error: any) {
      console.error('Error disconnecting Instagram:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Instagram",
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
          <Instagram className="h-5 w-5 text-primary" />
          <CardTitle>Instagram Direct Messages</CardTitle>
          {isConnected && (
            <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
          )}
        </div>
        <CardDescription>
          Connect your Instagram Business account to receive and respond to DMs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>A Facebook Page</li>
                    <li>An Instagram Business account linked to that Page</li>
                    <li>Admin access to the Facebook Page</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect Instagram"}
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://business.facebook.com/settings/instagram-accounts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Link Instagram to Facebook Page
              </a>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Instagram is connected and active
              </span>
            </div>

            <Button 
              onClick={handleDisconnect} 
              disabled={isConnecting}
              variant="destructive"
              className="w-full"
            >
              {isConnecting ? "Disconnecting..." : "Disconnect Instagram"}
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">How it works:</p>
              <p>When you connect, we'll access your Instagram Business account through Facebook. You'll be able to receive and respond to Instagram DMs through your AI assistant.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}