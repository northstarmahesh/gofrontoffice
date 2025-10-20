import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Instagram, Facebook, Mail, FileText, Clock, User, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";

const Activity = () => {
  const { greeting, emoji } = useGreetingAndWeather();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clinicUser?.clinic_id) {
        setClinicId(clinicUser.clinic_id);

        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("clinic_id", clinicUser.clinic_id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setActivities(data || []);
      }
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return Phone;
      case "sms": return MessageSquare;
      case "whatsapp": return MessageSquare;
      case "instagram": return Instagram;
      case "messenger": return Facebook;
      case "email": return Mail;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-xl bg-primary/20" />
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {greeting} {emoji}
        </h1>
        <p className="text-muted-foreground">
          Communication history and logs
        </p>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activity yet</p>
          </Card>
        ) : (
          activities.map((activity) => {
            const Icon = getIcon(activity.type);
            const isExpanded = expandedId === activity.id;

            return (
              <Collapsible
                key={activity.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : activity.id)}
              >
                <Card className="overflow-hidden hover:shadow-md transition-all">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 text-left">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{activity.title}</h3>
                            <Badge className={cn("text-xs", getStatusColor(activity.status))}>
                              {activity.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              <span className="truncate">{activity.contact_name || activity.contact_info}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{format(new Date(activity.created_at), "MMM d, HH:mm")}</span>
                            </div>
                          </div>
                        </div>

                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          isExpanded && "transform rotate-180"
                        )} />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
                      {activity.summary && (
                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground">{activity.summary}</p>
                        </div>
                      )}
                      
                      {activity.duration && (
                        <div className="mb-2">
                          <p className="text-sm">
                            <span className="font-medium">Duration:</span>{" "}
                            <span className="text-muted-foreground">{activity.duration}</span>
                          </p>
                        </div>
                      )}

                      {activity.recording_url && (
                        <div className="mt-3">
                          <audio controls className="w-full">
                            <source src={activity.recording_url} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Activity;
