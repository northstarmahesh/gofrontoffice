import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface OnboardingBasicInfoProps {
  onComplete: (clinicId: string) => void;
}

export const OnboardingBasicInfo = ({ onComplete }: OnboardingBasicInfoProps) => {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    address: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      // Pre-fill email from user's email
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create new clinic (trigger automatically adds user as owner)
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .insert(formData)
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create default location
      const { error: locationError } = await supabase
        .from("clinic_locations")
        .insert({
          clinic_id: clinic.id,
          name: "Main Location",
          address: formData.address,
          admin_email: formData.email,
        });

      if (locationError) console.error("Error creating location:", locationError);

      toast.success("Clinic profile created!");
      onComplete(clinic.id);
    } catch (error: any) {
      console.error("Error creating clinic:", error);
      toast.error(error.message || "Failed to create clinic");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, slug });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Clinic Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={generateSlug}
            required
            placeholder="Main Office, Downtown Branch, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Start typing an address..."
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Full address helps patients find your clinic
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Admin Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="admin@example.com"
          />
          <p className="text-xs text-muted-foreground">
            If email doesn't exist, you'll be prompted to create a new user. You can change this later in settings.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>

        {/* Hidden slug field - auto-generated */}
        <input type="hidden" value={formData.slug} />
      </div>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Creating..." : "Continue"}
      </Button>
    </form>
  );
};
