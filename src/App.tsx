import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Team from "./pages/Team";
import Notifications from "./pages/Notifications";
import UsageBilling from "./pages/UsageBilling";
import AuthSettings from "./pages/AuthSettings";
import NotFound from "./pages/NotFound";
import InviteAccept from "./pages/InviteAccept";
import CRM from "./pages/CRM";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/team" element={<Team />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/usage-billing" element={<UsageBilling />} />
        <Route path="/auth-settings" element={<AuthSettings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
