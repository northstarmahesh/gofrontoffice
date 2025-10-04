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
import logo from "@/assets/front-office-logo.png";
import { Instagram, Facebook, Phone, MessageSquare, Calendar } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "auth" | "code">("email");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

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

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      // Check if user exists by attempting to sign in with a dummy password
      // This will fail but give us an error message that indicates if user exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-check',
      });

      // "Invalid login credentials" means user exists but wrong password
      // "Email not confirmed" also means user exists
      // Any other error likely means user doesn't exist
      if (error) {
        const userExists = error.message.includes('Invalid login credentials') || 
                          error.message.includes('Email not confirmed');
        setIsLogin(userExists);
      }
    } catch (error) {
      // Default to signup if check fails
      setIsLogin(false);
    } finally {
      setLoading(false);
      setStep("auth");
    }
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

  const handleSendCode = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      toast.success("Check your email for the verification code!");
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
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email',
      });

      if (error) throw error;

      toast.success("Successfully verified! Redirecting...");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--auth-bg))] flex flex-col lg:flex-row">
      {/* Mobile Header - Visible only on mobile */}
      <div className="lg:hidden bg-[hsl(var(--auth-bg))] text-white p-6 text-center">
        <img 
          src={logo} 
          alt="Front Office" 
          className="mx-auto mb-4 h-10 w-auto brightness-0 invert"
        />
        <h1 className="text-lg font-bold mb-2">
          Meet Your New Digital Assistant: <span className="text-yellow-300">Always On. No Vacation Needed.</span>
        </h1>
        <p className="text-xs text-white/80">Save 5+ hours weekly • All channels • Always in control</p>
      </div>

      {/* Left Column - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 xl:p-12 text-white">
        <div className="max-w-xl">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-12 w-auto mb-6 brightness-0 invert"
            />
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl xl:text-4xl font-bold mb-6 leading-tight">
            Meet Your New Digital Assistant:{" "}
            <span className="text-yellow-300">Always On. No Vacation Needed.</span>
          </h1>

          {/* Benefits */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl flex-shrink-0">
                ⏰
              </div>
              <div>
                <h3 className="text-base font-semibold mb-0.5">Save 5+ Hours/Week</h3>
                <p className="text-xs text-white/80">No more boring admin tasks - focus on what matters.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl flex-shrink-0">
                💬
              </div>
              <div>
                <h3 className="text-base font-semibold mb-0.5">All Channels, One Place</h3>
                <p className="text-xs text-white/80">Phone, SMS, WhatsApp, Instagram, and Facebook in one dashboard.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl flex-shrink-0">
                🎯
              </div>
              <div>
                <h3 className="text-base font-semibold mb-0.5">Always in Control</h3>
                <p className="text-xs text-white/80">Choose between co-pilot or auto-pilot modes to control how your assistant responds.</p>
              </div>
            </div>
          </div>

          {/* Integrations - Animated Ticker */}
          <div className="mb-6 overflow-hidden">
            <p className="text-xs text-white/60 mb-3 text-center">Integrates seamlessly with</p>
            <div className="relative">
              <div className="flex animate-[scroll_20s_linear_infinite] gap-6">
                {/* First set */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Instagram size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Phone size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                    <span className="text-xs text-white font-semibold">WhatsApp</span>
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                    <Calendar size={18} className="text-white mr-1.5" />
                    <span className="text-xs text-white font-semibold">Bokadirekt</span>
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                    <span className="text-xs text-white font-semibold">ClinicBuddy</span>
                  </div>
                </div>
                {/* Duplicate set for seamless loop */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Instagram size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Phone size={20} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                    <span className="text-xs text-white font-semibold">WhatsApp</span>
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                    <Calendar size={18} className="text-white mr-1.5" />
                    <span className="text-xs text-white font-semibold">Bokadirekt</span>
                  </div>
                  <div className="w-auto px-4 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                    <span className="text-xs text-white font-semibold">ClinicBuddy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Column - Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-background/95 backdrop-blur-sm min-h-[calc(100vh-200px)] lg:min-h-screen">
        <Card className="w-full max-w-md border-0 p-6 lg:p-8 shadow-2xl">
          {/* Mobile Logo - Removed as it's now in mobile header */}

          {/* Card Header */}
          <div className="mb-4 text-center">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
              {step === "email" 
                ? "Get Started" 
                : step === "code"
                  ? "Enter Verification Code"
                  : isLogin 
                    ? "Welcome Back" 
                    : "Create Account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "email" 
                ? "Start your journey to better patient engagement" 
                : step === "code"
                  ? "Check your email for the 6-digit code"
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
                    onClick={handleSendCode}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Or send me a code
                  </button>
                </div>
              )}
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
                className="w-full"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Resend code
                </button>
                <div>
                  <button
                    onClick={() => {
                      setStep("auth");
                      setVerificationCode("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    ← Use password instead
                  </button>
                </div>
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

        {/* Testimonials Carousel - Subtle */}
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
                      <span key={i} className="text-yellow-500 text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "We've saved over 25 hours per week since implementing Front Office. Our AI assistant handles appointment bookings flawlessly."
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
                      <span key={i} className="text-yellow-500 text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "Our booking rate increased by 60% after switching to Front Office. The AI handles Instagram DMs and Facebook messages perfectly."
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
                      <span key={i} className="text-yellow-500 text-xs">⭐</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    "The co-pilot mode is brilliant. Our team gets AI suggestions for complex cases, and the system handles routine inquiries automatically."
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
