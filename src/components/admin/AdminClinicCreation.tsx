import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Building2, User, Mail, Phone, MapPin, Sparkles } from "lucide-react";

const CLINIC_TYPES = [
  { value: "medical", label: "Medical Clinic" },
  { value: "dental", label: "Dental Clinic" },
  { value: "veterinary", label: "Veterinary Clinic" },
  { value: "therapy", label: "Therapy/Counseling" },
  { value: "beauty", label: "Beauty/Spa" },
  { value: "other", label: "Other" },
];

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (British Male)" },
  { value: "onyx", label: "Onyx (Deep Male)" },
  { value: "nova", label: "Nova (Female)" },
  { value: "shimmer", label: "Shimmer (Soft Female)" },
];

const AdminClinicCreation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    clinicType: "medical",
    aiMode: "autopilot",
    assistantPrompt: "",
    assistantVoice: "alloy",
    clientEmail: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get admin record
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminData) throw new Error("Not authorized as admin");

      // Create clinic with pending_setup status
      // Generate slug from clinic name
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert([{
          name: formData.name,
          slug: slug,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          clinic_type: formData.clinicType,
          assistant_prompt: formData.assistantPrompt,
          assistant_voice: formData.assistantVoice,
          admin_email: formData.clientEmail,
          status: 'pending_setup',
          prepared_by_admin_id: adminData.id,
        }])
        .select()
        .single();

      if (clinicError) throw clinicError;
      const clinic = clinicData;

      // Create default location
      const { error: locationError } = await supabase
        .from('clinic_locations')
        .insert({
          clinic_id: clinic.id,
          name: `${formData.name} - Main Location`,
          address: formData.address,
          phone: formData.phone,
          admin_email: formData.clientEmail,
        });

      if (locationError) throw locationError;

      toast.success("Clinic created successfully! Status: Pending Setup");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        clinicType: "medical",
        aiMode: "autopilot",
        assistantPrompt: "",
        assistantVoice: "alloy",
        clientEmail: "",
      });

    } catch (error) {
      console.error('Error creating clinic:', error);
      toast.error('Failed to create clinic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Clinic
          </CardTitle>
          <CardDescription>
            Pre-configure a clinic for a new client. You can connect their channels during the onboarding call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Clinic Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Stockholm Dental Care"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicType">Clinic Type *</Label>
              <Select
                value={formData.clinicType}
                onValueChange={(value) => setFormData({ ...formData, clinicType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLINIC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Clinic Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@clinic.se"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Clinic Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+46 xxx xxx xxx"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  className="pl-10"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Postal Code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Contact Email *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientEmail"
                  type="email"
                  required
                  className="pl-10"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="owner@clinic.se"
                />
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant Configuration
            </h3>

            <div className="space-y-2">
              <Label>AI Mode</Label>
              <RadioGroup
                value={formData.aiMode}
                onValueChange={(value) => setFormData({ ...formData, aiMode: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copilot" id="copilot" />
                  <Label htmlFor="copilot" className="font-normal cursor-pointer">
                    Co-Pilot - AI drafts responses, staff approves before sending
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="autopilot" id="autopilot" />
                  <Label htmlFor="autopilot" className="font-normal cursor-pointer">
                    Autopilot - AI sends responses automatically
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistantPrompt">Custom AI System Prompt</Label>
              <Textarea
                id="assistantPrompt"
                value={formData.assistantPrompt}
                onChange={(e) => setFormData({ ...formData, assistantPrompt: e.target.value })}
                placeholder="Enter custom instructions for the AI assistant based on your discovery call..."
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                Pre-write this based on your discovery call with the client
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice">AI Voice (for phone calls)</Label>
              <Select
                value={formData.assistantVoice}
                onValueChange={(value) => setFormData({ ...formData, assistantVoice: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Clinic (Pending Setup)"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            After creating, you can connect channels with the client during your onboarding call
          </p>
        </CardContent>
      </Card>
    </form>
  );
};

export default AdminClinicCreation;
