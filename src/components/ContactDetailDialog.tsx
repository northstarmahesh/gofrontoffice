import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Phone, Clock, MessageSquare, Mail, Instagram, Facebook, PhoneIncoming, PhoneOutgoing, X, Edit, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  contactId?: string;
  contactName: string | null;
  contactInfo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdated?: () => void;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

const ContactDetailDialog = ({ contactId, contactName, contactInfo, open, onOpenChange, onContactUpdated }: ContactDetailDialogProps) => {
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });
  const [message, setMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("sms");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open && (contactId || contactName)) {
      loadContactData();
      loadContactHistory();
    }
  }, [open, contactId, contactName]);

  const loadContactData = async () => {
    if (contactId) {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .maybeSingle();

      if (error) {
        console.error("Error loading contact:", error);
      } else if (data) {
        setContact(data);
        setEditForm({
          name: data.name,
          phone: data.phone,
          email: data.email || "",
          notes: data.notes || ""
        });
      }
    }
  };

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
      
      // Set default channel based on last conversation
      if (historyData && historyData.length > 0) {
        const lastLog = historyData[historyData.length - 1];
        const type = lastLog.type.toLowerCase();
        if (type.includes('whatsapp')) {
          setSelectedChannel('whatsapp');
        } else if (type.includes('instagram')) {
          setSelectedChannel('instagram');
        } else if (type.includes('phone') || type.includes('call')) {
          setSelectedChannel('phone');
        } else {
          setSelectedChannel('sms');
        }
      }
    } catch (error) {
      console.error("Error loading contact history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!contactId && !contactInfo) return;

    try {
      const contactData = {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        notes: editForm.notes || null
      };

      if (contactId) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update(contactData)
          .eq("id", contactId);

        if (error) throw error;
      } else {
        // Create new contact - need clinic_id from current user
        const { data: clinicData } = await supabase
          .from("clinic_users")
          .select("clinic_id")
          .single();

        if (!clinicData?.clinic_id) {
          toast.error("No clinic found for user");
          return;
        }

        const { error } = await supabase
          .from("contacts")
          .insert({
            ...contactData,
            clinic_id: clinicData.clinic_id
          });

        if (error) throw error;
      }

      toast.success("Contact saved successfully");
      setIsEditing(false);
      loadContactData();
      onContactUpdated?.();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !contactName) return;

    setIsSending(true);
    try {
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .single();

      if (!clinicData?.clinic_id) {
        toast.error("No clinic found for user");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const channelType = selectedChannel === 'phone' ? 'call' : selectedChannel;

      const { error } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          clinic_id: clinicData.clinic_id,
          type: channelType,
          title: `${channelType.toUpperCase()} message`,
          summary: message,
          contact_name: contactName,
          contact_info: contactInfo || contact?.phone,
          status: 'pending',
          direction: 'outbound'
        });

      if (error) throw error;

      toast.success("Message sent successfully");
      setMessage("");
      loadContactHistory();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
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
                {isEditing ? "Edit Contact" : (contact?.name || contactName || "Unknown")}
              </DialogTitle>
              {!isEditing && contactInfo && (
                <DialogDescription className="mt-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3" />
                    {contactInfo}
                  </div>
                </DialogDescription>
              )}
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveContact}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add notes about this contact..."
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <>
                {contact && (
                  <Card className="border-2">
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{contact.phone}</p>
                      </div>
                      {contact.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{contact.email}</p>
                        </div>
                      )}
                      {contact.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="whitespace-pre-wrap">{contact.notes}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

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

                {/* Messaging Section */}
                {!isEditing && (
                  <Card className="border-2 mt-4">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Send Message</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={selectedChannel === 'sms' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChannel('sms')}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant={selectedChannel === 'whatsapp' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChannel('whatsapp')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant={selectedChannel === 'instagram' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChannel('instagram')}
                          >
                            <Instagram className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant={selectedChannel === 'phone' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChannel('phone')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Type your ${selectedChannel === 'phone' ? 'call note' : 'message'}...`}
                        rows={3}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!message.trim() || isSending}
                        className="w-full"
                      >
                        {isSending ? "Sending..." : `Send via ${selectedChannel.toUpperCase()}`}
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailDialog;