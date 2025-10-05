import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, MessageSquare, Mail, Instagram, MessageCircle, CheckCircle2, ChevronDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneVerificationDialog } from "./PhoneVerificationDialog";

interface OnboardingChannelsProps {
  clinicId: string;
  onChannelsConnected?: (hasMinimumChannels: boolean, hasPhone?: boolean) => void;
}

export const OnboardingChannels = ({ clinicId, onChannelsConnected }: OnboardingChannelsProps) => {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneChannels, setPhoneChannels] = useState<string[]>(["sms"]);
  const [clinicEmail, setClinicEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState<{id: string, number: string} | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState({
    phone: false,
    sms: false,
    email: false,
    instagram: false,
    facebook: false,
  });

  useEffect(() => {
    loadClinicData();
    checkConnections();
  }, [clinicId]);

  useEffect(() => {
    // Count connected channels and check for phone
    const connectedCount = Object.values(connectionStatus).filter(status => status).length;
    const hasPhone = connectionStatus.phone;
    onChannelsConnected?.(connectedCount >= 2, hasPhone);
  }, [connectionStatus]);

  const loadClinicData = async () => {
    try {
      // Get or create location
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("*")
        .eq("clinic_id", clinicId);

      if (locations && locations.length > 0) {
        setLocationId(locations[0].id);
      } else {
        // Create default location
        const { data: newLocation } = await supabase
          .from("clinic_locations")
          .insert({
            clinic_id: clinicId,
            name: "Main Location",
          })
          .select()
          .single();

        if (newLocation) {
          setLocationId(newLocation.id);
        }
      }

      // Load clinic email
      const { data: clinic } = await supabase
        .from("clinics")
        .select("email")
        .eq("id", clinicId)
        .single();

      if (clinic?.email) {
        setClinicEmail(clinic.email);
      }
    } catch (error) {
      console.error("Error loading clinic data:", error);
    }
  };

  const checkConnections = async () => {
    try {
      const { data: phoneData } = await supabase
        .from("clinic_phone_numbers")
        .select("*")
        .eq("clinic_id", clinicId);

      const { data: locationData } = await supabase
        .from("clinic_locations")
        .select("*")
        .eq("clinic_id", clinicId);

      const { data: clinicData } = await supabase
        .from("clinics")
        .select("email")
        .eq("id", clinicId)
        .single();

      const hasPhone = phoneData?.some(p => p.channels?.includes("voice")) || false;
      const hasSms = phoneData?.some(p => p.channels?.includes("sms")) || false;
      const hasInstagram = locationData?.some(l => l.instagram_connected) || false;
      const hasFacebook = locationData?.some(l => l.facebook_connected) || false;

      setConnectionStatus({
        phone: hasPhone,
        sms: hasSms,
        email: !!clinicData?.email,
        instagram: hasInstagram,
        facebook: hasFacebook,
      });
    } catch (error) {
      console.error("Error checking connections:", error);
    }
  };

  const handleAddPhoneNumber = async () => {
    if (!phoneNumber || !locationId) {
      toast.error("Please enter a phone number");
      return;
    }

    if (phoneChannels.length === 0) {
      toast.error("Please select at least one channel (SMS, WhatsApp, or Voice)");
      return;
    }

    setAdding(true);
    try {
      const { data: phoneData, error } = await supabase
        .from("clinic_phone_numbers")
        .insert({
          clinic_id: clinicId,
          location_id: locationId,
          phone_number: phoneNumber,
          channels: phoneChannels,
          is_verified: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Phone number added! Please verify it now.");
      setPhoneNumber("");
      await checkConnections();
      
      // Trigger verification
      setPendingPhoneVerification({
        id: phoneData.id,
        number: phoneData.phone_number
      });
      setVerificationDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to add phone number");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!clinicEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ email: clinicEmail })
        .eq("id", clinicId);

      if (error) throw error;

      toast.success("Email saved!");
      await checkConnections();
    } catch (error: any) {
      toast.error(error.message || "Failed to save email");
    } finally {
      setAdding(false);
    }
  };


  const connectedCount = Object.values(connectionStatus).filter(status => status).length;
  const hasMinimumConnections = connectedCount >= 2;

  return (
    <div className="space-y-4">
      {/* Connection Summary */}
      <Card className={hasMinimumConnections ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">
                {hasMinimumConnections 
                  ? "✅ Perfect! You have enough channels connected" 
                  : `⚠️ Connect at least 2 channels to continue (${connectedCount}/2)`}
              </p>
              <p className="text-xs text-muted-foreground">
                Multiple channels help ensure you never miss a patient message
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone & SMS */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Phone & SMS</CardTitle>
                    <CardDescription>Add a phone number for calls and texting</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(connectionStatus.phone || connectionStatus.sms) && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Use this number for:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={phoneChannels.includes("sms")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPhoneChannels([...phoneChannels, "sms"]);
                        } else {
                          setPhoneChannels(phoneChannels.filter(c => c !== "sms"));
                        }
                      }}
                    />
                    <label htmlFor="sms" className="text-sm font-medium">SMS Text Messages</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whatsapp"
                      checked={phoneChannels.includes("whatsapp")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPhoneChannels([...phoneChannels, "whatsapp"]);
                        } else {
                          setPhoneChannels(phoneChannels.filter(c => c !== "whatsapp"));
                        }
                      }}
                    />
                    <label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="voice"
                      checked={phoneChannels.includes("voice")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPhoneChannels([...phoneChannels, "voice"]);
                        } else {
                          setPhoneChannels(phoneChannels.filter(c => c !== "voice"));
                        }
                      }}
                    />
                    <label htmlFor="voice" className="text-sm font-medium">Voice Calls</label>
                  </div>
                </div>
              </div>

              {phoneChannels.includes("whatsapp") && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-blue-600">WhatsApp Business API Note:</strong> After phone verification, WhatsApp requires additional setup through Meta Business Manager including business verification and number registration. This can take 1-2 business days.
                  </p>
                </div>
              )}

              <Button onClick={handleAddPhoneNumber} disabled={adding} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Phone Number
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Email */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Email</CardTitle>
                    <CardDescription>Your clinic's email address</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connectionStatus.email && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="clinic@example.com"
                  value={clinicEmail}
                  onChange={(e) => setClinicEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveEmail} disabled={adding} className="w-full">
                Save Email
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Social Media */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <Instagram className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Social Media</CardTitle>
                    <CardDescription>Instagram DM and Facebook Messenger</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(connectionStatus.instagram || connectionStatus.facebook) && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-start gap-3">
                  <div className="flex gap-2 mt-1">
                    <Instagram className="h-5 w-5 text-muted-foreground" />
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">
                        OAuth Connection Required
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Social media accounts must be connected through proper OAuth integration in the Tools section. Manual entry of handles or IDs is not supported.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can connect Instagram DM and Facebook Messenger after completing onboarding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Show connected accounts if any */}
              {(connectionStatus.instagram || connectionStatus.facebook) && (
                <div className="space-y-2">
                  {connectionStatus.instagram && (
                    <Card className="bg-success/5 border-success/20">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          <p className="text-sm font-medium flex-1">Instagram DM</p>
                          <Badge variant="default" className="bg-success/10 text-success text-xs">
                            Connected
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {connectionStatus.facebook && (
                    <Card className="bg-success/5 border-success/20">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-medium flex-1">Facebook Messenger</p>
                          <Badge variant="default" className="bg-success/10 text-success text-xs">
                            Connected
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Skip option */}
      <p className="text-center text-sm text-muted-foreground">
        You can always add more channels later in Business Settings
      </p>

      {pendingPhoneVerification && (
        <PhoneVerificationDialog
          open={verificationDialogOpen}
          onOpenChange={setVerificationDialogOpen}
          phoneNumberId={pendingPhoneVerification.id}
          phoneNumber={pendingPhoneVerification.number}
          onVerified={() => {
            checkConnections();
            setPendingPhoneVerification(null);
          }}
        />
      )}
    </div>
  );
};