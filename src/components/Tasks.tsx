import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle, Bot, User } from "lucide-react";
import ActivityLogs from "./ActivityLogs";
import TaskDetailDialog from "./TaskDetailDialog";
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

  const handleTaskComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const assistantTasks = [
    {
      id: 1,
      title: "Sent appointment reminders",
      description: "3 appointments scheduled for tomorrow",
      priority: "low",
      status: "completed",
      date: "Today",
      time: "9:00 AM",
      source: "Auto",
      isInternal: true,
    },
    {
      id: 2,
      title: "Auto-replied to appointment confirmation",
      description: "Sarah Smith - SMS confirmation sent",
      priority: "medium",
      status: "completed",
      date: "Today",
      time: "9:45 AM",
      source: "SMS",
      isInternal: false,
      contact_name: "Sarah Smith",
    },
    {
      id: 3,
      title: "Processing insurance verification",
      description: "John Doe - Awaiting provider response",
      priority: "medium",
      status: "in-progress",
      date: "Today",
      time: "10:15 AM",
      source: "Phone",
      isInternal: true,
    },
  ];

  // Filter to show only today's tasks
  const todayHumanTasks = humanTasks.filter(task => task.date === "Today");

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setDialogOpen(true);
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="border-destructive/30 bg-destructive/10 text-destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="border-warning/30 bg-warning/10 text-warning">
            Medium
          </Badge>
        );
      default:
        return (
          <Badge className="border-muted-foreground/30 bg-muted text-muted-foreground">
            Low
          </Badge>
        );
    }
  };

  const allTasks = [...assistantTasks, ...humanTasks];
  const pendingTasks = todayHumanTasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in-progress").length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;

  const renderTaskCard = (task: any, isAssistant: boolean) => {
    const isContactTask = task.contact_name || !task.isInternal;
    
    return (
      <Card
        key={task.id}
        className={`cursor-pointer border-0 p-3 shadow-sm transition-all hover:shadow-md ${
          isContactTask ? 'bg-card' : 'bg-muted/30'
        }`}
        onClick={() => handleTaskClick(task)}
      >
        <div className="flex gap-3">
          <div className="pt-0.5">{getStatusIcon(task.status)}</div>
          
          <div className="flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold ${
                  task.status === "completed"
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}>
                  {task.title}
                </h4>
                {!isContactTask && (
                  <Badge variant="outline" className="text-xs bg-muted">
                    Internal
                  </Badge>
                )}
              </div>
              {getPriorityBadge(task.priority)}
            </div>

            <p className="text-xs text-muted-foreground">{task.description}</p>

            <div className="flex items-center justify-between">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {task.source}
              </span>
              <span className="text-xs text-muted-foreground">{task.time}</span>
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
        <ActivityLogs />
      </div>

      {/* Task Detail Dialog */}
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
