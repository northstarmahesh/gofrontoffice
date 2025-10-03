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
  onChannelsConnected?: (hasConnection: boolean) => void;
}

export const OnboardingChannels = ({ clinicId, onChannelsConnected }: OnboardingChannelsProps) => {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneChannels, setPhoneChannels] = useState<string[]>(["sms"]);
  const [clinicEmail, setClinicEmail] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
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
    const hasAnyConnection = Object.values(connectionStatus).some(status => status);
    onChannelsConnected?.(hasAnyConnection);
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

  const handleSaveSocials = async () => {
    if (!locationId) {
      toast.error("Location not found");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("clinic_locations")
        .update({
          instagram_handle: instagramHandle || null,
          instagram_connected: !!instagramHandle,
          facebook_page_id: facebookPageId || null,
          facebook_connected: !!facebookPageId,
        })
        .eq("id", locationId);

      if (error) throw error;

      toast.success("Social media connections saved!");
      await checkConnections();
    } catch (error: any) {
      toast.error(error.message || "Failed to save social connections");
    } finally {
      setAdding(false);
    }
  };

  const hasAnyConnection = Object.values(connectionStatus).some(status => status);

  return (
    <div className="space-y-4">
      {/* Connection Summary */}
      <Card className={hasAnyConnection ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {hasAnyConnection 
                ? "✅ Great! You have at least one channel connected" 
                : "⚠️ Connect at least one channel to continue"}
            </p>
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
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  placeholder="@yourhandle"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You'll need to connect this through Facebook's Business Suite
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook Page ID</Label>
                <Input
                  id="facebook"
                  placeholder="123456789"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your Facebook Page settings
                </p>
              </div>

              <Button onClick={handleSaveSocials} disabled={adding} className="w-full">
                Save Social Media
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Skip option */}
      <p className="text-center text-sm text-muted-foreground">
        You can always add more channels later in Clinic Settings
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