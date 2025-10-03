import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, User, Phone, Mail, MessageSquare, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
}

const TaskDetailDialog = ({ task, open, onOpenChange, onViewContact }: TaskDetailDialogProps) => {
  const [relatedLog, setRelatedLog] = useState<ActivityLog | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task?.related_log_id && open) {
      loadTaskDetails();
    }
  }, [task?.related_log_id, open]);

  const loadTaskDetails = async () => {
    if (!task?.related_log_id) return;
    
    setLoading(true);
    try {
      // Load the related log
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return format(date, "PPp");
    } catch {
      return "Invalid date";
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
          <DialogDescription>
            Complete details and history for this task
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Task Details */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Task Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                    {task.priority?.toUpperCase()}
                  </Badge>
                  {task.source && (
                    <Badge variant="outline" className="bg-muted">
                      {task.source}
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Created: {formatDate(task.created_at)}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            {relatedLog && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
                    {relatedLog.contact_name && onViewContact && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onViewContact(relatedLog.contact_name!);
                          onOpenChange(false);
                        }}
                      >
                        View Full Profile
                      </Button>
                    )}
                  </div>
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
                </div>
              </>
            )}

            {/* Activity History */}
            {activityHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Activity History ({activityHistory.length})
                  </h3>
                  <div className="space-y-2">
                    {activityHistory.map((log) => (
                      <Card key={log.id} className="border-0 bg-muted/20 p-3">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{log.title}</p>
                              <Badge variant="outline" className="text-xs">
                                {log.type}
                              </Badge>
                            </div>
                            {log.summary && (
                              <p className="text-xs text-muted-foreground">{log.summary}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
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
