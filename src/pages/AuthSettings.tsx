import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, LogOut, Users as UsersIcon, ChevronDown, Bell, CreditCard, Shield, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AuthSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const authMethods = [
    {
      name: "BankID (Personnummer)",
      description: "Säker identifiering via BankID med ditt personnummer",
      connected: false,
      recommended: true,
      icon: Shield
    },
    {
      name: "E-post (Verification Code)",
      description: user?.email ? `${user.email} - Login with OTP code` : "Ingen e-post kopplad",
      connected: !!user?.email,
      recommended: false,
      icon: Shield
    },
    {
      name: "SMS (Verification Code)",
      description: "Få en verifieringskod via SMS till ditt telefonnummer",
      connected: false,
      recommended: false,
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Password & Login</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background z-[100]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")} className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/team")} className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Team</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-semibold text-primary">
                <Settings className="mr-2 h-4 w-4" />
                <span>Password & Login</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/notifications")} className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/usage-billing")} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Usage & Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Logged out successfully");
                navigate("/auth");
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-6">
          {/* Authentication Methods */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Methods</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage how you log in to Go Front Office. We recommend using BankID for the most secure and convenient experience.
            </p>

            <div className="space-y-4">
              {authMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{method.name}</h3>
                          {method.recommended && (
                            <Badge variant="outline" className="text-xs">
                              Rekommenderad
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {method.connected ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <XCircle className="h-5 w-5" />
                          <span className="text-sm">Not connected</span>
                        </div>
                      )}
                      <Button
                        variant={method.connected ? "outline" : "default"}
                        size="sm"
                        onClick={() => toast.info(`${method.name} setup coming soon`)}
                      >
                        {method.connected ? "Manage" : "Connect"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Security Recommendations */}
          <Card className="p-6 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Security Recommendations</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Use BankID with your personnummer for the highest level of security and convenience</li>
                  <li>• Email and SMS authentication use one-time verification codes (OTP) for secure login</li>
                  <li>• Enable multiple authentication methods for backup access</li>
                  <li>• Keep your contact information up to date for account recovery</li>
                  <li>• Never share your login credentials or verification codes with anyone</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthSettings;
