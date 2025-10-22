import { Activity, Users, CheckSquare, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "tasks" | "status" | "contacts" | "settings";

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const navItems = [
    { id: "tasks" as View, icon: CheckSquare, label: "TASKS" },
    { id: "status" as View, icon: Activity, label: "STATUS" },
    { id: "contacts" as View, icon: Users, label: "CONTACTS" },
    { id: "settings" as View, icon: SettingsIcon, label: "SETTINGS" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-yellow-accent/20 bg-card/95 backdrop-blur-md shadow-lg">
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
                  ? "text-primary scale-110 font-bold bg-yellow-accent/20 border-2 border-yellow-accent shadow-lg"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
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
