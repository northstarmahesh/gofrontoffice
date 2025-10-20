import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, Clock, Search, Instagram, Mail, User, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  recording_url?: string | null;
  duration?: string | null;
}

interface ActivityLogsProps {
  onNavigateToContact?: (contactName: string) => void;
}

const ActivityLogs = ({ onNavigateToContact }: ActivityLogsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [selectedContact, setSelectedContact] = useState<{
    name: string;
    info: string;
    id?: string;
    draftMessage?: string;
  } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadActivityLogs(true);

    // Subscribe to realtime updates for activity logs
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('Activity log updated:', payload);
          // Reload logs when transcription is added
          if (payload.new.summary !== payload.old.summary) {
            loadActivityLogs(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (channelFilter !== "all" || searchQuery) {
      loadActivityLogs(true);
    }
  }, [channelFilter]);

  const loadActivityLogs = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setPage(0);
      setLogs([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLogs([]);
        return;
      }

      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicData?.clinic_id) {
        setLogs([]);
        return;
      }

      const currentPage = reset ? 0 : page;
      let query = supabase
        .from("activity_logs")
        .select("*", { count: 'exact' })
        .eq("clinic_id", clinicData.clinic_id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      // Apply channel filter
      if (channelFilter !== "all") {
        query = query.eq("type", channelFilter);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching logs:", error);
        toast.error("Failed to load activity logs");
        return;
      }
      
      const uniqueLogs = Array.from(
        new Map(
          (data || []).map(log => [
            `${log.contact_info}-${log.title}-${log.created_at}`,
            log
          ])
        ).values()
      );

      // Look up saved contact names for all logs
      const logsWithContactNames = await Promise.all(
        uniqueLogs.map(async (log) => {
          if (log.contact_info) {
            const { data: savedContact } = await supabase
              .from('contacts')
              .select('name')
              .eq('clinic_id', clinicData.clinic_id)
              .eq('phone', log.contact_info)
              .maybeSingle();
            
            if (savedContact?.name) {
              return { ...log, contact_name: savedContact.name };
            }
          }
          return log;
        })
      );
      
      if (reset) {
        setLogs(logsWithContactNames);
      } else {
        setLogs(prev => [...prev, ...logsWithContactNames]);
      }

      setHasMore((count ?? 0) > (currentPage + 1) * PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLogClick = async (log: ActivityLog) => {
    if (log.contact_name) {
      // It's a contact activity - open contact detail dialog
      let contactId = undefined;
      let draftMessage = undefined;
      
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

      // If status is pending AND it's an outbound message, use the summary as the draft message
      // (the AI draft is stored in the summary field of pending outbound messages)
      if (log.status === "pending" && log.summary && log.direction === "outbound") {
        draftMessage = log.summary;
        console.log("Found draft in activity log summary:", draftMessage);
      }

      console.log("Opening dialog with draft:", draftMessage);
      setSelectedContact({
        name: log.contact_name,
        info: log.contact_info || "",
        id: contactId,
        draftMessage: draftMessage
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
    const timezone = 'Europe/Stockholm';
    
    // Convert to Sweden timezone
    const nowSweden = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
    const dateSweden = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    const isToday = dateSweden.toDateString() === nowSweden.toDateString();
    const yesterday = new Date(nowSweden);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = dateSweden.toDateString() === yesterday.toDateString();
    
    const timeStr = date.toLocaleTimeString('sv-SE', { 
      timeZone: timezone,
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    if (isToday) {
      return { date: "Today", time: `Today, ${timeStr}` };
    } else if (isYesterday) {
      return { date: "Yesterday", time: `Yesterday, ${timeStr}` };
    } else {
      const dateStr = date.toLocaleDateString('sv-SE', {
        timeZone: timezone, 
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
          draftMessage={selectedContact.draftMessage}
          onViewFullProfile={() => {
            if (onNavigateToContact && selectedContact.name) {
              onNavigateToContact(selectedContact.name);
            }
          }}
        />
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        <>
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
                            <div className="flex-1 flex items-center gap-2">
                              {/* Show contact name first if it's a contact activity */}
                              {isContact && log.contact_name ? (
                                <>
                                  <div>
                                    <h4 className="text-base font-bold text-foreground">
                                      {log.contact_name}
                                    </h4>
                                    <p className="text-sm text-foreground mt-0.5">
                                      {log.title}
                                    </p>
                                  </div>
                                  {log.title?.startsWith('✅ Resolved:') && (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Task Resolved
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">
                                    {log.title}
                                    {!isContact && (
                                      <Badge variant="outline" className="ml-2 text-xs bg-muted">
                                        Internal
                                      </Badge>
                                    )}
                                  </h4>
                                  {log.title?.startsWith('✅ Resolved:') && (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Task Resolved
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
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
                          </div>

                          {log.summary && (
                            <p className="text-xs text-foreground line-clamp-2">{log.summary}</p>
                          )}

                          {log.recording_url && (
                            <div className="mt-2 space-y-1">
                              <audio 
                                controls 
                                className="w-full h-8"
                                preload="metadata"
                              >
                                <source 
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vonage-recording-proxy?url=${encodeURIComponent(log.recording_url)}`} 
                                  type="audio/mpeg" 
                                />
                                Your browser does not support the audio element.
                              </audio>
                              {log.duration && (
                                <p className="text-xs text-muted-foreground">
                                  Duration: {log.duration}
                                </p>
                              )}
                            </div>
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

          {/* Load More Button */}
          {hasMore && !searchQuery && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadActivityLogs(false)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLogs;
