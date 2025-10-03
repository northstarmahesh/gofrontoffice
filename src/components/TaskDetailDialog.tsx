import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Send, CheckCircle, Eye, User, Phone, Clock, MessageSquare, Mail, Instagram, Facebook } from "lucide-react";
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

  useEffect(() => {
    if (task && open) {
      setMessage(task.draft_message || task.description || "");
      setShowAllHistory(false);
      
      // Use mock history if available, otherwise load from database
      if (task.message_history) {
        setActivityHistory(task.message_history as any);
        setRelatedLog({
          id: task.id,
          title: task.title,
          type: task.source || "message",
          summary: task.description,
          contact_name: task.contact_name || null,
          contact_info: task.contact_info || null,
          status: task.status,
          created_at: task.created_at || new Date().toISOString(),
        });
      } else if (task.related_log_id) {
        loadTaskDetails();
      }
    }
  }, [task, open]);

  const loadTaskDetails = async () => {
    if (!task?.related_log_id) return;
    
    setLoading(true);
    try {
      const { data: logData, error: logError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("id", task.related_log_id)
        .single();

      if (logError) throw logError;
      setRelatedLog(logData);

      // Load activity history for the same contact
      if (logData?.contact_name) {
        const { data: historyData, error: historyError } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("contact_name", logData.contact_name)
          .order("created_at", { ascending: false })
          .limit(10);

        if (historyError) throw historyError;
        setActivityHistory(historyData || []);
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
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Message sent successfully!");
      
      // Mark task as completed
      await handleMarkAsDone();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsDone = async () => {
    if (!task) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;

      // Show undo toast
      const toastId = toast.success("Task marked as done", {
        duration: 10000,
        action: {
          label: "Undo",
          onClick: async () => {
            await handleUndoComplete();
          }
        }
      });

      // Close dialog and refresh
      onOpenChange(false);
      if (onTaskComplete) {
        onTaskComplete(task.id);
      }
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
      return <MessageSquare className="h-4 w-4" />;
    } else if (typeUpper.includes('WHATSAPP')) {
      return <Phone className="h-4 w-4" />;
    } else if (typeUpper.includes('EMAIL') || typeUpper.includes('MAIL')) {
      return <Mail className="h-4 w-4" />;
    } else if (typeUpper.includes('INSTAGRAM') || typeUpper.includes('DM')) {
      return <Instagram className="h-4 w-4" />;
    } else if (typeUpper.includes('MESSENGER') || typeUpper.includes('FACEBOOK')) {
      return <Facebook className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  const isFromAI = (title: string, type: string) => {
    return title.toLowerCase().includes('draft') || 
           title.toLowerCase().includes('ai') || 
           type.toLowerCase().includes('draft');
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {relatedLog?.contact_name && `Contact: ${relatedLog.contact_name}`}
              </DialogDescription>
            </div>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
              {task.priority?.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Contact Info Card */}
            {relatedLog && (
              <Card className="border-0 bg-muted/30 p-4">
                <div className="space-y-2">
                  {relatedLog.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{relatedLog.contact_name}</span>
                    </div>
                  )}
                  {relatedLog.contact_info && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{relatedLog.contact_info}</span>
                    </div>
                  )}
                  {relatedLog.summary && (
                    <p className="text-sm text-muted-foreground mt-2">{relatedLog.summary}</p>
                  )}
                </div>
              </Card>
            )}

            {/* Message History - Chat Style */}
            {activityHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation History
                  </h3>
                  {activityHistory.length > 3 && !showAllHistory && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAllHistory(true)}
                      className="text-xs"
                    >
                      Show All ({activityHistory.length})
                    </Button>
                  )}
                </div>
                
                {/* Chat-style messages - reversed to show oldest first */}
                <div className="space-y-3 bg-muted/30 rounded-lg p-4 max-h-[250px] overflow-y-auto">
                  {(showAllHistory ? [...activityHistory].reverse() : [...activityHistory].slice(0, 3).reverse()).map((log) => {
                    const fromAI = isFromAI(log.title, log.type);
                    return (
                      <div key={log.id} className={`flex gap-2 ${fromAI ? 'justify-end' : 'justify-start'}`}>
                        {/* Channel icon on left for received messages */}
                        {!fromAI && (
                          <div className="shrink-0 mt-1">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {getChannelIcon(log.type)}
                            </div>
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`flex flex-col max-w-[75%] ${fromAI ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-4 py-2 ${
                            fromAI 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background border border-border'
                          }`}>
                            {log.summary && (
                              <p className="text-sm">{log.summary}</p>
                            )}
                          </div>
                          
                          {/* Timestamp and type */}
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.created_at)}
                            </span>
                            {fromAI && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                AI Draft
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* AI icon on right for sent messages */}
                        {fromAI && (
                          <div className="shrink-0 mt-1">
                            <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {showAllHistory && activityHistory.length > 3 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAllHistory(false)}
                    className="w-full text-xs"
                  >
                    Show Less
                  </Button>
                )}
              </div>
            )}

            <Separator />

            {/* Draft Message to Send - At Bottom like WhatsApp */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                Your Reply
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
                  Mark as Done
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
                    View Contact History
                  </Button>
                )}
              </div>
            </div>

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
