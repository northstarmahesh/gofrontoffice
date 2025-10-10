import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo-main.png";
import { CheckCircle, Building2, Phone as PhoneIcon, MessageSquare, Instagram, Chrome, Send, Calendar } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleBankIDLogin = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('signicat-oauth-start');
      
      if (error || !data?.authUrl) {
        console.error('BankID start error:', error);
        toast.error("Kunde inte starta BankID-inloggning. Försök igen.");
        setIsSubmitting(false);
        return;
      }
      
      sessionStorage.setItem('oauth_state', data.state);
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Något gick fel. Försök igen.");
      setIsSubmitting(false);
    }
  };

  const partners = [
    { name: "Instagram", icon: Instagram },
    { name: "WhatsApp", icon: MessageSquare },
    { name: "Telefon", icon: PhoneIcon },
    { name: "SMS", icon: Send },
    { name: "Messenger", icon: MessageSquare },
    { name: "Google", icon: Chrome },
    { name: "Microsoft", icon: Building2 },
    { name: "Bokadirekt", icon: Calendar },
    { name: "Fortnox", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-orange-400/60 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Orange glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-4xl space-y-12 relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo} alt="Front Office" className="h-24 md:h-28 w-auto" />
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-foreground leading-tight">
            Säg 👋 till Front Office din digitala assistant
          </h1>

          {/* Login Card */}
          <Card className="max-w-xl mx-auto shadow-2xl border-2 border-primary/20 bg-white">
            <CardContent className="p-10 md:p-12">
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold">Logga in med BankID</h2>
                  <p className="text-lg text-muted-foreground">
                    Säker inloggning för alla användare
                  </p>
                </div>
                
                <Button
                  type="button"
                  onClick={handleBankIDLogin}
                  className="w-full h-16 text-xl font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Startar BankID..." : "Logga in med BankID"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Partner Logos */}
          <div className="max-w-3xl mx-auto pt-8">
            <h3 className="text-center text-sm font-semibold text-muted-foreground mb-8">
              FrontOffice samarbetar med:
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-6 items-center justify-items-center">
              {partners.map((partner) => {
                const Icon = partner.icon;
                return (
                  <div
                    key={partner.name}
                    className="flex flex-col items-center gap-2 transition-all duration-300 hover:scale-110"
                  >
                    <div className="w-14 h-14 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md border border-primary/10">
                      <Icon className="text-primary" size={28} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{partner.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testimonial */}
          <div className="max-w-2xl mx-auto pt-4">
            <Card className="bg-white/90 backdrop-blur-sm border border-primary/20 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-lg">
                    SB
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-base italic text-foreground">
                      "Front Office har sparat oss så mycket tid. Vi kan nu fokusera på det vi är bäst på - att ta hand om våra kunder - medan allt administrativt sköts automatiskt. Otroligt värdefullt!"
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Sara Bergström</p>
                        <p className="text-sm text-muted-foreground">VD, Bella Clinic Stockholm</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className="w-4 h-4 fill-primary"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
