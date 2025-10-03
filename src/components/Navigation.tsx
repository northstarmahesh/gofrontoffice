import { Activity, Users, CheckSquare, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "status" | "contacts" | "tasks" | "clinic";

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const navItems = [
    { id: "status" as View, icon: Activity, label: "STATUS", color: "text-primary" },
    { id: "tasks" as View, icon: CheckSquare, label: "TASKS", color: "text-success" },
    { id: "contacts" as View, icon: Users, label: "CONTACTS", color: "text-secondary" },
    { id: "clinic" as View, icon: Building2, label: "CLINIC", color: "text-accent" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card/95 backdrop-blur-md shadow-lg">
      <div className="container mx-auto flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-5 py-2 transition-all",
                isActive
                  ? `${item.color} scale-110 font-bold`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "drop-shadow-lg")} />
              <span className={cn(
                "text-xs font-bold tracking-wide",
                isActive && "text-shadow"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
