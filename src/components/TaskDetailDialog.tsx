import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Send, CheckCircle, Eye, User, Phone, Clock, MessageSquare, Mail, Instagram, Facebook, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  source: string | null;
  due_date: string | null;
  created_at: string;
  related_log_id: string | null;
  draft_message?: string;
  contact_name?: string;
  contact_info?: string;
  message_history?: Array<{
    id: string;
    title: string;
    type: string;
    summary: string;
    created_at: string;
    duration?: string;
    direction?: 'inbound' | 'outbound';
    transcript_snippet?: string;
  }>;
}

interface ActivityLog {
  id: string;
  title: string;
  type: string;
  summary: string | null;
  contact_name: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
  duration?: string;
  direction?: 'inbound' | 'outbound';
  transcript_snippet?: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewContact?: (contactName: string) => void;
  onTaskComplete?: (taskId: string) => void;
}

const TaskDetailDialog = ({ task, open, onOpenChange, onViewContact, onTaskComplete }: TaskDetailDialogProps) => {
  const [relatedLog, setRelatedLog] = useState<ActivityLog | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [inboundMessage, setInboundMessage] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [draftReplyId, setDraftReplyId] = useState<string | null>(null);

  useEffect(() => {
    if (task && open) {
      setMessage(task.draft_message || task.description || "");
      setShowAllHistory(false);
      
      if (task.related_log_id) {
        loadTaskDetails();
      }
    }
  }, [task, open]);

  const loadTaskDetails = async () => {
    if (!task?.related_log_id) return;
    
    setLoading(true);
    try {
      // Load the inbound activity log (the message/call from customer)
      const { data: logData, error: logError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("id", task.related_log_id)
        .single();

      if (logError) throw logError;
      setRelatedLog(logData as ActivityLog);
      
      // Set the inbound message (what customer sent)
      setInboundMessage(logData.summary || "");

      // Load the AI draft reply
      const { data: draftData, error: draftError } = await supabase
        .from("draft_replies")
        .select("*")
        .eq("log_id", task.related_log_id)
        .eq("status", "pending")
        .maybeSingle();

      if (draftData) {
        setAiDraft(draftData.draft_content || "");
        setMessage(draftData.draft_content || "");
        setDraftReplyId(draftData.id);
      }

      // Load activity history for the same contact
      if (logData?.contact_name) {
        const { data: historyData, error: historyError } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("contact_name", logData.contact_name)
          .order("created_at", { ascending: true })
          .limit(10);

        if (historyError) throw historyError;
        setActivityHistory((historyData as ActivityLog[]) || []);
      }
    } catch (error) {
      console.error("Error loading task details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      if (isToday) {
        return `Today at ${timeStr}`;
      } else if (isYesterday) {
        return `Yesterday at ${timeStr}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        }) + ` at ${timeStr}`;
      }
    } catch {
      return "Invalid date";
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !task) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get clinic_id and default location from the task
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicData?.clinic_id) throw new Error("No clinic found");

      // Get the first location for this clinic (or use task's location if available)
      const { data: locationData } = await supabase
        .from("clinic_locations")
        .select("id")
        .eq("clinic_id", clinicData.clinic_id)
        .limit(1)
        .maybeSingle();

      const contactName = task.contact_name || relatedLog?.contact_name;
      const contactInfo = task.contact_info || relatedLog?.contact_info;

      // Create activity log for sent message with animation effect
      const { data: newLog, error: logError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          clinic_id: clinicData.clinic_id,
          location_id: locationData?.id || null,
          type: task.source || "message",
          title: `Sent ${task.source || "message"}`,
          summary: message,
          contact_name: contactName,
          contact_info: contactInfo,
          status: "completed",
          direction: "outbound"
        })
        .select()
        .single();

      if (logError) {
        console.error("Activity log error:", logError);
        throw logError;
      }

      // Mark draft as approved if it exists
      if (draftReplyId) {
        await supabase
          .from("draft_replies")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", draftReplyId);
      }

      // Ensure contact exists
      if (contactName && contactInfo) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("clinic_id", clinicData.clinic_id)
          .eq("phone", contactInfo)
          .maybeSingle();

        if (!existingContact) {
          const { error: contactError } = await supabase
            .from("contacts")
            .insert({
              clinic_id: clinicData.clinic_id,
              location_id: locationData?.id || null,
              name: contactName,
              phone: contactInfo
            });
          
          if (contactError) {
            console.error("Contact creation error:", contactError);
          }
        }
      }
      
      // Show success message
      toast.success("Message sent successfully!", {
        description: "The message has been added to activity logs"
      });

      // Simulate sending animation - add the message to activity history immediately
      if (newLog) {
        setActivityHistory(prev => [...prev, newLog as any]);
      }
      
      // Mark task as completed after a short delay to show the new message
      setTimeout(async () => {
        await handleMarkAsDone();
      }, 500);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsDone = async () => {
    if (!task) return;

    try {
      // Animate dialog close
      const dialogElement = document.querySelector('[role="dialog"]');
      if (dialogElement) {
        dialogElement.classList.add('animate-out', 'fade-out-0', 'zoom-out-95', 'slide-out-to-top-2');
      }

      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;

      // Show undo toast
      toast.success("Task completed and moved to activity logs", {
        duration: 10000,
        action: {
          label: "Undo",
          onClick: async () => {
            await handleUndoComplete();
          }
        }
      });

      // Wait for animation before closing
      setTimeout(() => {
        onOpenChange(false);
        if (onTaskComplete) {
          onTaskComplete(task.id);
        }
      }, 200);
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to mark task as done");
    }
  };

  const handleUndoComplete = async () => {
    if (!task) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "pending",
          completed_at: null
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Task restored");
      
      if (onTaskComplete) {
        onTaskComplete(task.id);
      }
    } catch (error) {
      console.error("Error undoing task:", error);
      toast.error("Failed to undo");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      case "medium":
        return "border-warning/30 bg-warning/10 text-warning";
      default:
        return "border-muted-foreground/30 bg-muted text-muted-foreground";
    }
  };

  const getChannelIcon = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('SMS') || typeUpper.includes('TEXT')) {
      return <MessageSquare className="h-5 w-5" />;
    } else if (typeUpper.includes('WHATSAPP')) {
      return <Phone className="h-5 w-5" />;
    } else if (typeUpper.includes('EMAIL') || typeUpper.includes('MAIL')) {
      return <Mail className="h-5 w-5" />;
    } else if (typeUpper.includes('INSTAGRAM') || typeUpper.includes('DM')) {
      return <Instagram className="h-5 w-5" />;
    } else if (typeUpper.includes('MESSENGER') || typeUpper.includes('FACEBOOK')) {
      return <Facebook className="h-5 w-5" />;
    }
    return <MessageSquare className="h-5 w-5" />;
  };

  const isFromAI = (title: string, type: string) => {
    return title.toLowerCase().includes('draft') || 
           title.toLowerCase().includes('ai') || 
           type.toLowerCase().includes('draft');
  };

  const isPhoneCall = (type: string) => {
    const typeLower = type.toLowerCase();
    return typeLower === 'call' || typeLower.includes('phone') || typeLower.includes('voice');
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-3xl max-h-[95vh] p-3 sm:p-6">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-2xl">{task.title}</DialogTitle>
            {relatedLog?.contact_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm">{relatedLog.contact_name}</span>
                {relatedLog.contact_info && (
                  <>
                    <span className="text-xs">•</span>
                    <span className="text-sm">{relatedLog.contact_info}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* For Phone Calls - Show transcript and call actions */}
            {isPhoneCall(task.source || "") ? (
              <div className="space-y-4">
                {/* Call Info Card */}
                <Card className="border-l-4 border-l-primary bg-primary/5">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneIncoming className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-sm">Incoming Call</span>
                      </div>
                      {relatedLog?.duration && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relatedLog.duration}
                        </Badge>
                      )}
                    </div>
                    
                    {inboundMessage && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">📝 TRANSCRIPT:</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{inboundMessage}</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Call Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" disabled>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Back
                  </Button>
                  <Button variant="outline" onClick={handleMarkAsDone}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Done
                  </Button>
                </div>
              </div>
            ) : (
              /* For Messages (SMS/WhatsApp/etc) - Show inbound + AI draft */
              <div className="space-y-4">
                {/* Inbound Message Card */}
                {inboundMessage && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      📥 MESAJ PRIMIT:
                    </label>
                    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="p-4">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{inboundMessage}</p>
                      </div>
                    </Card>
                  </div>
                )}

                <Separator />

                {/* AI Draft - Editable */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    🤖 AI DRAFT - Edit if needed:
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="min-h-[120px] resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !message.trim()}
                    className="w-full"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? "Sending..." : "Send Message"}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleMarkAsDone}
                      disabled={isSending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Skip
                    </Button>
                    
                    {relatedLog?.contact_name && onViewContact && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onViewContact(relatedLog.contact_name!);
                          onOpenChange(false);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Contact
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}


            {loading && (
              <div className="flex justify-center py-4">
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
