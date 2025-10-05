import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Building2, Globe as GlobeIcon, Mail, ChevronDown, Lock, Unlock } from "lucide-react";
import { LocationManager } from "./LocationManager";
import { PhoneNumbers } from "./PhoneNumbers";


interface ClinicInfoProps {
  clinicId?: string;
  onSaved?: (clinicId: string) => void;
  onNavigateToTools?: () => void;
}

export const ClinicInfo = ({ clinicId, onSaved, onNavigateToTools }: ClinicInfoProps) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!clinicId); // Collapsed if editing existing clinic
  const [isLocked, setIsLocked] = useState(!!clinicId); // Locked if editing existing clinic
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    website: "",
    admin_email: "",
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
      toast.error("Failed to load business data");
      return;
    }

    if (data) {
      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        website: data.website || "",
        admin_email: data.admin_email || "",
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
        toast.success("Business information updated!");
      } else {
        // Create new clinic (trigger automatically adds user as owner)
        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .insert(formData)
          .select()
          .single();

        if (clinicError) throw clinicError;

        toast.success("Business created successfully!");
        setIsLocked(true); // Lock after creation
        setIsOpen(false); // Collapse after creation
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
    <div className="space-y-6">
      {/* Clinic Profile Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Business Information</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isLocked && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
              <CardDescription>
                {isLocked ? "Main information about your business (click to view)" : "Main information about your business organization"}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {isLocked && clinicId && (
                <div className="mb-4 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Business information is locked to prevent accidental changes
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLocked(false)}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock to Edit
                  </Button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={generateSlug}
                    required
                    disabled={isLocked}
                    placeholder="Main Street Health"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    disabled={isLocked}
                    placeholder="main-street-health"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for your business's unique URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <GlobeIcon className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={isLocked}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Main Admin Email
                  </Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    disabled={isLocked}
                    placeholder="admin@clinic.com"
                  />
                </div>

                {!isLocked && (
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Saving..." : clinicId ? "Update Information" : "Create Clinic"}
                  </Button>
                )}
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Locations Section */}
      {clinicId && <LocationManager clinicId={clinicId} onNavigateToTools={onNavigateToTools} />}

      {/* Phone & SMS Section */}
      {clinicId && <PhoneNumbers clinicId={clinicId} />}
    </div>
  );
};