import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

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
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-light flex flex-col lg:flex-row">
      {/* Left Column - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white">
        <div className="max-w-xl">
          {/* Logo and Badge */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-16 w-auto mb-6 brightness-0 invert"
            />
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
              <span className="text-lg">🏆</span>
              <span>Trusted by 1,000+ healthcare businesses</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Double your efficiency with{" "}
            <span className="text-yellow-300">Front Office</span>
          </h1>

          {/* Testimonials */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-300">⭐</span>
                ))}
              </div>
              <p className="text-sm lg:text-base italic mb-4">
                "Our AI receptionist has been a game-changer. We used to miss calls when we were under the hood, but now every customer gets immediate attention. Bookings are up 40%!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <p className="font-semibold text-sm">Sarah Johnson</p>
                  <p className="text-xs text-white/80">Johnson's Auto Repair</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-300">⭐</span>
                ))}
              </div>
              <p className="text-sm lg:text-base italic mb-4">
                "The appointment scheduling feature is incredible. Patients can book 24/7 and the AI handles rescheduling perfectly. It's like having a full-time receptionist at a fraction of the cost."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                  👨‍⚕️
                </div>
                <div>
                  <p className="font-semibold text-sm">Dr. Mike Chen</p>
                  <p className="text-xs text-white/80">Smile Dental</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-background/95 backdrop-blur-sm">
        <Card className="w-full max-w-md border-0 p-8 shadow-2xl">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 text-center">
            <img 
              src={logo} 
              alt="Front Office" 
              className="mx-auto mb-4 h-12 w-auto"
            />
          </div>

          {/* Card Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {step === "email" 
                ? "Get Started" 
                : isLogin 
                  ? "Welcome Back" 
                  : "Create Account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "email" 
                ? "Start your journey to better patient engagement" 
                : isLogin 
                  ? "Sign in to your account" 
                  : "Join thousands of healthcare providers"}
            </p>
          </div>

          {/* Email Step */}
          {step === "email" && (
            <form onSubmit={handleEmailContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
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
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email-auth">Email</Label>
                <Input
                  id="email-auth"
                  type="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
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
            <div className="mt-6 text-center text-sm space-y-2">
              <button
                onClick={() => setStep("email")}
                className="text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                ← Change email
              </button>
              <div>
                <span className="text-muted-foreground">
                  {isLogin ? "Already have an account? " : "New here? "}
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
                  {isLogin ? "Sign in" : "Create an account"}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
