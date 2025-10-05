import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Bot, User, MessageSquare, Phone, Mail, Instagram, Send, MapPin, AlertCircle, ArrowRight, TrendingUp, DollarSign, Calendar, CalendarIcon, ChevronDown, ChevronUp, Pencil, History, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetailDialog from "./TaskDetailDialog";
import ContactDetailDialog from "./ContactDetailDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, differenceInMilliseconds } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ActivityLogs from "./ActivityLogs";

interface TasksProps {
  onNavigateToContact?: (contactName: string) => void;
}

const Tasks = ({ onNavigateToContact }: TasksProps) => {
  const { greeting, weather, backgroundGradient, emoji } = useGreetingAndWeather();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [humanTasks, setHumanTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedContactForHistory, setSelectedContactForHistory] = useState<{
    name: string;
    info: string;
    id?: string;
    draftMessage?: string;
    messageHistory?: any[];
  } | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [compactView, setCompactView] = useState(true);
  const [inlineExpandedTasks, setInlineExpandedTasks] = useState<Set<string>>(new Set());
  const [tasksSectionCollapsed, setTasksSectionCollapsed] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });
  const [analyticsData, setAnalyticsData] = useState({
    callsCount: 0,
    messagesCount: 0,
    avgResponseTime: 0,
    costSaved: 0,
    prevCallsCount: 0,
    prevMessagesCount: 0,
    prevAvgResponseTime: 0,
    prevCostSaved: 0,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadTasks();
      loadActivityLogs();
      loadAnalytics();
    }

    // Set up realtime subscription for tasks
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          console.log('Task changed, refreshing...');
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [refreshKey, selectedLocation, selectedDate, dateFilter, dateRange]);

  const loadLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clinicUsers?.clinic_id) {
        const { data: locations } = await supabase
          .from("clinic_locations")
          .select("*")
          .eq("clinic_id", clinicUsers.clinic_id)
          .order("created_at", { ascending: true });

        if (locations && locations.length > 0) {
          setLocations(locations);
          setSelectedLocation(locations[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUsers?.clinic_id) return;

      // Filter by selected date
      const startDate = selectedDate ? new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString() : new Date().toISOString();
      const endDate = selectedDate ? new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString() : new Date().toISOString();

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("clinic_id", clinicUsers.clinic_id)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUsers } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUsers?.clinic_id) return;

      // Determine date range
      let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;
      
      if (dateRange?.from && dateRange?.to) {
        // Use date range
        startDate = startOfDay(dateRange.from);
        endDate = endOfDay(dateRange.to);
        const rangeDiff = differenceInMilliseconds(endDate, startDate);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - rangeDiff);
      } else if (dateFilter) {
        // Use single date
        startDate = startOfDay(dateFilter);
        endDate = endOfDay(dateFilter);
        prevStartDate = startOfDay(new Date(dateFilter.getTime() - 24 * 60 * 60 * 1000));
        prevEndDate = endOfDay(new Date(dateFilter.getTime() - 24 * 60 * 60 * 1000));
      } else {
        // Default to today
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        prevStartDate = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
        prevEndDate = endOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
      }

      // Fetch current period data
      const { data: currentLogs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("clinic_id", clinicUsers.clinic_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch previous period data for comparison
      const { data: prevLogs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("clinic_id", clinicUsers.clinic_id)
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString());

      // Calculate metrics
      const callsCount = currentLogs?.filter(log => log.type === 'phone').length || 0;
      const messagesCount = currentLogs?.filter(log => ['sms', 'whatsapp', 'messenger', 'instagram'].includes(log.type)).length || 0;
      
      const prevCallsCount = prevLogs?.filter(log => log.type === 'phone').length || 0;
      const prevMessagesCount = prevLogs?.filter(log => ['sms', 'whatsapp', 'messenger', 'instagram'].includes(log.type)).length || 0;

      // Calculate average response time (mock calculation - would need actual response time data)
      const avgResponseTime = 2.3; // Mock value in minutes
      const prevAvgResponseTime = 2.6; // Mock previous value

      // Calculate cost saved (estimate based on activity)
      const totalActivities = callsCount + messagesCount;
      const costSaved = totalActivities * 15; // $15 per handled activity
      const prevCostSaved = (prevCallsCount + prevMessagesCount) * 15;

      setAnalyticsData({
        callsCount,
        messagesCount,
        avgResponseTime,
        costSaved,
        prevCallsCount,
        prevMessagesCount,
        prevAvgResponseTime,
        prevCostSaved,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks with their related activity logs
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          activity_logs!tasks_related_log_id_fkey (
            contact_name,
            contact_info,
            summary,
            type
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch message history for each task
      const tasksWithHistory = await Promise.all(
        (tasks || []).map(async (task) => {
          const contactName = task.activity_logs?.contact_name;
          if (!contactName) return task;

          // Fetch all activity logs for this contact
          const { data: history } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('contact_name', contactName)
            .order('created_at', { ascending: true });

          return {
            ...task,
            contact_name: contactName,
            contact_info: task.activity_logs?.contact_info,
            draft_message: task.description,
            message_history: history,
          };
        })
      );

      setHumanTasks(tasksWithHistory);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add some dummy tasks for contacts with draft messages
  const dummyHumanTasks = [
    {
      id: "dummy1",
      title: "Tidbokning förfrågan",
      description: "AI har skapat ett svar med tillgängliga tider",
      status: "pending",
      date: "Today",
      time: "13:30",
      source: "whatsapp",
      isInternal: false,
      contact_name: "Emma Anderson",
      contact_info: "+46 70 987 6543",
      draftMessage: "Hej Emma! Tack för att du hörde av dig. Jag har dessa tider tillgängliga denna vecka:\n\n• Tisdag 14:00\n• Onsdag 10:30\n• Fredag 15:00\n\nVilken tid passar dig bäst?",
      message_history: [
        {
          id: "msg1",
          title: "WhatsApp meddelande",
          type: "whatsapp",
          summary: "Emma Anderson: Hej! Jag behöver omboka min tid. Har ni någon ledig tid denna vecka?",
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: "msg2",
          title: "AI Utkast",
          type: "draft",
          summary: "Hej Emma! Tack för att du hörde av dig. Jag har dessa tider tillgängliga denna vecka:\n\n• Tisdag 14:00\n• Onsdag 10:30\n• Fredag 15:00\n\nVilken tid passar dig bäst?",
          created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        },
      ],
    },
    {
      id: "dummy2",
      title: "AI Call Summary - New Patient Consultation",
      description: "Call handled by AI - Review summary and complete follow-up actions",
      status: "pending",
      date: "Today",
      time: "10:45 AM",
      source: "phone",
      isInternal: true,
      contact_name: "Sarah Martinez",
      contact_info: "+46 70 234 5678",
      callSummary: "Sarah called inquiring about teeth whitening services. She's interested in booking a consultation and asked about pricing. She mentioned she has sensitive teeth and wants to know if that's an issue.",
      actions: [
        "Send pricing information via SMS",
        "Schedule consultation appointment",
        "Add note about teeth sensitivity to patient file"
      ],
      duration: "4m 32s",
      draftMessage: "Hi Sarah! Thanks for calling about our teeth whitening services. I'm happy to help!\n\nFor sensitive teeth, we offer a gentle whitening treatment that's specifically designed for this. Our consultation is 500 SEK (deducted from treatment if you proceed).\n\nFull treatment pricing:\n• In-office whitening: 3,500 SEK\n• Take-home kit: 2,200 SEK\n• Sensitivity treatment (if needed): 800 SEK\n\nWould you like to book a consultation? I have availability:\n• Tomorrow 2:00 PM\n• Thursday 10:30 AM\n• Friday 1:00 PM\n\nLet me know what works best for you!",
      message_history: [
        {
          id: "call1",
          title: "Incoming call",
          type: "phone",
          summary: "Call from Sarah Martinez - Duration: 4m 32s",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          duration: "4m 32s",
          direction: "inbound",
        },
        {
          id: "call_summary1",
          title: "AI Call Summary",
          type: "call_summary",
          summary: "Sarah called inquiring about teeth whitening services. She's interested in booking a consultation and asked about pricing. She mentioned she has sensitive teeth and wants to know if that's an issue.\n\nAction Items:\n• Send pricing information via SMS\n• Schedule consultation appointment\n• Add note about teeth sensitivity to patient file",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 3 + 1000 * 60).toISOString(),
        },
        {
          id: "draft2",
          title: "AI Draft Response",
          type: "draft",
          summary: "Hi Sarah! Thanks for calling about our teeth whitening services. I'm happy to help!\n\nFor sensitive teeth, we offer a gentle whitening treatment that's specifically designed for this. Our consultation is 500 SEK (deducted from treatment if you proceed).\n\nFull treatment pricing:\n• In-office whitening: 3,500 SEK\n• Take-home kit: 2,200 SEK\n• Sensitivity treatment (if needed): 800 SEK\n\nWould you like to book a consultation? I have availability:\n• Tomorrow 2:00 PM\n• Thursday 10:30 AM\n• Friday 1:00 PM\n\nLet me know what works best for you!",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 3 + 1000 * 120).toISOString(),
        },
      ],
    },
    {
      id: "dummy3",
      title: "Uppföljning receptförfrågan",
      description: "Utkast klart: Information om receptförnyelse",
      status: "pending",
      date: "Today",
      time: "14:15",
      source: "sms",
      isInternal: false,
      contact_name: "Mike Johnson",
      contact_info: "+46 70 123 4567",
      draftMessage: "Hej Mike! För receptförnyelse, vänligen ring oss minst 48 timmar innan ditt recept tar slut. Vi behöver kontrollera med din läkare för godkännande. Du kan även använda vårt onlineformulär på vår hemsida.",
      message_history: [
        {
          id: "msg5",
          title: "SMS meddelande",
          type: "sms",
          summary: "Mike Johnson: Hej, jag behöver förnya mitt recept. Vad är processen?",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: "msg6",
          title: "AI Utkast",
          type: "draft",
          summary: "Hej Mike! För receptförnyelse, vänligen ring oss minst 48 timmar innan ditt recept tar slut. Vi behöver kontrollera med din läkare för godkännande. Du kan även använda vårt onlineformulär på vår hemsida.",
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        },
      ],
    },
  ];

  const handleTaskComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleQuickSend = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!task.draftMessage || !task.contact_info) {
      toast.error("Missing draft message or contact info");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Send the message via the appropriate channel
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          clinic_id: task.clinic_id,
          type: task.source,
          title: `${task.source.toUpperCase()} message`,
          summary: task.draftMessage,
          contact_name: task.contact_name,
          contact_info: task.contact_info,
          status: 'completed',
          direction: 'outbound'
        });

      if (logError) throw logError;

      // Mark task as completed
      if (task.id) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', task.id);

        if (taskError) throw taskError;
      }

      // Update draft_replies status if exists
      if (task.related_log_id) {
        const { error: draftError } = await supabase
          .from('draft_replies')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('log_id', task.related_log_id)
          .eq('status', 'pending');

        if (draftError) console.error("Error updating draft:", draftError);
      }

      toast.success(`Message sent via ${task.source.toUpperCase()}`);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const assistantTasks = [
    {
      id: 1,
      title: "Sent appointment reminders",
      description: "3 appointments scheduled for tomorrow",
      status: "completed",
      date: "Today",
      time: "9:00 AM",
      source: "auto",
      isInternal: true,
    },
    {
      id: 2,
      title: "Auto-replied to appointment confirmation",
      description: "Sarah Smith - SMS confirmation sent",
      status: "completed",
      date: "Today",
      time: "9:45 AM",
      source: "sms",
      isInternal: false,
      contact_name: "Sarah Smith",
    },
    {
      id: 3,
      title: "Processing insurance verification",
      description: "John Doe - Awaiting provider response",
      status: "in-progress",
      date: "Today",
      time: "10:15 AM",
      source: "phone",
      isInternal: true,
    },
  ];

  // Filter to show only today's tasks
  const todayHumanTasks = [...humanTasks, ...dummyHumanTasks].filter(task => task.date === "Today");

  const handleTaskClick = (task: any) => {
    const isContactTask = task.contact_name || !task.isInternal;
    
    if (isContactTask && task.contact_name) {
      // Open contact history dialog for contact tasks with draft message
      setSelectedContactForHistory({
        name: task.contact_name,
        info: task.contact_info || "",
        id: undefined,
        draftMessage: task.draftMessage || task.draft_message,
        messageHistory: task.message_history || [],
      });
      setContactDialogOpen(true);
    } else {
      // Open task detail dialog for internal tasks
      // Pass message_history to the dialog
      setSelectedTask({
        ...task,
        message_history: task.message_history || [],
      });
      setDialogOpen(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-info" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getChannelIcon = (source: string) => {
    const lowerSource = source?.toLowerCase() || "";
    switch (lowerSource) {
      case "sms":
        return MessageSquare;
      case "whatsapp":
        return MessageSquare;
      case "instagram":
        return Instagram;
      case "messenger":
        return Send;
      case "email":
        return Mail;
      case "phone":
        return Phone;
      default:
        return MessageSquare;
    }
  };

  const getChannelColor = (source: string) => {
    const lowerSource = source?.toLowerCase() || "";
    switch (lowerSource) {
      case "sms":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "whatsapp":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "instagram":
        return "bg-pink-500/10 text-pink-600 border-pink-500/30";
      case "messenger":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30";
      case "email":
        return "bg-purple-500/10 text-purple-600 border-purple-500/30";
      case "phone":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getChannelDisplay = (source: string) => {
    const lowerSource = source?.toLowerCase() || "";
    switch (lowerSource) {
      case "sms":
        return "SMS";
      case "whatsapp":
        return "WhatsApp";
      case "instagram":
        return "Instagram";
      case "messenger":
        return "Messenger";
      case "email":
        return "Email";
      case "phone":
        return "Phone";
      default:
        return source;
    }
  };

  const allTasks = [...assistantTasks, ...humanTasks];
  const pendingTasks = todayHumanTasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in-progress").length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  const stats = [
    {
      label: dateRange?.from && dateRange?.to ? "Calls (Range)" : "Calls Today",
      value: analyticsData.callsCount.toString(),
      change: calculateChange(analyticsData.callsCount, analyticsData.prevCallsCount),
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Messages",
      value: analyticsData.messagesCount.toString(),
      change: calculateChange(analyticsData.messagesCount, analyticsData.prevMessagesCount),
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Avg Response Time",
      value: `${analyticsData.avgResponseTime.toFixed(1)}m`,
      change: calculateChange(analyticsData.prevAvgResponseTime, analyticsData.avgResponseTime), // Inverted for response time
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Cost Saved",
      value: `$${analyticsData.costSaved}`,
      change: calculateChange(analyticsData.costSaved, analyticsData.prevCostSaved),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const downloadCSV = () => {
    const headers = ["Metric", "Value", "Change"];
    const rows = stats.map(stat => [stat.label, stat.value, stat.change]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Analytics exported as CSV");
  };

  const downloadPDF = () => {
    // Create a print-friendly view
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateRangeText = dateRange?.from && dateRange?.to 
      ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
      : dateFilter 
      ? format(dateFilter, "MMM dd, yyyy")
      : format(new Date(), "MMM dd, yyyy");

    printWindow.document.write(`
      <html>
        <head>
          <title>Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; margin-bottom: 10px; }
            .date { color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .positive { color: #22c55e; }
            .negative { color: #ef4444; }
            .neutral { color: #666; }
          </style>
        </head>
        <body>
          <h1>Analytics Report</h1>
          <p class="date">${dateRangeText}</p>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map(stat => `
                <tr>
                  <td>${stat.label}</td>
                  <td>${stat.value}</td>
                  <td class="${stat.change.startsWith('+') ? 'positive' : stat.change.startsWith('-') ? 'negative' : 'neutral'}">${stat.change}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success("Print dialog opened for PDF export");
  };

  const getTaskTypeLabel = (task: any) => {
    if (task.callSummary) {
      return { label: "AI Call Summary", color: "bg-green-500/10 text-green-600 border-green-500/30" };
    }
    if (task.draftMessage) {
      return { label: "Draft Message", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    }
    if (task.isInternal) {
      return { label: "Review Task", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" };
    }
    return { label: "Action Required", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
  };

  const getTaskInstruction = (task: any) => {
    if (task.callSummary) {
      return "Review AI call summary and complete the action items below";
    }
    if (task.draftMessage) {
      return "Review and send this AI-drafted message";
    }
    if (task.isInternal) {
      return "Review this AI-generated task and mark complete when done";
    }
    return "Take action on this task";
  };

  const toggleExpanded = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getOriginalMessage = (task: any) => {
    // Get the first message from message_history (customer's original message)
    if (task.message_history && task.message_history.length > 0) {
      const firstMessage = task.message_history[0];
      return firstMessage.summary || firstMessage.title;
    }
    return null;
  };

  const toggleInlineExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const renderTaskCard = (task: any, isAssistant: boolean) => {
    const isContactTask = task.contact_name || !task.isInternal;
    const ChannelIcon = getChannelIcon(task.source);
    const taskType = getTaskTypeLabel(task);
    const instruction = getTaskInstruction(task);
    const hasDraft = task.draftMessage;
    const isExpanded = expandedTasks.has(task.id);
    const isInlineExpanded = inlineExpandedTasks.has(task.id);
    const originalMessage = getOriginalMessage(task);
    
    return (
      <Card
        key={task.id}
        className={cn(
          "border-2 border-yellow-accent/20 shadow-lg transition-all hover:shadow-xl hover:border-yellow-accent/40 bg-card",
          compactView ? "p-4" : "p-6"
        )}
      >
        <div className={cn("space-y-3", !compactView && "space-y-4")}>
          {/* Header: Type badge and Channel */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className={cn("px-3 py-1 border", taskType.color, compactView ? "text-xs" : "text-sm")}>
                {taskType.label}
              </Badge>
              <Badge className={`flex items-center gap-1.5 border ${getChannelColor(task.source)}`}>
                <ChannelIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{getChannelDisplay(task.source)}</span>
              </Badge>
            </div>
          </div>

          {/* Main content - clickable area for inline expand */}
          <div 
            className="space-y-3 cursor-pointer" 
            onClick={(e) => toggleInlineExpand(task.id, e)}
          >
            {/* Customer/Contact name with View Conversation button */}
            {isContactTask && task.contact_name && (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-bold text-foreground", compactView ? "text-lg" : "text-2xl")}>
                      {task.contact_name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {isInlineExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Badge>
                  </div>
                  {task.contact_info && (isInlineExpanded || !compactView) && (
                    <p className="text-sm text-muted-foreground mt-1">{task.contact_info}</p>
                  )}
                </div>
                {hasDraft && isInlineExpanded && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                    className="text-sm flex items-center gap-1.5 flex-shrink-0"
                  >
                    <History className="h-4 w-4" />
                    Full Conversation
                  </Button>
                )}
              </div>
            )}

            {/* Task title/description */}
            <div className={cn("space-y-2", compactView && "space-y-1")}>
              {!isContactTask && (
                <h4 className={cn("font-bold text-foreground", compactView ? "text-base" : "text-xl")}>{task.title}</h4>
              )}
              
              {/* Call Summary */}
              {task.callSummary && isInlineExpanded && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Call Duration: {task.duration}</span>
                  </div>
                  <p className="text-base text-foreground leading-relaxed">
                    {task.callSummary}
                  </p>
                  
                  {task.actions && task.actions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm font-semibold text-foreground">Action Items:</p>
                      <ul className="space-y-1.5">
                        {task.actions.map((action: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                            <Circle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Original Message - Show for draft tasks */}
              {originalMessage && !task.callSummary && isInlineExpanded && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Original Message</Badge>
                      <Badge className={`flex items-center gap-1.5 border text-xs px-2 py-0.5 ${getChannelColor(task.source)}`}>
                        <ChannelIcon className="h-3 w-3" />
                        {getChannelDisplay(task.source)}
                      </Badge>
                    </div>
                    {task.message_history && task.message_history[0]?.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.message_history[0].created_at).toLocaleTimeString('sv-SE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm text-foreground leading-relaxed whitespace-pre-wrap",
                    !isExpanded && "line-clamp-3"
                  )}>
                    {originalMessage}
                  </p>
                  {originalMessage.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => toggleExpanded(task.id, e)}
                      className="text-xs text-primary hover:text-primary/80 p-0 h-auto"
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp className="h-3 w-3 ml-1" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Show draft message inline if available - prominent yellow box */}
            {hasDraft && (
              <div className={cn(
                "space-y-3 rounded-lg bg-yellow-accent/10 border-2 border-yellow-accent/50 shadow-sm",
                compactView ? "p-3" : "p-5"
              )}>
                <div className="flex items-center justify-between">
                  <Badge className={cn("bg-yellow-accent text-yellow-accent-foreground font-semibold", compactView ? "text-xs" : "text-xs")}>
                    ⚡ AI Draft - Action Required
                  </Badge>
                  {task.message_history && task.message_history.length > 0 && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const originalTime = new Date(task.message_history[0].created_at);
                        const now = new Date();
                        const waitMinutes = Math.floor((now.getTime() - originalTime.getTime()) / 60000);
                        const draftTime = task.message_history.length > 1 
                          ? new Date(task.message_history[task.message_history.length - 1].created_at)
                          : originalTime;
                        return (
                          <>
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Väntat {waitMinutes}m
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {draftTime.toLocaleTimeString('sv-SE', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <p className={cn(
                  "text-foreground leading-relaxed whitespace-pre-wrap font-medium",
                  !isInlineExpanded && compactView ? "text-xs line-clamp-2" : "text-sm"
                )}>
                  {task.draftMessage}
                </p>
              </div>
            )}
          </div>

          {/* Footer: Actions only (time moved to message panes) */}
          <div className="flex items-center justify-end pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {hasDraft ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                    className="text-sm flex items-center gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => handleQuickSend(task, e)}
                    className="text-sm flex items-center gap-1.5"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-primary font-medium text-sm cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  handleTaskClick(task);
                }}>
                  {task.callSummary ? "Review & Complete" : task.draftMessage ? "Review & Send" : "Take Action"}
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const groupTasksByDate = (tasks: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    tasks.forEach((task) => {
      if (!grouped[task.date]) {
        grouped[task.date] = [];
      }
      grouped[task.date].push(task);
    });
    return grouped;
  };

  const humanTasksByDate = groupTasksByDate(todayHumanTasks);
  const assistantTasksByDate = groupTasksByDate(assistantTasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground mb-2">No Locations Found</p>
        <p className="text-sm text-muted-foreground">Please add a location in Business Settings to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`rounded-2xl ${backgroundGradient} p-6 text-white shadow-lg transition-all duration-1000 border-2 border-yellow-accent/20`}>
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-8 w-8" />
          <h2 className="text-2xl font-bold">{greeting}! {emoji}</h2>
        </div>
        <p className="text-base opacity-90">
          Your assistant is working on your behalf. Review tasks that need your attention below.
        </p>
        {weather && (
          <p className="mt-2 text-sm opacity-75">
            Currently {Math.round(weather.temp)}°C
          </p>
        )}
      </div>

      {/* Location Tabs */}
      {locations.length > 0 && (
        <Tabs value={selectedLocation} onValueChange={setSelectedLocation} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${locations.length}, 1fr)` }}>
            {locations.map((location) => (
              <TabsTrigger key={location.id} value={location.id} className="gap-2">
                <MapPin className="h-4 w-4" />
                {location.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {locations.map((location) => (
            <TabsContent key={location.id} value={location.id} className="space-y-6 mt-6">
              {todayHumanTasks.length === 0 ? (
                <>
                  <Card className="p-12 text-center border-2 border-dashed bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="text-8xl mb-4">🏖️</div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">You're absolutely crushing it!</h3>
                    <p className="text-lg text-muted-foreground mb-4">Zero tasks. Zip. Nada. Nothing! 🎉</p>
                    <p className="text-sm text-muted-foreground italic">Your AI assistant is handling everything like a boss.</p>
                  </Card>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Your Tasks</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {todayHumanTasks.length} {todayHumanTasks.length === 1 ? 'task' : 'tasks'} need your attention
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTasksSectionCollapsed(!tasksSectionCollapsed)}
                        className="gap-2"
                      >
                        {tasksSectionCollapsed ? (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Expand
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Collapse
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Your Tasks */}
                  {!tasksSectionCollapsed && (
                    <div className="space-y-4 mb-6">
                      {todayHumanTasks.map((task) => renderTaskCard(task, false))}
                    </div>
                  )}

                  {/* Activity Logs */}
                  <div className="pt-6 border-t">
                    <h3 className="text-xl font-bold text-foreground mb-4">Activity Logs</h3>
                    <ActivityLogs onNavigateToContact={onNavigateToContact} />
                  </div>
                </>
              )}

            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Contact Detail Dialog for contact tasks */}
      {selectedContactForHistory && (
        <ContactDetailDialog
          contactId={selectedContactForHistory.id}
          contactName={selectedContactForHistory.name}
          contactInfo={selectedContactForHistory.info}
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          onContactUpdated={loadTasks}
          draftMessage={selectedContactForHistory.draftMessage}
          messageHistory={selectedContactForHistory.messageHistory}
          onViewFullProfile={() => {
            if (onNavigateToContact && selectedContactForHistory.name) {
              onNavigateToContact(selectedContactForHistory.name);
            }
          }}
        />
      )}

      {/* Task Detail Dialog for internal tasks */}
      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onViewContact={onNavigateToContact}
        onTaskComplete={handleTaskComplete}
      />
    </div>
  );
};

export default Tasks;
