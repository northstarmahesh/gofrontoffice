import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import { toast } from "sonner";
import logo from "@/assets/front-office-logo-transparent.png";
import { Phone, MessageSquare, Calendar, AlarmClock, MessageCircle, Target } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "auth" | "code">("email");
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !awaitingVerification) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect if we're not waiting for email verification
      if (session && !awaitingVerification) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, awaitingVerification]);

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    // Keep the current isLogin state
    setStep("auth");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    setAwaitingVerification(true);
    
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        // Handle case where user already exists
        if (error.message.includes('already registered') || 
            error.message.includes('already exists')) {
          toast.error("This email is already registered. Please sign in instead.");
          setIsLogin(true);
          setAwaitingVerification(false);
          return;
        }
        throw error;
      }

      // Send 6-digit verification code using edge function
      const { data: codeData, error: codeError } = await supabase.functions.invoke(
        'send-email-verification',
        {
          body: { email }
        }
      );

      if (codeError) {
        console.error("Failed to send verification code:", codeError);
        toast.error("Account created but failed to send verification code");
      } else {
        console.log("Verification code sent:", codeData);
        toast.success("Check your email for the 6-digit verification code!");
      }

      setStep("code");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to sign up");
      setAwaitingVerification(false);
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

  const handleSendCode = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-email-verification',
        {
          body: { email }
        }
      );

      if (error) throw error;

      console.log("Verification code sent:", data);
      toast.success("Check your email for the 6-digit verification code!");
      setStep("code");
    } catch (error: any) {
      toast.error(error.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      // Verify the code using edge function
      const { data, error } = await supabase.functions.invoke(
        'verify-email-otp',
        {
          body: { email, code: verificationCode }
        }
      );

      if (error) throw error;

      if (!data.verified) {
        throw new Error(data.error || "Invalid verification code");
      }

      setAwaitingVerification(false);
      toast.success("Successfully verified! Redirecting...");
      
      // Sign in the user after verification
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error("Verification successful but sign-in failed. Please try logging in.");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--auth-bg))] flex flex-col lg:flex-row">
      {/* Left Column - Value Proposition */}
      <div className="lg:w-1/2 flex flex-col justify-center p-8 lg:p-12 xl:p-16 text-white">
        <div className="max-w-xl mx-auto lg:mx-0">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-16 lg:h-20 w-auto [mix-blend-mode:lighten]"
            />
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 leading-tight">
            Meet Your New Digital Assistant
          </h1>
          <p className="text-xl lg:text-2xl text-yellow-accent font-semibold mb-8">
            24x7 Available. No Vacation Needed.
          </p>

          {/* Benefits */}
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlarmClock className="text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Save 5+ Hours/Week</h3>
                <p className="text-sm text-white/80">No more boring admin tasks or answering repetitive questions</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Multiple Channels, 1 Assistant</h3>
                <p className="text-sm text-white/80">Your assistant can email, sms, speak, text and integrate with your business systems.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Always In Control</h3>
                <p className="text-sm text-white/80">Your brand, your words, your assistant.</p>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="hidden lg:block">
            <p className="text-sm text-white/60 mb-4">Integrates seamlessly with</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-4 py-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400/50 shadow-lg">
                <span className="text-sm text-white font-medium">Instagram</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
                <span className="text-sm text-white font-medium">Facebook</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 flex items-center gap-2">
                <Phone size={16} className="text-green-400" />
                <span className="text-sm text-white font-medium">Phone</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-blue-400/20 border border-blue-400/30 flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" />
                <span className="text-sm text-white font-medium">SMS</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-green-400/20 border border-green-400/30">
                <span className="text-sm text-white font-medium">WhatsApp</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center gap-2">
                <Calendar size={16} className="text-orange-400" />
                <span className="text-sm text-white font-medium">Bokadirekt</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                <span className="text-sm text-white font-medium">ClinicBuddy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 bg-background/95 backdrop-blur-sm">
        <Card className="w-full max-w-md border-0 p-6 lg:p-8 shadow-2xl">
          {/* Card Header */}
          <div className="mb-4 text-center">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
              {step === "email" 
                ? "Get Started With Front Office"
                : step === "code"
                  ? "Enter Verification Code"
                  : isLogin 
                    ? "Welcome Back" 
                    : "Set Up Your Account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "email" 
                ? "Step 1 of 3: Create your personal login. You'll set up your business details after signing in."
                : step === "code"
                  ? "Step 2 of 3: Check your inbox and enter the 6-digit code we sent you"
                  : isLogin 
                    ? "Enter your credentials to access your Front Office dashboard" 
                    : "Step 2 of 3: Choose a secure password for your account"}
            </p>
          </div>

          {/* Email Step */}
          {step === "email" && (
            <form onSubmit={handleEmailContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 hover:ring-2 hover:ring-yellow-accent hover:ring-offset-2 transition-all"
                disabled={loading}
              >
                Continue
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setStep("auth");
                  }}
                  className="font-medium text-yellow-accent hover:text-yellow-accent/80 hover:underline transition-colors"
                  disabled={loading}
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* Auth Step - Login or Signup */}
          {step === "auth" && (
            <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-auth">Your Email (Admin Account)</Label>
                <Input
                  id="email-auth"
                  type="email"
                  placeholder="your.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Your Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus={isLogin}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 hover:ring-2 hover:ring-yellow-accent hover:ring-offset-2 transition-all"
                disabled={loading}
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          )}

          {/* Code Verification Step */}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 hover:ring-2 hover:ring-yellow-accent hover:ring-offset-2 transition-all"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Resend code
                </button>
              </div>
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
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
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

        {/* Testimonials Carousel - Below Card */}
        <div className="w-full max-w-md mt-6">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              <CarouselItem>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-accent text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "Our booking rate increased by 60% after switching to Front Office. Our digital assistant handles Instagram DMs, sms-es perfectly replying accurately!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                      💉
                    </div>
                    <div>
                      <p className="font-medium text-xs">Lisa Andersson</p>
                      <p className="text-[10px] text-muted-foreground">Stockholm Botox Clinic</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-accent text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "I love our digital assistant. It handles 80% of all incoming requests perfectly. And it send me summaries via text at the end of the day with my todos!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                      🦷
                    </div>
                    <div>
                      <p className="font-medium text-xs">Dr. Anna Bergström</p>
                      <p className="text-[10px] text-muted-foreground">Solna Dental Clinic</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-accent text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "Lots of AIs sound good but don't work. Front Office actually works as the assistant is flexible and trustworthy!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                      🏥
                    </div>
                    <div>
                      <p className="font-medium text-xs">Dr. Erik Johansson</p>
                      <p className="text-[10px] text-muted-foreground">HealthCare Plus</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>

          {/* Need Help Link */}
          <div className="text-center mt-4">
            <a 
              href="tel:+46707300605" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Need help? Call us at +46 70 730 06 05
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
