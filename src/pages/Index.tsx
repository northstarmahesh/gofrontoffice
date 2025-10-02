import { useState } from "react";
import { Stethoscope } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";
import ActivityLogs from "@/components/ActivityLogs";
import Tasks from "@/components/Tasks";
import Reports from "@/components/Reports";
import Navigation from "@/components/Navigation";

type View = "dashboard" | "settings" | "logs" | "tasks" | "reports";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "settings":
        return <Settings />;
      case "logs":
        return <ActivityLogs />;
      case "tasks":
        return <Tasks />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Clinic Assistant</h1>
              <p className="text-xs text-muted-foreground">Always here to help</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
};

export default Index;
