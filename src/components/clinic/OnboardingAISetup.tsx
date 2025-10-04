import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bot, User, Volume2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OnboardingAISetupProps {
  clinicId: string;
  clinicType: string;
  clinicName: string;
  hasPhoneConnection: boolean;
  onComplete: () => void;
}

const CLINIC_PROMPTS = {
  dental: `You are a professional front office assistant for {clinicName}, a dental clinic. You help patients with:
- Scheduling routine cleanings, checkups, and dental procedures
- Answering questions about dental services (cleanings, fillings, crowns, whitening, orthodontics)
- Insurance verification and billing inquiries
- Post-procedure care instructions
- Emergency dental situations

Always be warm, professional, and reassuring. Emphasize our commitment to comfortable, pain-free dentistry.`,

  medical: `You are a professional front office assistant for {clinicName}, a medical clinic. You help patients with:
- Scheduling appointments for consultations, checkups, and treatments
- Answering questions about our medical services and specialties
- Insurance verification and coverage questions
- Prescription refills and lab results
- General health inquiries and triage

Maintain patient confidentiality, be empathetic, and provide clear information about our services.`,

  veterinary: `You are a friendly front office assistant for {clinicName}, a veterinary clinic. You help pet owners with:
- Scheduling appointments for wellness exams, vaccinations, and treatments
- Answering questions about pet care, services, and procedures
- Emergency pet situations and triage
- Medication refills and dietary recommendations
- Pricing for services and payment options

Be warm, compassionate, and show genuine care for both pets and their owners.`,

  therapy: `You are a compassionate front office assistant for {clinicName}, a therapy practice. You help clients with:
- Scheduling therapy sessions and initial consultations
- Answering questions about therapy approaches and specialties
- Insurance coverage and billing inquiries
- Cancellation policies and rescheduling
- Crisis resources and emergency contacts

Be understanding, non-judgmental, and maintain strict confidentiality. Create a safe, welcoming environment.`,

  default: `You are a professional front office assistant for {clinicName}. You help customers with:
- Scheduling appointments and consultations
- Answering questions about services and procedures
- Billing and payment inquiries
- General information about our practice
- Directing urgent matters appropriately

Always be professional, helpful, and clear in your communication.`
};

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy - Balanced and professional" },
  { value: "echo", label: "Echo - Warm and friendly" },
  { value: "fable", label: "Fable - Clear and articulate" },
  { value: "onyx", label: "Onyx - Deep and authoritative" },
  { value: "nova", label: "Nova - Bright and energetic" },
  { value: "shimmer", label: "Shimmer - Soft and soothing" },
];

export const OnboardingAISetup = ({ 
  clinicId, 
  clinicType, 
  clinicName,
  hasPhoneConnection,
  onComplete 
}: OnboardingAISetupProps) => {
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"autopilot" | "copilot">("copilot");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    loadLocationAndSettings();
  }, [clinicId]);

  useEffect(() => {
    // Pre-fill prompt based on clinic type
    const template = CLINIC_PROMPTS[clinicType as keyof typeof CLINIC_PROMPTS] || CLINIC_PROMPTS.default;
    const filledTemplate = template.replace('{clinicName}', clinicName);
    setAssistantPrompt(filledTemplate);
  }, [clinicType, clinicName]);

  const loadLocationAndSettings = async () => {
    try {
      // Get location
      const { data: locations } = await supabase
        .from("clinic_locations")
        .select("id")
        .eq("clinic_id", clinicId)
        .limit(1);

      if (locations && locations.length > 0) {
        setLocationId(locations[0].id);
      }

      // Load existing settings if any
      const { data: existingSettings } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("location_id", locations?.[0]?.id)
        .maybeSingle();

      if (existingSettings) {
        setAiMode(existingSettings.auto_pilot_enabled ? "autopilot" : "copilot");
      }

      // Load clinic settings
      const { data: clinic } = await supabase
        .from("clinics")
        .select("assistant_prompt, assistant_voice")
        .eq("id", clinicId)
        .single();

      if (clinic?.assistant_prompt) {
        setAssistantPrompt(clinic.assistant_prompt);
      }
      if (clinic?.assistant_voice) {
        setSelectedVoice(clinic.assistant_voice);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    if (!locationId) {
      toast.error("No location found");
      return;
    }

    setLoading(true);
    try {
      // Save clinic-level settings
      const { error: clinicError } = await supabase
        .from("clinics")
        .update({
          assistant_prompt: assistantPrompt,
          assistant_voice: selectedVoice,
        })
        .eq("id", clinicId);

      if (clinicError) throw clinicError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save assistant settings
      const { error: settingsError } = await supabase
        .from("assistant_settings")
        .upsert({
          location_id: locationId,
          user_id: user.id,
          auto_pilot_enabled: aiMode === "autopilot",
          phone_mode: aiMode === "autopilot" ? "on" : "copilot",
          sms_enabled: true,
          whatsapp_enabled: true,
          instagram_enabled: false,
          messenger_enabled: false,
        }, {
          onConflict: "location_id,user_id"
        });

      if (settingsError) throw settingsError;

      toast.success("AI assistant configured!");
      onComplete();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose Your AI Mode</CardTitle>
          <CardDescription>
            How would you like your AI assistant to handle communications?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={aiMode} onValueChange={(value) => setAiMode(value as "autopilot" | "copilot")}>
            <div className="space-y-3">
              <Card className={`cursor-pointer transition-all ${aiMode === "copilot" ? "border-primary border-2" : "border"}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="copilot" id="copilot" className="mt-1" />
                    <label htmlFor="copilot" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Co-Pilot Mode</h3>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI drafts responses for you to review and approve before sending. You stay in control.
                      </p>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${aiMode === "autopilot" ? "border-primary border-2" : "border"}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="autopilot" id="autopilot" className="mt-1" />
                    <label htmlFor="autopilot" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-5 w-5 text-secondary" />
                        <h3 className="font-semibold">Autopilot Mode</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI handles communications automatically. It responds instantly while you focus on patient care.
                      </p>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Assistant Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assistant Instructions</CardTitle>
          <CardDescription>
            Customize how your AI assistant should behave and respond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prompt">System Prompt</Label>
            <Textarea
              id="prompt"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              rows={8}
              className="text-sm"
              placeholder="Enter instructions for your AI assistant..."
            />
            <p className="text-xs text-muted-foreground">
              This prompt has been pre-filled based on your clinic type. Feel free to customize it!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Selection - Only show if phone is connected AND autopilot mode */}
      {hasPhoneConnection && aiMode === "autopilot" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Selection for Phone Calls
            </CardTitle>
            <CardDescription>
              Choose the voice your AI will use when speaking with callers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice">AI Voice</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger id="voice">
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

            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Want a custom voice?</p>
                    <p className="text-xs text-muted-foreground">
                      We can clone your voice or create a custom voice for your clinic. Contact our support team to get started.
                    </p>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                      <a href="mailto:support@frontoffice.com">Contact Support</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={loading} className="flex-1" size="lg">
          {loading ? "Saving..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
};
