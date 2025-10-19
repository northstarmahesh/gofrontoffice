import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface WhatsAppConnectionProps {
  clinicId: string;
  locationId: string;
  isConnected: boolean;
  onConnectionChange: () => void;
}

export function WhatsAppConnection({ 
  clinicId, 
  locationId, 
  isConnected,
  onConnectionChange 
}: WhatsAppConnectionProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your WhatsApp Business phone number",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Get a valid locationId
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

      // Store WhatsApp number in clinic_phone_numbers
      const { data: existingPhone, error: checkError } = await supabase
        .from('clinic_phone_numbers')
        .select('id, channels')
        .eq('clinic_id', clinicId)
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingPhone) {
        // Update existing phone to add whatsapp channel
        const channels = existingPhone.channels || [];
        if (!channels.includes('whatsapp')) {
          channels.push('whatsapp');
        }

        const { error } = await supabase
          .from('clinic_phone_numbers')
          .update({
            channels,
            is_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPhone.id);

        if (error) throw error;
      } else {
        // Create new phone number entry
        const { error } = await supabase
          .from('clinic_phone_numbers')
          .insert({
            clinic_id: clinicId,
            location_id: validLocationId,
            phone_number: phoneNumber,
            channels: ['whatsapp'],
            is_verified: true,
            channel: 'whatsapp',
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "WhatsApp connected successfully!",
      });

      setPhoneNumber("");
      onConnectionChange();
    } catch (error: any) {
      console.error('Error connecting WhatsApp:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);

    try {
      // Remove whatsapp from all phone numbers
      const { data: phones } = await supabase
        .from('clinic_phone_numbers')
        .select('id, channels')
        .eq('clinic_id', clinicId);

      if (phones) {
        for (const phone of phones) {
          const channels = (phone.channels || []).filter((c: string) => c !== 'whatsapp');
          
          await supabase
            .from('clinic_phone_numbers')
            .update({
              channels,
              updated_at: new Date().toISOString(),
            })
            .eq('id', phone.id);
        }
      }

      toast({
        title: "Success",
        description: "WhatsApp disconnected successfully",
      });

      onConnectionChange();
    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect WhatsApp",
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
          <MessageCircle className="h-5 w-5 text-green-500" />
          <CardTitle>WhatsApp Business</CardTitle>
          {isConnected && (
            <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
          )}
        </div>
        <CardDescription>
          Connect your WhatsApp Business account via Vonage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">WhatsApp Business Phone Number</Label>
              <Input
                id="whatsapp-phone"
                type="tel"
                placeholder="+46701234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter the phone number registered with WhatsApp Business and connected to Vonage
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect WhatsApp"}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                WhatsApp is connected and active
              </span>
            </div>

            <Button 
              onClick={handleDisconnect} 
              disabled={isConnecting}
              variant="destructive"
              className="w-full"
            >
              {isConnecting ? "Disconnecting..." : "Disconnect WhatsApp"}
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Vonage Setup Required:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create a Vonage account at dashboard.nexmo.com</li>
                <li>Set up WhatsApp Business API</li>
                <li>Configure webhook URL in Vonage dashboard</li>
                <li>Make sure VONAGE_API_KEY and VONAGE_API_SECRET are set</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
