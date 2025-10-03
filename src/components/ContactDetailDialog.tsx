import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { User, Phone, Clock, MessageSquare, Mail, Instagram, Facebook, PhoneIncoming, PhoneOutgoing, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface ContactDetailDialogProps {
  contactName: string | null;
  contactInfo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactDetailDialog = ({ contactName, contactInfo, open, onOpenChange }: ContactDetailDialogProps) => {
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contactName && open) {
      loadContactHistory();
    }
  }, [contactName, open]);

  const loadContactHistory = async () => {
    if (!contactName) return;
    
    setLoading(true);
    try {
      const { data: historyData, error: historyError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("contact_name", contactName)
        .order("created_at", { ascending: true });

      if (historyError) throw historyError;
      setActivityHistory((historyData as ActivityLog[]) || []);
    } catch (error) {
      console.error("Error loading contact history:", error);
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

  const getChannelColor = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('SMS') || typeUpper.includes('TEXT')) {
      return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    } else if (typeUpper.includes('WHATSAPP')) {
      return "bg-green-500/10 text-green-600 border-green-500/30";
    } else if (typeUpper.includes('EMAIL') || typeUpper.includes('MAIL')) {
      return "bg-purple-500/10 text-purple-600 border-purple-500/30";
    } else if (typeUpper.includes('INSTAGRAM') || typeUpper.includes('DM')) {
      return "bg-pink-500/10 text-pink-600 border-pink-500/30";
    } else if (typeUpper.includes('MESSENGER') || typeUpper.includes('FACEBOOK')) {
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30";
    } else if (typeUpper.includes('CALL') || typeUpper.includes('PHONE')) {
      return "bg-orange-500/10 text-orange-600 border-orange-500/30";
    }
    return "bg-muted text-muted-foreground border-border";
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

  if (!contactName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5" />
                {contactName}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {contactInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3" />
                    {contactInfo}
                  </div>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading conversation history...</p>
              </div>
            ) : activityHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No conversation history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Complete Conversation History ({activityHistory.length} interactions)
                </h3>
                
                {/* Chat-style messages - chronological order */}
                <div className="space-y-4">
                  {activityHistory.map((log) => {
                    const fromAI = isFromAI(log.title, log.type);
                    const phoneCall = isPhoneCall(log.type);
                    const channelColor = getChannelColor(log.type);
                    
                    // Extract contact name from summary if present
                    let displayName = contactName;
                    let messageText = log.summary || "";
                    if (!fromAI && messageText) {
                      const nameMatch = messageText.match(/^([^:]+):\s*(.+)$/);
                      if (nameMatch) {
                        displayName = nameMatch[1];
                        messageText = nameMatch[2];
                      }
                    }
                    
                    // Render phone call summary card
                    if (phoneCall) {
                      return (
                        <div key={log.id} className="flex justify-center">
                          <Card className={`w-[90%] border-l-4 ${channelColor}`}>
                            <div className="p-4 space-y-3">
                              {/* Call header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {log.direction === 'inbound' ? (
                                    <PhoneIncoming className="h-5 w-5" />
                                  ) : (
                                    <PhoneOutgoing className="h-5 w-5" />
                                  )}
                                  <span className="font-semibold text-sm">
                                    {log.direction === 'inbound' ? 'Incoming Call' : 'Outgoing Call'}
                                  </span>
                                </div>
                                {log.duration && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {log.duration}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Call summary */}
                              {log.summary && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Summary:</p>
                                  <p className="text-sm text-foreground leading-relaxed">{log.summary}</p>
                                </div>
                              )}
                              
                              {/* Timestamp */}
                              <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                                {formatDateTime(log.created_at)}
                              </div>
                            </div>
                          </Card>
                        </div>
                      );
                    }
                    
                    // Regular message rendering
                    return (
                      <div key={log.id} className={`flex gap-2 ${fromAI ? 'justify-end' : 'justify-start'}`}>
                        {/* Channel icon for received messages */}
                        {!fromAI && (
                          <div className="shrink-0 mt-1">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${channelColor} border`}>
                              {getChannelIcon(log.type)}
                            </div>
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`flex flex-col max-w-[75%] ${fromAI ? 'items-end' : 'items-start'}`}>
                          {/* Contact name for received messages */}
                          {!fromAI && (
                            <span className="text-xs font-semibold text-foreground mb-1 px-1">
                              {displayName}
                            </span>
                          )}
                          
                          <div className={`rounded-2xl px-4 py-2 ${
                            fromAI 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background border border-border'
                          }`}>
                            <p className="text-sm">{messageText}</p>
                          </div>
                          
                          {/* Timestamp and channel badge */}
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.created_at)}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1.5 py-0 ${channelColor} border`}
                            >
                              {log.type}
                            </Badge>
                            {fromAI && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                AI Draft
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* AI icon for sent messages */}
                        {fromAI && (
                          <div className="shrink-0 mt-1">
                            <div className="h-9 w-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                              <MessageSquare className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailDialog;
