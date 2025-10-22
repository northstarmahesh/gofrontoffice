import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Clock, User, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranscriptTurn {
  role: 'user' | 'agent';
  message: string;
  time_in_call_secs: number; // ElevenLabs uses seconds from call start
}

interface CallMetadata {
  call_duration_secs?: number; // ElevenLabs uses this field name
  start_time_unix_secs?: number;
  accepted_time_unix_secs?: number;
  cost?: number;
}

interface CallTranscriptData {
  conversation_id: string;
  transcript: TranscriptTurn[];
  metadata: CallMetadata;
  duration_seconds?: number;
  created_at: string;
  call_direction?: string;
}

interface CallTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityLogId: string;
  contactName?: string;
  contactPhone?: string;
}

const CallTranscriptDialog = ({
  open,
  onOpenChange,
  activityLogId,
  contactName,
  contactPhone,
}: CallTranscriptDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [transcriptData, setTranscriptData] = useState<CallTranscriptData | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (open && activityLogId) {
      loadTranscript();
    }
  }, [open, activityLogId]);

  const loadTranscript = async () => {
    setLoading(true);
    setRetryCount(0);
    try {
      // Step 1: Get conversation_id, title, summary from activity_logs
      const { data: activityLog, error: logError } = await supabase
        .from('activity_logs')
        .select('conversation_id, clinic_id, created_at, title, summary')
        .eq('id', activityLogId)
        .single();

      if (logError) {
        console.error('Error fetching activity log:', logError);
        toast.error('Kunde inte ladda samtalsdetaljer');
        setLoading(false);
        return;
      }

      // Step 2: Try to extract conversation_id from title or summary if not present
      let conversationId = activityLog?.conversation_id;
      
      if (!conversationId) {
        const regex = /conv_[A-Za-z0-9_-]+/i;
        const titleMatch = activityLog?.title?.match(regex);
        const summaryMatch = activityLog?.summary?.match(regex);
        conversationId = titleMatch?.[0] || summaryMatch?.[0];
        
        if (conversationId) {
          console.log('Extracted conversation_id from text:', conversationId);
        }
      }

      // Step 3: Direct lookup if we have conversation_id
      if (conversationId) {
        const { data: callLog, error: callError } = await supabase
          .from('elevenlabs_call_logs')
          .select('*')
          .eq('conversation_id', conversationId)
          .maybeSingle();

        if (callError) {
          console.error('Error fetching call log:', callError);
        } else if (callLog && callLog.transcript) {
          const typedData: CallTranscriptData = {
            conversation_id: callLog.conversation_id,
            transcript: ((callLog.transcript as unknown) as TranscriptTurn[]) || [],
            metadata: ((callLog.metadata as unknown) as CallMetadata) || {},
            duration_seconds: callLog.duration_seconds || 0,
            created_at: callLog.created_at,
            call_direction: callLog.call_direction || 'inbound',
          };
          setTranscriptData(typedData);
          setLoading(false);
          return;
        }
      }

      // Step 4: Fallback - wider time window (±2 hours)
      console.warn('No direct conversation_id match, attempting time-based fallback with ±2 hour window');
      
      const targetTime = new Date(activityLog.created_at);
      const startTime = new Date(targetTime.getTime() - 2 * 60 * 60 * 1000); // -2 hours
      const endTime = new Date(targetTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

      const { data: recentCalls, error: recentErr } = await supabase
        .from('elevenlabs_call_logs')
        .select('*')
        .eq('clinic_id', activityLog.clinic_id)
        .gte('created_at', startTime.toISOString())
        .lte('created_at', endTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentErr) {
        console.error('Error fetching recent call logs:', recentErr);
        setTranscriptData(null);
        setLoading(false);
        return;
      }

      if (recentCalls && recentCalls.length > 0) {
        const targetTimeMs = targetTime.getTime();
        let closest: any = null;
        let minDiff = Number.POSITIVE_INFINITY;

        for (const c of recentCalls) {
          const t = new Date((c as any).created_at).getTime();
          const diff = Math.abs(t - targetTimeMs);
          if (diff < minDiff) {
            minDiff = diff;
            closest = c;
          }
        }

        // Accept match within 2 hour window
        if (closest && minDiff <= 2 * 60 * 60 * 1000) {
          const typedData: CallTranscriptData = {
            conversation_id: (closest as any).conversation_id,
            transcript: (((closest as any).transcript as unknown) as TranscriptTurn[]) || [],
            metadata: (((closest as any).metadata as unknown) as CallMetadata) || {},
            duration_seconds: (closest as any).duration_seconds || 0,
            created_at: (closest as any).created_at,
            call_direction: (closest as any).call_direction || 'inbound',
          };
          setTranscriptData(typedData);
          setLoading(false);
          return;
        }
      }

      // No suitable match found
      setTranscriptData(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Kunde inte ladda transkription');
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (timeInCallSecs: number) => {
    // Format as MM:SS from call start
    const minutes = Math.floor(timeInCallSecs / 60);
    const seconds = timeInCallSecs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]" aria-describedby="call-transcript-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Samtal med {contactName || contactPhone || 'Okänd'}
          </DialogTitle>
        </DialogHeader>
        <p id="call-transcript-desc" className="sr-only">Detaljer och transkription för telefonsamtalet.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !transcriptData || !transcriptData.transcript || transcriptData.transcript.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Transkription hittades inte för detta äldre samtal.
                </p>
                <p className="text-xs text-muted-foreground">
                  Detta kan hända för samtal som gjordes innan systemet uppgraderades.
                </p>
              </div>
              {retryCount < 2 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setRetryCount(prev => prev + 1);
                    loadTranscript();
                  }}
                >
                  Försök igen ({retryCount + 1}/3)
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Call Metadata */}
            <Card className="p-4 bg-muted/30 border-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Längd:</span>
                  <Badge variant="outline" className="font-mono">
                    {formatDuration(transcriptData.duration_seconds || transcriptData.metadata?.call_duration_secs)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Riktning:</span>
                  <Badge variant="outline">
                    {transcriptData.call_direction === 'inbound' ? 'Inkommande' : 'Utgående'}
                  </Badge>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tidpunkt:</span>
                  <span className="font-mono text-xs">
                    {formatCallTime(transcriptData.created_at)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Transcript */}
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3">
                {transcriptData.transcript.map((turn, index) => {
                  const isUser = turn.role === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] space-y-1 ${
                          isUser ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {isUser ? (
                            <>
                              <User className="h-3 w-3" />
                              <span>Patient</span>
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3" />
                              <span>AI Assistent</span>
                            </>
                          )}
                          <span className="text-xs opacity-70">
                            {formatMessageTime(turn.time_in_call_secs)}
                          </span>
                        </div>
                        <Card
                          className={`p-3 ${
                            isUser
                              ? 'bg-muted border-muted-foreground/20'
                              : 'bg-primary text-primary-foreground border-primary'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{turn.message}</p>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CallTranscriptDialog;
