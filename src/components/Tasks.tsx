import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Tasks = () => {
  const tasks = [
    {
      id: 1,
      title: "Review prescription refill request",
      description: "Mike Johnson - WhatsApp inquiry needs doctor approval",
      priority: "high",
      status: "pending",
      dueDate: "Today",
      source: "WhatsApp",
    },
    {
      id: 2,
      title: "Approve draft reply for new patient",
      description: "Instagram DM about services and pricing",
      priority: "medium",
      status: "pending",
      dueDate: "Today",
      source: "Instagram",
    },
    {
      id: 3,
      title: "Follow up on insurance verification",
      description: "Patient John Doe needs insurance confirmation",
      priority: "medium",
      status: "in-progress",
      dueDate: "Tomorrow",
      source: "Phone",
    },
    {
      id: 4,
      title: "Send appointment reminders",
      description: "3 appointments scheduled for tomorrow",
      priority: "low",
      status: "completed",
      dueDate: "Completed",
      source: "Auto",
    },
    {
      id: 5,
      title: "Update patient contact information",
      description: "Sarah Smith requested update",
      priority: "low",
      status: "completed",
      dueDate: "Completed",
      source: "SMS",
    },
  ];

  const handleTaskClick = (taskId: number) => {
    toast.info("Task details would open here");
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

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Manage your to-dos and follow-ups
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-warning">{pendingTasks}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="border-0 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-info">{inProgressTasks}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </Card>
        <Card className="border-0 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-success">{completedTasks}</p>
          <p className="text-xs text-muted-foreground">Done</p>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="cursor-pointer border-0 p-4 shadow-sm transition-all hover:shadow-md"
            onClick={() => handleTaskClick(task.id)}
          >
            <div className="flex gap-3">
              <div className="pt-0.5">{getStatusIcon(task.status)}</div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`font-semibold ${
                    task.status === "completed"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}>
                    {task.title}
                  </h4>
                  {getPriorityBadge(task.priority)}
                </div>

                <p className="text-sm text-muted-foreground">{task.description}</p>

                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {task.source}
                  </span>
                  <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
