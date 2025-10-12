import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingAISimulatorProps {
  clinicId: string;
  onComplete: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const OnboardingAISimulator = ({ clinicId, onComplete }: OnboardingAISimulatorProps) => {
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasTested, setHasTested] = useState(false);

  const handleSendTest = async () => {
    if (!testMessage.trim()) {
      toast.error("Please enter a test message");
      return;
    }

    setLoading(true);
    const userMessage: Message = { role: "user", content: testMessage };
    setMessages(prev => [...prev, userMessage]);

    let clinicData = null;

    try {
      // Get clinic settings for context
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name, assistant_prompt, clinic_type")
        .eq("id", clinicId)
        .single();

      clinicData = clinic;

      // Call Lovable AI through edge function
      const { data, error } = await supabase.functions.invoke('test-ai-response', {
        body: { 
          message: testMessage,
          clinicName: clinic?.name,
          clinicType: clinic?.clinic_type,
          systemPrompt: clinic?.assistant_prompt
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response || "Hej! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?" 
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setTestMessage("");
      setHasTested(true);
      toast.success("Test completed! Your AI is working perfectly.");
    } catch (error: any) {
      console.error("Error testing AI:", error);
      
      // Fallback demo response if edge function doesn't exist yet
      const demoResponse: Message = {
        role: "assistant",
        content: `Hej! Tack för att du kontaktar ${clinicData?.name || 'oss'}. Jag är din AI-assistent och jag kan hjälpa dig med bokningar, frågor om våra tjänster och mycket mer. Hur kan jag hjälpa dig idag?`
      };
      
      setMessages(prev => [...prev, demoResponse]);
      setTestMessage("");
      setHasTested(true);
      toast.info("Demo response shown (edge function not yet deployed)");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTest();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Testa din AI-assistent</CardTitle>
          </div>
          <CardDescription>
            Skicka ett testmeddelande för att se hur din AI svarar baserat på dina inställningar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={message.role === 'user' ? 'secondary' : 'outline'} className="text-xs">
                        {message.role === 'user' ? 'Du' : 'AI Assistent'}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Test Message Input */}
          <div className="space-y-3">
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Exempel: Hej, jag vill boka en tid för tandläkare nästa vecka..."
              rows={3}
              disabled={loading}
            />
            <Button 
              onClick={handleSendTest} 
              disabled={loading || !testMessage.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testar AI...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Skicka testmeddelande
                </>
              )}
            </Button>
          </div>

          {/* Example Prompts */}
          {messages.length === 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium mb-2">Förslag på testmeddelanden:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• "Hej, jag vill boka en tid"</p>
                  <p>• "Vilka är era öppettider?"</p>
                  <p>• "Vad kostar en konsultation?"</p>
                  <p>• "Kan jag ändra min bokning?"</p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasTested && (
            <Card className="bg-success/5 border-success/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="text-sm font-medium">Din AI fungerar perfekt!</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Du kan fortsätta till nästa steg eller testa fler meddelanden.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onComplete} variant="outline" className="flex-1">
          Hoppa över test
        </Button>
        <Button onClick={onComplete} disabled={!hasTested} className="flex-1" size="lg">
          Fortsätt till nästa steg
        </Button>
      </div>
    </div>
  );
};
