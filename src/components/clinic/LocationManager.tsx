import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Edit, Search, Phone, MessageSquare, Instagram, MessageCircle } from "lucide-react";
import { CreateUserDialog } from "./CreateUserDialog";
import { PhoneVerificationDialog } from "./PhoneVerificationDialog";
import { Badge } from "@/components/ui/badge";

interface Location {
  id: string;
  name: string;
  address: string;
  admin_email: string;
  instagram_handle?: string;
  instagram_connected?: boolean;
  facebook_page_id?: string;
  facebook_connected?: boolean;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  channels: string[];
  is_active: boolean;
  is_verified: boolean;
}

interface LocationManagerProps {
  clinicId: string;
  onUpdate?: () => void;
  onNavigateToTools?: () => void;
}

export const LocationManager = ({ clinicId, onUpdate, onNavigateToTools }: LocationManagerProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationPhoneNumbers, setLocationPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    admin_email: "",
    instagram_handle: "",
    facebook_page_id: "",
    instagram_connected: false,
    facebook_connected: false,
  });

  const [phoneNumberSetup, setPhoneNumberSetup] = useState({
    enabled: false,
    number: "",
    channels: ["sms"] as string[],
  });
  
  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLocked, setAddressLocked] = useState(false);

  // User creation dialog state
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState<{id: string, number: string} | null>(null);

  useEffect(() => {
    loadLocations();
  }, [clinicId]);

  // Debounced address search
  useEffect(() => {
    if (!addressQuery || addressLocked) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            addressQuery
          )}&limit=5`
        );
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (error) {
        console.error("Address search error:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addressQuery, addressLocked]);

  const loadLocations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_locations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load locations");
      console.error(error);
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  };

  const handleAddressSelect = (suggestion: any) => {
    const fullAddress = suggestion.display_name;
    setFormData({ ...formData, address: fullAddress });
    setAddressQuery(fullAddress);
    setAddressLocked(true);
    setShowSuggestions(false);
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Error checking email:", error);
      return false;
    }

    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if admin email exists
    if (formData.admin_email) {
      const emailExists = await checkEmailExists(formData.admin_email);
      if (!emailExists) {
        setPendingEmail(formData.admin_email);
        setCreateUserDialogOpen(true);
        return;
      }
    }

    await saveLocation();
  };

  const saveLocation = async () => {
    try {
      let locationId = editingLocation?.id;

      if (editingLocation) {
        const { error } = await supabase
          .from("clinic_locations")
          .update(formData)
          .eq("id", editingLocation.id);

        if (error) throw error;
        toast.success("Location updated!");
      } else {
        const { data, error } = await supabase
          .from("clinic_locations")
          .insert([{ ...formData, clinic_id: clinicId }])
          .select()
          .single();

        if (error) throw error;
        locationId = data.id;
        toast.success("Location added!");
      }

      // Add phone number if enabled
      if (phoneNumberSetup.enabled && phoneNumberSetup.number && locationId) {
        // Check if WhatsApp is selected and already exists for this location
        if (phoneNumberSetup.channels.includes("whatsapp")) {
          const { data: existing } = await supabase
            .from("clinic_phone_numbers")
            .select("id")
            .eq("location_id", locationId)
            .contains("channels", ["whatsapp"])
            .maybeSingle();

          if (existing) {
            toast.error("This location already has a WhatsApp number.");
            return;
          }
        }

        const { data: phoneData, error: phoneError } = await supabase
          .from("clinic_phone_numbers")
          .insert({
            clinic_id: clinicId,
            location_id: locationId,
            phone_number: phoneNumberSetup.number,
            channels: phoneNumberSetup.channels,
            is_active: true,
          })
          .select()
          .single();

        if (phoneError) {
          console.error("Error adding phone number:", phoneError);
          toast.error("Location saved but failed to add phone number");
        } else {
          toast.success("Phone number added! Please verify it now.");
          setDialogOpen(false);
          resetForm();
          loadLocations();
          // Trigger verification
          setPendingPhoneVerification({
            id: phoneData.id,
            number: phoneNumberSetup.number
          });
          setVerificationDialogOpen(true);
          return; // Don't run the normal cleanup yet
        }
      }

      setDialogOpen(false);
      resetForm();
      loadLocations();
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error(error.message || "Failed to save location");
    }
  };

  const toggleChannel = (channel: string) => {
    setPhoneNumberSetup(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      admin_email: location.admin_email,
      instagram_handle: location.instagram_handle || "",
      facebook_page_id: location.facebook_page_id || "",
      instagram_connected: location.instagram_connected || false,
      facebook_connected: location.facebook_connected || false,
    });
    setAddressQuery(location.address);
    setAddressLocked(true);
    loadLocationPhoneNumbers(location.id);
    setDialogOpen(true);
  };

  const loadLocationPhoneNumbers = async (locationId: string) => {
    const { data, error } = await supabase
      .from("clinic_phone_numbers")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading phone numbers:", error);
    } else {
      setLocationPhoneNumbers(data || []);
    }
  };

  const handleDeletePhoneNumber = async (phoneId: string) => {
    if (!confirm("Are you sure you want to remove this phone number?")) return;

    try {
      const { error } = await supabase
        .from("clinic_phone_numbers")
        .delete()
        .eq("id", phoneId);

      if (error) throw error;
      toast.success("Phone number removed!");
      if (editingLocation) {
        loadLocationPhoneNumbers(editingLocation.id);
      }
    } catch (error: any) {
      console.error("Error deleting phone number:", error);
      toast.error("Failed to remove phone number");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from("clinic_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Location deleted!");
      loadLocations();
    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      address: "", 
      admin_email: "", 
      instagram_handle: "", 
      facebook_page_id: "",
      instagram_connected: false,
      facebook_connected: false,
    });
    setPhoneNumberSetup({ enabled: false, number: "", channels: ["sms"] });
    setAddressQuery("");
    setAddressLocked(false);
    setEditingLocation(null);
    setLocationPhoneNumbers([]);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleUserCreated = async () => {
    // After user is created, save the location
    await saveLocation();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Clinic Locations</CardTitle>
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLocation ? "Edit Location" : "Add New Location"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        1
                      </div>
                      <h3 className="text-base font-semibold">Basic Information</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Location Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Main Office, Downtown Branch, etc."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="address"
                            value={addressLocked ? formData.address : addressQuery}
                            onChange={(e) => {
                              setAddressQuery(e.target.value);
                              if (!addressLocked) {
                                setFormData({ ...formData, address: e.target.value });
                              }
                            }}
                            onFocus={() => {
                              if (!addressLocked && addressQuery) {
                                setShowSuggestions(true);
                              }
                            }}
                            placeholder="Start typing an address..."
                            disabled={addressLocked}
                            className={`pl-9 ${addressLocked ? "opacity-75" : ""}`}
                          />
                        </div>
                        {showSuggestions && addressSuggestions.length > 0 && !addressLocked && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                            {addressSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleAddressSelect(suggestion)}
                                className="w-full px-4 py-2 text-left hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                              >
                                {suggestion.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {addressLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddressLocked(false);
                            setAddressQuery(formData.address);
                          }}
                          className="h-auto py-1 px-2 text-xs"
                        >
                          Unlock to edit
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_email">Location Admin Email</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) =>
                          setFormData({ ...formData, admin_email: e.target.value })
                        }
                        placeholder="admin@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        If email doesn't exist, you'll be prompted to create a new user
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 2: Phone Number & Verification */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        2
                      </div>
                      <h3 className="text-base font-semibold">Phone Number & Verification</h3>
                    </div>
                    
                    {/* Existing Phone Numbers for this location (only when editing) */}
                    {editingLocation && locationPhoneNumbers.length > 0 && (
                      <div className="space-y-3 mb-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Connected Phone Numbers
                        </h4>
                        <div className="space-y-2">
                          {locationPhoneNumbers.map((phone) => (
                            <div
                              key={phone.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium">{phone.phone_number}</p>
                                  {phone.is_verified && (
                                    <Badge className="bg-success/10 text-success text-xs">
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1.5">
                                  {phone.channels?.map((channel) => (
                                    <Badge key={channel} variant="outline" className="text-xs">
                                      {channel === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                                      {channel === "voice" && <Phone className="h-3 w-3 mr-1" />}
                                      {channel === "whatsapp" && <MessageSquare className="h-3 w-3 mr-1" />}
                                      <span className="capitalize">{channel}</span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePhoneNumber(phone.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Card className="bg-muted/30 border-2">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">
                            {editingLocation ? "Add Another Number" : "Add Phone Number"}
                          </h4>
                          <Checkbox
                            id="enable-phone"
                            checked={phoneNumberSetup.enabled}
                            onCheckedChange={(checked) =>
                              setPhoneNumberSetup({ ...phoneNumberSetup, enabled: !!checked })
                            }
                          />
                        </div>

                        {phoneNumberSetup.enabled && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="phone-number">Phone Number *</Label>
                              <Input
                                id="phone-number"
                                value={phoneNumberSetup.number}
                                onChange={(e) =>
                                  setPhoneNumberSetup({ ...phoneNumberSetup, number: e.target.value })
                                }
                                placeholder="+14243298358"
                                required={phoneNumberSetup.enabled}
                              />
                              <p className="text-xs text-muted-foreground">
                                Include country code (e.g., +1 for US). You'll be asked to verify after saving.
                              </p>
                            </div>

                            <div className="space-y-3">
                              <Label>Channels *</Label>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="channel-sms"
                                    checked={phoneNumberSetup.channels.includes("sms")}
                                    onCheckedChange={() => toggleChannel("sms")}
                                  />
                                  <label htmlFor="channel-sms" className="text-sm cursor-pointer flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    SMS
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="channel-voice"
                                    checked={phoneNumberSetup.channels.includes("voice")}
                                    onCheckedChange={() => toggleChannel("voice")}
                                  />
                                  <label htmlFor="channel-voice" className="text-sm cursor-pointer flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    Voice
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="channel-whatsapp"
                                    checked={phoneNumberSetup.channels.includes("whatsapp")}
                                    onCheckedChange={() => toggleChannel("whatsapp")}
                                  />
                                  <label htmlFor="channel-whatsapp" className="text-sm cursor-pointer flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    WhatsApp
                                  </label>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Note: Only one WhatsApp number per location
                              </p>
                              {phoneNumberSetup.channels.includes("whatsapp") && (
                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md mt-2">
                                  <p className="text-xs text-muted-foreground">
                                    <strong className="text-blue-600">WhatsApp Business API:</strong> Requires additional Meta Business Manager setup after phone verification (1-2 business days).
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Step 3: Social Media Accounts */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        3
                      </div>
                      <h3 className="text-base font-semibold">Social Media Accounts</h3>
                    </div>
                    
                    <Card className="bg-muted/30 border-2">
                      <CardContent className="pt-6 space-y-4">
                        {/* Instagram */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Instagram className="h-5 w-5 text-pink-600" />
                              <div>
                                <p className="text-sm font-medium">Instagram DM</p>
                                {formData.instagram_connected ? (
                                  <p className="text-xs text-muted-foreground">
                                    {formData.instagram_handle || "Connected"}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Not connected
                                  </p>
                                )}
                              </div>
                            </div>
                            {formData.instagram_connected ? (
                              <Badge variant="default" className="bg-success/10 text-success">
                                Connected
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.info("Instagram OAuth", {
                                    description: "Redirecting to Instagram authentication..."
                                  });
                                  // In real implementation, this would open OAuth flow
                                }}
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Facebook Messenger */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MessageCircle className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium">Facebook Messenger</p>
                                {formData.facebook_connected ? (
                                  <p className="text-xs text-muted-foreground">Connected</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Not connected</p>
                                )}
                              </div>
                            </div>
                            {formData.facebook_connected ? (
                              <Badge variant="default" className="bg-success/10 text-success">
                                Connected
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.info("Facebook OAuth", {
                                    description: "Redirecting to Facebook authentication..."
                                  });
                                  // In real implementation, this would open OAuth flow
                                }}
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 text-xs text-muted-foreground bg-blue-500/5 p-3 rounded-md border border-blue-500/10">
                          <p><strong className="text-blue-600">Note:</strong> Social media connections require OAuth authentication through Meta Business Suite. You'll be redirected to authorize access.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button type="submit" className="w-full">
                    {editingLocation ? "Update Location" : "Add Location"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Manage multiple locations for your clinic
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : locations.length === 0 ? (
            <p className="text-muted-foreground">
              No locations yet. Add your first one!
            </p>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{location.name}</h3>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {location.address}
                      </p>
                    )}
                    {location.admin_email && (
                      <p className="text-sm text-muted-foreground">
                        ✉️ {location.admin_email}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {location.instagram_connected && (
                        <Badge variant="outline" className="text-xs">
                          <Instagram className="h-3 w-3 mr-1" />
                          Instagram
                        </Badge>
                      )}
                      {location.facebook_connected && (
                        <Badge variant="outline" className="text-xs">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Messenger
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
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

      <CreateUserDialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
        email={pendingEmail}
        onUserCreated={handleUserCreated}
      />

      {pendingPhoneVerification && (
        <PhoneVerificationDialog
          open={verificationDialogOpen}
          onOpenChange={setVerificationDialogOpen}
          phoneNumberId={pendingPhoneVerification.id}
          phoneNumber={pendingPhoneVerification.number}
          onVerified={() => {
            loadLocations();
            setPendingPhoneVerification(null);
          }}
        />
      )}
    </>
  );
};
