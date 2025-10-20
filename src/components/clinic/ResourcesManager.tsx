import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { KnowledgeBase } from "./KnowledgeBase";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ResourcesManagerProps {
  clinicId: string;
}

const AVAILABLE_VOICES = [
  {
    value: "4xkUqaR9MYOJHoaC1Nak",
    label: "Swedish Voice 1",
    description: "Professional female voice"
  },
  {
    value: "hMTrLL2ZiyJiyKrdg2z4",
    label: "Swedish Voice 2",
    description: "Clear male voice"
  },
  {
    value: "RILOU7YmBhvwJGDGjNmP",
    label: "Swedish Voice 3",
    description: "Warm neutral voice"
  }
];

export const ResourcesManager = ({ clinicId }: ResourcesManagerProps) => {
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantVoice, setAssistantVoice] = useState("4xkUqaR9MYOJHoaC1Nak");
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [hasStudioQuality, setHasStudioQuality] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  useEffect(() => {
    loadSettings();
  }, [clinicId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select("assistant_prompt, selected_elevenlabs_voice_id")
        .eq("id", clinicId)
        .single();

      if (error) throw error;

      if (data) {
        setAssistantPrompt(data.assistant_prompt || "");
        setAssistantVoice(data.selected_elevenlabs_voice_id || "4xkUqaR9MYOJHoaC1Nak");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load assistant settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ assistant_prompt: assistantPrompt })
        .eq("id", clinicId);

      if (error) throw error;

      // Trigger agent update
      const { error: updateError } = await supabase.functions.invoke(
        'elevenlabs-agent-update',
        {
          body: {
            clinic_id: clinicId,
            update_type: 'prompt',
            value: assistantPrompt
          }
        }
      );

      if (updateError) {
        console.error("Error updating agent:", updateError);
        toast.error("Instructions saved but failed to update agent");
      } else {
        toast.success("Assistant instructions updated successfully");
      }
    } catch (error) {
      console.error("Error saving instructions:", error);
      toast.error("Failed to save assistant instructions");
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleSaveVoice = async () => {
    setSavingVoice(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ selected_elevenlabs_voice_id: assistantVoice })
        .eq("id", clinicId);

      if (error) throw error;

      // Trigger agent update
      const { error: updateError } = await supabase.functions.invoke(
        'elevenlabs-agent-update',
        {
          body: {
            clinic_id: clinicId,
            update_type: 'voice',
            value: assistantVoice
          }
        }
      );

      if (updateError) {
        console.error("Error updating agent:", updateError);
        toast.error("Voice saved but failed to update agent");
      } else {
        toast.success("Voice updated successfully");
      }
    } catch (error) {
      console.error("Error saving voice:", error);
      toast.error("Failed to save voice selection");
    } finally {
      setSavingVoice(false);
    }
  };

  const handlePlayVoice = (voiceValue: string) => {
    // Preview functionality removed - Eleven Labs voices don't have preview URLs
    toast.info("Voice preview coming soon");
  };

  const handleVoiceUpload = async () => {
    if (!hasStudioQuality || !hasPermission || !voiceFile) {
      toast.error("Please complete all requirements");
      return;
    }

    toast.success("Voice upload request submitted. We'll contact you soon!");
    setVoiceDialogOpen(false);
    setHasStudioQuality(false);
    setHasPermission(false);
    setVoiceFile(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Knowledge Base Section */}
      <KnowledgeBase clinicId={clinicId} />

      {/* Assistant Prompt Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assistant Instructions</CardTitle>
          <CardDescription>
            Customize how your AI assistant responds to patients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Custom Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Enter instructions for your assistant... Example: Always be friendly and professional. When booking appointments, confirm the date and time. Ask about the reason for the visit..."
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These instructions will guide how your assistant interacts with patients
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSavePrompt} disabled={savingPrompt}>
              {savingPrompt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Instructions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Selection</CardTitle>
          <CardDescription>
            Choose the voice for your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={assistantVoice} onValueChange={setAssistantVoice}>
            <div className="space-y-3">
              {AVAILABLE_VOICES.map((voice) => (
                <div key={voice.value} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={voice.value} id={voice.value} />
                    <Label
                      htmlFor={voice.value}
                      className="flex flex-col cursor-pointer"
                    >
                      <span className="font-medium">{voice.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {voice.description}
                      </span>
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
          <div className="pt-4 border-t">
            <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground">
                  Want to upload your own voice? Contact us
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Custom Voice</DialogTitle>
                  <DialogDescription>
                    Please answer the following questions to submit your custom voice
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="studio-quality"
                      checked={hasStudioQuality}
                      onCheckedChange={(checked) => setHasStudioQuality(checked as boolean)}
                    />
                    <Label htmlFor="studio-quality" className="cursor-pointer">
                      Do you have a studio quality voice available?
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission"
                      checked={hasPermission}
                      onCheckedChange={(checked) => setHasPermission(checked as boolean)}
                    />
                    <Label htmlFor="permission" className="cursor-pointer">
                      Do you have permission to use this voice?
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice-file">Upload Voice Sample</Label>
                    <Input
                      id="voice-file"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    onClick={handleVoiceUpload}
                    disabled={!hasStudioQuality || !hasPermission || !voiceFile}
                    className="w-full"
                  >
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveVoice} disabled={savingVoice}>
              {savingVoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Voice Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
