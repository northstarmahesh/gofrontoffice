import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Bot, User, MessageSquare, Phone, Mail, Instagram, Send } from "lucide-react";
import ActivityLogs from "./ActivityLogs";
import TaskDetailDialog from "./TaskDetailDialog";
import ContactDetailDialog from "./ContactDetailDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TasksProps {
  onNavigateToContact?: (contactName: string) => void;
}

const Tasks = ({ onNavigateToContact }: TasksProps) => {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [humanTasks, setHumanTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContactForHistory, setSelectedContactForHistory] = useState<{
    name: string;
    info: string;
    id?: string;
    draftMessage?: string;
  } | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [refreshKey]);

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
      title: "Review and approve draft message",
      description: "AI prepared response about appointment rescheduling",
      status: "pending",
      date: "Today",
      time: "11:30 AM",
      source: "whatsapp",
      isInternal: false,
      contact_name: "Emma Rodriguez",
      contact_info: "+46 76 345 6789",
      draftMessage: "Hi Emma! Thanks for reaching out. I'd be happy to help you reschedule your appointment. We have availability next Tuesday at 2 PM or Thursday at 10 AM. Which time works better for you?",
    },
    {
      id: "dummy2",
      title: "Follow up on prescription inquiry",
      description: "Draft message ready: Information about prescription refill process",
      status: "pending",
      date: "Today",
      time: "2:15 PM",
      source: "sms",
      isInternal: false,
      contact_name: "Mike Johnson",
      contact_info: "+46 70 123 4567",
      draftMessage: "Hello Mike! For your prescription refill, please call us at least 48 hours before you run out. We'll need to check with your doctor for authorization. You can also use our online refill request form on our website.",
    },
    {
      id: "dummy3",
      title: "Respond to pricing question",
      description: "AI drafted detailed pricing breakdown",
      status: "pending",
      date: "Today",
      time: "3:45 PM",
      source: "instagram",
      isInternal: false,
      contact_name: "Sarah Williams",
      contact_info: "@sarah_williams",
      draftMessage: "Hi Sarah! Thanks for your interest! Our teeth whitening packages start at 2,500 SEK for a single session, or 4,500 SEK for a complete package (3 sessions). The full cleaning and whitening combo is 5,800 SEK. Would you like to book a free consultation?",
    },
  ];

  const handleTaskComplete = () => {
    setRefreshKey(prev => prev + 1);
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
        id: undefined, // Will be looked up in ContactDetailDialog
        draftMessage: task.draftMessage,
      });
      setContactDialogOpen(true);
    } else {
      // Open task detail dialog for internal tasks
      setSelectedTask(task);
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

  const renderTaskCard = (task: any, isAssistant: boolean) => {
    const isContactTask = task.contact_name || !task.isInternal;
    const ChannelIcon = getChannelIcon(task.source);
    
    return (
      <Card
        key={task.id}
        className={`cursor-pointer border-0 p-4 shadow-sm transition-all hover:shadow-md ${
          isContactTask ? 'bg-card' : 'bg-muted/30'
        }`}
        onClick={() => handleTaskClick(task)}
      >
        <div className="flex gap-3">
          <div className="pt-0.5">{getStatusIcon(task.status)}</div>
          
          <div className="flex-1 space-y-2">
            {/* Top row: Customer name (if contact task) + Channel badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {isContactTask && task.contact_name ? (
                  <h3 className={`text-base font-bold ${
                    task.status === "completed"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}>
                    {task.contact_name}
                  </h3>
                ) : (
                  <h4 className={`text-sm font-semibold ${
                    task.status === "completed"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}>
                    {task.title}
                  </h4>
                )}
              </div>
              
              <Badge className={`flex items-center gap-1.5 border ${getChannelColor(task.source)}`}>
                <ChannelIcon className="h-3.5 w-3.5" />
                {getChannelDisplay(task.source)}
              </Badge>
            </div>

            {/* Description/Title row */}
            {isContactTask && task.contact_name && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}

            {/* Bottom row: Time */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{task.time}</span>
              {!isContactTask && (
                <Badge variant="outline" className="text-xs bg-muted">
                  Internal
                </Badge>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Tasks for Today</h2>
        <p className="text-sm text-muted-foreground">
          Actions you need to take based on AI drafts and your own tasks
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-warning">{pendingTasks}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="border-0 p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-info">{inProgressTasks}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </Card>
        <Card className="border-0 p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-success">{completedTasks}</p>
          <p className="text-xs text-muted-foreground">Done</p>
        </Card>
      </div>

      {/* Your Tasks (Human) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Your Tasks</h3>
        </div>
        {Object.entries(humanTasksByDate).map(([date, tasks]) => (
          <div key={date} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{date}</p>
            <div className="space-y-2">
              {tasks.map((task) => renderTaskCard(task, false))}
            </div>
          </div>
        ))}
      </div>

      {/* Assistant Tasks */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-secondary" />
          <h3 className="text-lg font-semibold text-foreground">Assistant Activity</h3>
        </div>
        {Object.entries(assistantTasksByDate).map(([date, tasks]) => (
          <div key={date} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{date}</p>
            <div className="space-y-2">
              {tasks.map((task) => renderTaskCard(task, true))}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Logs Section */}
      <div className="mt-8">
        <ActivityLogs onNavigateToContact={onNavigateToContact} />
      </div>

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
