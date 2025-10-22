import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

  useEffect(() => {
    if (open && activityLogId) {
      loadTranscript();
    }
  }, [open, activityLogId]);

  const loadTranscript = async () => {
    setLoading(true);
    try {
      // Step 1: Get conversation_id directly from activity_logs
      const { data: activityLog, error: logError } = await supabase
        .from('activity_logs')
        .select('conversation_id')
        .eq('id', activityLogId)
        .single();

      if (logError) {
        console.error('Error fetching activity log:', logError);
        toast.error('Kunde inte ladda samtalsdetaljer');
        setLoading(false);
        return;
      }

      if (!activityLog?.conversation_id) {
        console.warn('No conversation ID found in activity log');
        setTranscriptData(null);
        setLoading(false);
        return;
      }

      // Step 2: Direct lookup using conversation_id
      const { data: callLog, error: callError } = await supabase
        .from('elevenlabs_call_logs')
        .select('*')
        .eq('conversation_id', activityLog.conversation_id)
        .maybeSingle();

      if (callError) {
        console.error('Error fetching call log:', callError);
        toast.error('Kunde inte ladda transkription');
        setLoading(false);
        return;
      }

      // Step 3: Handle result
      if (callLog && callLog.transcript) {
        const typedData: CallTranscriptData = {
          conversation_id: callLog.conversation_id,
          transcript: ((callLog.transcript as unknown) as TranscriptTurn[]) || [],
          metadata: ((callLog.metadata as unknown) as CallMetadata) || {},
          duration_seconds: callLog.duration_seconds || 0,
          created_at: callLog.created_at,
          call_direction: callLog.call_direction || 'inbound',
        };
        setTranscriptData(typedData);
      } else {
        // Transcript not yet available (webhook pending)
        setTranscriptData(null);
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Kunde inte ladda transkription');
    } finally {
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
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Samtal med {contactName || contactPhone || 'Okänd'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !transcriptData || !transcriptData.transcript || transcriptData.transcript.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-muted/30 rounded-lg p-6 space-y-2">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Transkription bearbetas fortfarande...
              </p>
              <p className="text-xs text-muted-foreground">
                Detta kan ta upp till 30 sekunder efter samtalet avslutats.
              </p>
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
