import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { KnowledgeBase } from "./KnowledgeBase";
import { Loader2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ResourcesManagerProps {
  clinicId: string;
}

const AVAILABLE_VOICES = [
  { value: "alloy", label: "Alloy", description: "Neutral and balanced", preview: "https://cdn.openai.com/API/docs/audio/alloy.wav" },
  { value: "echo", label: "Echo", description: "Warm and friendly", preview: "https://cdn.openai.com/API/docs/audio/echo.wav" },
  { value: "fable", label: "Fable", description: "Expressive and engaging", preview: "https://cdn.openai.com/API/docs/audio/fable.wav" },
  { value: "onyx", label: "Onyx", description: "Deep and authoritative", preview: "https://cdn.openai.com/API/docs/audio/onyx.wav" },
  { value: "nova", label: "Nova", description: "Clear and professional", preview: "https://cdn.openai.com/API/docs/audio/nova.wav" },
];

export const ResourcesManager = ({ clinicId }: ResourcesManagerProps) => {
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantVoice, setAssistantVoice] = useState("alloy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [hasStudioQuality, setHasStudioQuality] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [clinicId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select("assistant_prompt, assistant_voice")
        .eq("id", clinicId)
        .single();

      if (error) throw error;

      if (data) {
        setAssistantPrompt(data.assistant_prompt || "");
        setAssistantVoice(data.assistant_voice || "alloy");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load assistant settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          assistant_prompt: assistantPrompt,
          assistant_voice: assistantVoice,
        })
        .eq("id", clinicId);

      if (error) throw error;

      toast.success("Assistant settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save assistant settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePlayVoice = (voiceValue: string) => {
    if (playingVoice === voiceValue) {
      setPlayingVoice(null);
      return;
    }
    
    const voice = AVAILABLE_VOICES.find(v => v.value === voiceValue);
    if (voice?.preview) {
      const audio = new Audio(voice.preview);
      audio.play();
      setPlayingVoice(voiceValue);
      audio.onended = () => setPlayingVoice(null);
    }
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayVoice(voice.value)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
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
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Assistant Settings
        </Button>
      </div>
    </div>
  );
};
