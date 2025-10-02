import { Home, Settings, FileText, CheckSquare, BarChart3, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "dashboard" | "settings" | "logs" | "tasks" | "reports" | "clinic";

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const navItems = [
    { id: "dashboard" as View, icon: Home, label: "Home" },
    { id: "clinic" as View, icon: Building2, label: "Clinic" },
    { id: "logs" as View, icon: FileText, label: "Logs" },
    { id: "tasks" as View, icon: CheckSquare, label: "Tasks" },
    { id: "settings" as View, icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
