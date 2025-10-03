import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "auth">("email");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setStep("auth");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success("Account created! Redirecting to setup...");
      // Will be redirected to clinic onboarding by Index.tsx
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success("Check your email for the magic link!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img 
            src={logo} 
            alt="Front Office" 
            className="mx-auto mb-4 h-16 w-auto"
          />
          <h1 className="text-2xl font-bold text-foreground">Front Office</h1>
          <p className="text-sm text-muted-foreground">
            {step === "email" 
              ? "Enter your email to get started" 
              : isLogin 
                ? "Welcome back! Enter your password" 
                : "Create your account"}
          </p>
        </div>

        {/* Email Step */}
        {step === "email" && (
          <form onSubmit={handleEmailContinue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-light"
              disabled={loading}
            >
              Continue
            </Button>
          </form>
        )}

        {/* Auth Step - Login or Signup */}
        {step === "auth" && (
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-light"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>

            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Or send me a magic link
                </button>
              </div>
            )}
          </form>
        )}

        {/* Toggle between login/signup */}
        {step === "auth" && (
          <div className="mt-6 text-center text-sm">
            <button
              onClick={() => setStep("email")}
              className="text-muted-foreground hover:text-foreground mb-2 block w-full"
              disabled={loading}
            >
              ← Change email
            </button>
            <div>
              <span className="text-muted-foreground">
                {isLogin ? "New here? " : "Already have an account? "}
              </span>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setFullName("");
                }}
                className="font-medium text-primary hover:underline"
                disabled={loading}
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
