import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, Clock, Search, Instagram, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import ContactDetailDialog from "./ContactDetailDialog";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  contact_name: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
  actions: string[] | null;
  direction?: string;
}

interface ActivityLogsProps {
  onNavigateToContact?: (contactName: string) => void;
}

const ActivityLogs = ({ onNavigateToContact }: ActivityLogsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<{
    name: string;
    info: string;
    id?: string;
  } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    setLoading(true);
    try {
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .single();

      if (!clinicData?.clinic_id) {
        toast.error("No clinic found");
        return;
      }

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("clinic_id", clinicData.clinic_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogClick = async (log: ActivityLog) => {
    if (log.contact_name) {
      // It's a contact activity - open contact detail dialog
      let contactId = undefined;
      
      // Try to find the contact ID from contacts table
      if (log.contact_info) {
        const { data: clinicData } = await supabase
          .from("clinic_users")
          .select("clinic_id")
          .single();

        if (clinicData?.clinic_id) {
          const { data: contactData } = await supabase
            .from("contacts")
            .select("id")
            .eq("clinic_id", clinicData.clinic_id)
            .eq("phone", log.contact_info)
            .maybeSingle();

          contactId = contactData?.id;
        }
      }

      setSelectedContact({
        name: log.contact_name,
        info: log.contact_info || "",
        id: contactId
      });
      setDetailDialogOpen(true);
    }
    // For non-contact (internal) activities, we don't open a dialog (yet)
  };

  const isContactActivity = (log: ActivityLog) => {
    return !!log.contact_name;
  };

  const getChannelIcon = (channel: string) => {
    const channelLower = channel.toLowerCase();
    if (channelLower.includes("call") || channelLower.includes("phone")) {
      return <Phone className="h-4 w-4" />;
    } else if (channelLower.includes("sms") || channelLower.includes("text")) {
      return <MessageSquare className="h-4 w-4" />;
    } else if (channelLower.includes("whatsapp")) {
      return <Phone className="h-4 w-4" />;
    } else if (channelLower.includes("instagram")) {
      return <Instagram className="h-4 w-4" />;
    } else if (channelLower.includes("email") || channelLower.includes("mail")) {
      return <Mail className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
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
      return { date: "Today", time: `Today, ${timeStr}` };
    } else if (isYesterday) {
      return { date: "Yesterday", time: `Yesterday, ${timeStr}` };
    } else {
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
      return { date: dateStr, time: `${dateStr}, ${timeStr}` };
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.contact_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = 
      channelFilter === "all" || 
      log.type.toLowerCase().includes(channelFilter.toLowerCase());
    return matchesSearch && matchesChannel;
  });

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const { date } = formatDateTime(log.created_at);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  return (
    <div className="space-y-4">
      {/* Contact Detail Dialog */}
      {selectedContact && (
        <ContactDetailDialog
          contactId={selectedContact.id}
          contactName={selectedContact.name}
          contactInfo={selectedContact.info}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onContactUpdated={loadActivityLogs}
          onViewFullProfile={() => {
            if (onNavigateToContact && selectedContact.name) {
              onNavigateToContact(selectedContact.name);
            }
          }}
        />
      )}

      <div>
        <h2 className="mb-2 text-xl font-bold text-foreground">Activity Logs</h2>
        <p className="text-xs text-muted-foreground">
          Complete history of all assistant interactions
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={channelFilter} onValueChange={setChannelFilter}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="call" className="text-xs">Calls</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs">Social</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grouped Logs */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No activity logs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{date}</h3>
              <div className="space-y-2">
                {dateLogs.map((log) => {
                  const isContact = isContactActivity(log);
                  const { time } = formatDateTime(log.created_at);
                  
                  return (
                    <Card 
                      key={log.id} 
                      className={`border-0 p-3 shadow-sm transition-all ${
                        isContact 
                          ? 'hover:shadow-md cursor-pointer hover:border-primary/20' 
                          : 'bg-muted/30 hover:bg-muted/50 cursor-default'
                      }`}
                      onClick={() => isContact && handleLogClick(log)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isContact ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isContact ? getChannelIcon(log.type) : <User className="h-4 w-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {log.title}
                              {!isContact && (
                                <Badge variant="outline" className="ml-2 text-xs bg-muted">
                                  Internal
                                </Badge>
                              )}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs ${
                                log.status === "completed"
                                  ? "border-green-500/30 bg-green-500/10 text-green-600"
                                  : log.status === "auto-replied"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                                  : log.status === "pending"
                                  ? "border-orange-500/30 bg-orange-500/10 text-orange-600"
                                  : "border-purple-500/30 bg-purple-500/10 text-purple-600"
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                            {isContact && log.contact_name && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{log.contact_name}</span>
                              </>
                            )}
                          </div>

                          {log.summary && (
                            <p className="text-xs text-foreground line-clamp-2">{log.summary}</p>
                          )}

                          {log.actions && log.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {log.actions.map((action, index) => (
                                <span
                                  key={index}
                                  className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  ✓ {action}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
