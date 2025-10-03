import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Edit, Search } from "lucide-react";
import { CreateUserDialog } from "./CreateUserDialog";

interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  admin_email: string;
}

interface LocationManagerProps {
  clinicId: string;
}

export const LocationManager = ({ clinicId }: LocationManagerProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    admin_email: "",
  });
  
  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLocked, setAddressLocked] = useState(false);

  // User creation dialog state
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

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
      if (editingLocation) {
        const { error } = await supabase
          .from("clinic_locations")
          .update(formData)
          .eq("id", editingLocation.id);

        if (error) throw error;
        toast.success("Location updated!");
      } else {
        const { error } = await supabase
          .from("clinic_locations")
          .insert([{ ...formData, clinic_id: clinicId }]);

        if (error) throw error;
        toast.success("Location added!");
      }

      setDialogOpen(false);
      resetForm();
      loadLocations();
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error(error.message || "Failed to save location");
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      phone: location.phone,
      admin_email: location.admin_email,
    });
    setAddressQuery(location.address);
    setAddressLocked(true);
    setDialogOpen(true);
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
    setFormData({ name: "", address: "", phone: "", admin_email: "" });
    setAddressQuery("");
    setAddressLocked(false);
    setEditingLocation(null);
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
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
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
                    {location.phone && (
                      <p className="text-sm text-muted-foreground">
                        📞 {location.phone}
                      </p>
                    )}
                    {location.admin_email && (
                      <p className="text-sm text-muted-foreground">
                        ✉️ {location.admin_email}
                      </p>
                    )}
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
    </>
  );
};
