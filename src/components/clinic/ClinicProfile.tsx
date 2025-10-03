import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Upload } from "lucide-react";

interface ClinicProfileProps {
  clinicId?: string;
  onSaved?: (clinicId: string) => void;
}

export const ClinicProfile = ({ clinicId, onSaved }: ClinicProfileProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (clinicId) {
      loadClinicData();
    }
  }, [clinicId]);

  const loadClinicData = async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .single();

    if (error) {
      toast.error("Failed to load clinic data");
      return;
    }

    if (data) {
      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        address: data.address || "",
        timezone: data.timezone || "America/New_York",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (clinicId) {
        // Update existing clinic
        const { error } = await supabase
          .from("clinics")
          .update(formData)
          .eq("id", clinicId);

        if (error) throw error;
        toast.success("Clinic profile updated!");
      } else {
        // Create new clinic (trigger automatically adds user as owner)
        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .insert(formData)
          .select()
          .single();

        if (clinicError) throw clinicError;

        toast.success("Clinic created successfully!");
        if (onSaved) onSaved(clinic.id);
      }
    } catch (error: any) {
      console.error("Error saving clinic:", error);
      toast.error(error.message || "Failed to save clinic");
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Clinic Profile</CardTitle>
        </div>
        <CardDescription>
          Basic information about your clinic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Clinic Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={generateSlug}
              required
              placeholder="Main Street Health Clinic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              placeholder="main-street-health"
            />
            <p className="text-xs text-muted-foreground">
              Used for your clinic's unique URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.yourclinic.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State 12345"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : clinicId ? "Update Profile" : "Create Clinic"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
