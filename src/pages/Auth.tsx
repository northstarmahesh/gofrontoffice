import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo-main.png";
import { CheckCircle2, Building2, Phone as PhoneIcon, MessageSquare, Clock, CheckCircle, Instagram, Chrome, Send, Calendar } from "lucide-react";

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
      // Call edge function to get BankID auth URL
      const { data, error } = await supabase.functions.invoke('signicat-oauth-start');
      
      if (error || !data?.authUrl) {
        console.error('BankID start error:', error);
        toast.error("Kunde inte starta BankID-inloggning. Försök igen.");
        setIsSubmitting(false);
        return;
      }
      
      // Store state for CSRF protection
      sessionStorage.setItem('oauth_state', data.state);
      
      // Redirect to Signicat BankID
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Något gick fel. Försök igen.");
      setIsSubmitting(false);
    }
  };

  const PartnerLogos = () => {
    const partners = [
      { name: "Instagram", icon: Instagram, color: "pink" },
      { name: "WhatsApp", icon: MessageSquare, color: "green" },
      { name: "Telefon", icon: PhoneIcon, color: "blue" },
      { name: "SMS", icon: Send, color: "indigo" },
      { name: "Messenger", icon: MessageSquare, color: "blue-600" },
      { name: "Google", icon: Chrome, color: "yellow" },
      { name: "Microsoft", icon: Building2, color: "blue-400" },
      { name: "Bokadirekt", icon: Calendar, color: "purple" },
      { name: "Fortnox", icon: Building2, color: "orange" },
      { name: "Björn Lundén", icon: Building2, color: "teal" }
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % partners.length);
      }, 2000);
      return () => clearInterval(interval);
    }, [partners.length]);

    const visiblePartners = [
      partners[currentIndex],
      partners[(currentIndex + 1) % partners.length],
      partners[(currentIndex + 2) % partners.length],
      partners[(currentIndex + 3) % partners.length],
      partners[(currentIndex + 4) % partners.length]
    ];

    return (
      <div className="mt-8 pt-8 border-t border-border/20">
        <h3 className="text-center text-sm font-semibold text-muted-foreground mb-6">
          FrontOffice samarbetar med:
        </h3>
        <div className="flex gap-8 items-center justify-center overflow-hidden">
          {visiblePartners.map((partner, idx) => {
            const Icon = partner.icon;
            return (
              <div
                key={`${partner.name}-${idx}`}
                className="flex flex-col items-center gap-2 transition-all duration-500 ease-in-out"
                style={{ animation: "fadeInOut 2s ease-in-out infinite" }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="text-primary" size={24} />
                </div>
                <span className="text-xs text-muted-foreground">{partner.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TestimonialSection = () => (
    <div className="mt-6 space-y-4">
      <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
            SB
          </div>
          <div className="flex-1">
            <p className="text-sm mb-2 italic text-muted-foreground">
              "Front Office har sparat oss så mycket tid. Vi kan nu fokusera på det vi är bäst på - att ta hand om våra kunder - medan allt administrativt sköts automatiskt. Otroligt värdefullt!"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Sara Bergström</p>
                <p className="text-xs text-muted-foreground">VD, Bella Clinic Stockholm</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-3 h-3 fill-primary"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
            ME
          </div>
          <div className="flex-1">
            <p className="text-sm mb-2 italic text-muted-foreground">
              "Implementeringen var super smidig. Personlig support hela vägen och vi såg resultat redan första veckan!"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Marcus Eriksson</p>
                <p className="text-xs text-muted-foreground">Grundare, Nordic Wellness</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-3 h-3 fill-primary"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Promotional Content with Orange Gradient */}
        <div className="w-1/2 bg-gradient-to-br from-primary via-primary-light to-primary-glow flex flex-col justify-center items-center p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          
          <div className="relative z-10 max-w-lg space-y-8">
            <div className="flex justify-center mb-8">
              <img src={logo} alt="Front Office" className="h-16 w-auto" />
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight">
                Kundtjänst utan arbetsgivaravgifter
              </h1>
              
              <p className="text-xl text-white/90">
                Svarar på samtal, sms, mejl och sociala medier 24/7
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Alla kanaler. En assistent.</p>
                    <p className="text-sm text-white/80">Samtal, SMS, mejl, livechatt och sociala medier</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Bokningar direkt i din kalender</p>
                    <p className="text-sm text-white/80">Automatisk synkronisering med dina system</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Godkänn utkast eller låt den skicka automatiskt</p>
                    <p className="text-sm text-white/80">Du behåller kontrollen</p>
                  </div>
                </div>
              </div>
            </div>

            <TestimonialSection />
            <PartnerLogos />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 bg-white flex items-center justify-center p-12">
          <Card className="w-full max-w-md shadow-xl border-2">
            <CardHeader className="text-center space-y-4 px-6 pt-10 pb-6">
              <CardTitle className="text-3xl font-bold">Logga in med BankID</CardTitle>
              <CardDescription className="text-base">
                Säker inloggning för alla användare
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-10">
              <div className="space-y-6">
                <Button
                  type="button"
                  onClick={handleBankIDLogin}
                  className="w-full h-14 text-lg font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Startar BankID..." : "Logga in med BankID"}
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  Använd din mobila BankID-app för att identifiera dig säkert
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-gradient-to-br from-primary via-primary-light to-primary-glow flex flex-col">
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-white">
          <div className="w-full max-w-md space-y-6">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Front Office" className="h-12 w-auto" />
            </div>

            <Card className="w-full shadow-xl border-2 bg-white">
              <CardHeader className="text-center space-y-3 px-4 pt-8 pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">Logga in med BankID</CardTitle>
                <CardDescription className="text-sm">
                  Säker inloggning för alla användare
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-8">
                <div className="space-y-4">
                  <Button
                    type="button"
                    onClick={handleBankIDLogin}
                    className="w-full h-12 text-base font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Startar BankID..." : "Logga in med BankID"}
                  </Button>
                  
                  <div className="text-center text-xs text-muted-foreground">
                    Använd din mobila BankID-app för att identifiera dig säkert
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 pt-4">
              <h2 className="text-2xl font-bold text-center">
                Kundtjänst utan arbetsgivaravgifter
              </h2>
              
              <p className="text-center text-white/90">
                Svarar på samtal, sms, mejl och sociala medier 24/7
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Alla kanaler. En assistent.</p>
                    <p className="text-white/80">Samtal, SMS, mejl, livechatt och sociala medier</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Bokningar direkt i din kalender</p>
                    <p className="text-white/80">Automatisk synkronisering med dina system</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Godkänn utkast eller låt den skicka automatiskt</p>
                    <p className="text-white/80">Du behåller kontrollen</p>
                  </div>
                </div>
              </div>
            </div>

            <TestimonialSection />
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
