import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Plus, Trash2, MessageSquare, ShieldCheck, ShieldX } from "lucide-react";
import { PhoneVerificationDialog } from "./PhoneVerificationDialog";

interface PhoneNumbersProps {
  clinicId: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  channels: string[];
  is_active: boolean;
  is_verified: boolean;
  location_id: string;
}

interface Location {
  id: string;
  name: string;
}

export const PhoneNumbers = ({ clinicId }: PhoneNumbersProps) => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [selectedPhoneForVerification, setSelectedPhoneForVerification] = useState<PhoneNumber | null>(null);
  const [formData, setFormData] = useState({
    phone_number: "",
    location_id: "",
    channels: ["sms"] as string[],
  });

  useEffect(() => {
    loadLocations();
    loadPhoneNumbers();
  }, [clinicId]);

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("clinic_locations")
      .select("id, name")
      .eq("clinic_id", clinicId);

    if (error) {
      console.error("Error loading locations:", error);
      toast.error("Failed to load locations");
    } else {
      setLocations(data || []);
    }
  };

  const loadPhoneNumbers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_phone_numbers")
      .select(`
        *,
        clinic_locations!inner(name)
      `)
      .eq("clinic_locations.clinic_id", clinicId);

    if (error) {
      console.error("Error loading phone numbers:", error);
      toast.error("Failed to load phone numbers");
    } else {
      setPhoneNumbers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location_id) {
      toast.error("Please select a location");
      return;
    }

    if (formData.channels.length === 0) {
      toast.error("Please select at least one channel");
      return;
    }

    // Check if WhatsApp is selected and already exists for this location
    if (formData.channels.includes("whatsapp")) {
      const { data: existing } = await supabase
        .from("clinic_phone_numbers")
        .select("id")
        .eq("location_id", formData.location_id)
        .contains("channels", ["whatsapp"])
        .maybeSingle();

      if (existing) {
        toast.error("This location already has a WhatsApp number. Only one WhatsApp number is allowed per location.");
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("clinic_phone_numbers")
        .insert({
          clinic_id: clinicId,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Immediately prompt for verification
      toast.success("Phone number added! Please verify it now.");
      setDialogOpen(false);
      setSelectedPhoneForVerification(data);
      setVerificationDialogOpen(true);
      setFormData({ phone_number: "", location_id: "", channels: ["sms"] });
      loadPhoneNumbers();
    } catch (error: any) {
      console.error("Error adding phone number:", error);
      toast.error(error.message || "Failed to add phone number");
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleVerify = (phone: PhoneNumber) => {
    setSelectedPhoneForVerification(phone);
    setVerificationDialogOpen(true);
  };

  const handleVerified = () => {
    loadPhoneNumbers();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("clinic_phone_numbers")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update phone number");
    } else {
      toast.success(isActive ? "Phone number activated" : "Phone number deactivated");
      loadPhoneNumbers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;

    const { error } = await supabase
      .from("clinic_phone_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete phone number");
    } else {
      toast.success("Phone number deleted!");
      loadPhoneNumbers();
    }
  };

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Buy Phone Numbers</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Buy Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buy Phone Number</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+14243298358"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Channels *</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sms"
                        checked={formData.channels.includes("sms")}
                        onCheckedChange={() => toggleChannel("sms")}
                      />
                      <label htmlFor="sms" className="text-sm font-medium cursor-pointer">
                        SMS
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="voice"
                        checked={formData.channels.includes("voice")}
                        onCheckedChange={() => toggleChannel("voice")}
                      />
                      <label htmlFor="voice" className="text-sm font-medium cursor-pointer">
                        Voice
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="whatsapp"
                        checked={formData.channels.includes("whatsapp")}
                        onCheckedChange={() => toggleChannel("whatsapp")}
                      />
                      <label htmlFor="whatsapp" className="text-sm font-medium cursor-pointer">
                        WhatsApp
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: Only one WhatsApp number per location
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  Buy Phone Number
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Purchase phone numbers for your clinic locations. Add new numbers or edit existing ones configured during location setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : phoneNumbers.length === 0 ? (
          <p className="text-muted-foreground">No phone numbers configured yet.</p>
        ) : (
          <div className="space-y-3">
            {phoneNumbers.map((phone) => (
              <div
                key={phone.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Switch
                    checked={phone.is_active}
                    onCheckedChange={(checked) => handleToggle(phone.id, checked)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {phone.is_verified ? (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                          <ShieldX className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {(phone as any).clinic_locations?.name || 'Unknown Location'}
                    </p>
                    <div className="flex gap-2">
                      {phone.channels?.map((channel) => (
                        <span
                          key={channel}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted"
                        >
                          {channel === "whatsapp" && <MessageSquare className="h-3 w-3" />}
                          {channel === "voice" && <Phone className="h-3 w-3" />}
                          <span className="capitalize">{channel}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!phone.is_verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(phone)}
                    >
                      Verify
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(phone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {selectedPhoneForVerification && (
      <PhoneVerificationDialog
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        phoneNumberId={selectedPhoneForVerification.id}
        phoneNumber={selectedPhoneForVerification.phone_number}
        onVerified={handleVerified}
      />
    )}
    </>
  );
};
