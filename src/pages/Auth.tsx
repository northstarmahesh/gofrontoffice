import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo-yellow-full.png";
import { CheckCircle2, Calendar, Building2, Mail, Phone as PhoneIcon, MessageSquare, Clock, CheckCircle, Instagram, Chrome, Send, CreditCard } from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  businessName: z.string().min(2, "Företagsnamn måste vara minst 2 tecken"),
  businessType: z.string().min(1, "Vänligen välj verksamhetstyp"),
  phone: z.string().optional(),
  additionalInfo: z.string().optional(),
});

const loginSchema = z.object({
  contact: z.string().min(1, "Vänligen ange e-post eller telefonnummer"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP måste vara 6 siffror"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'form' | 'otp' | 'booking' | 'success'>('form');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'bankid'>('email');
  const [contactInfo, setContactInfo] = useState('');
  const [countryCode, setCountryCode] = useState('+46');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    businessName: '',
    businessType: '',
    phone: '',
    additionalInfo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (loginMethod === 'bankid') {
        toast.info("BankID-integration kommer snart. Kontakta support för att aktivera denna funktion.");
        setIsSubmitting(false);
        return;
      }

      loginSchema.parse({ contact: contactInfo });
      
      if (loginMethod === 'email') {
        // Use custom edge function to send 6-digit code via Resend
        const { error } = await supabase.functions.invoke('send-email-verification', {
          body: { email: contactInfo }
        });

        if (error) {
          console.error('Error sending verification code:', error);
          throw new Error('Kunde inte skicka verifieringskod');
        }

        toast.success("Verifieringskod skickad till din e-post");
        setStep('otp');
      } else {
        const fullPhone = `${countryCode}${contactInfo}`;
        
        const { error } = await supabase.auth.signInWithOtp({
          phone: fullPhone,
          options: {
            shouldCreateUser: true,
          },
        });

        if (error) throw error;
        toast.success("Verifieringskod skickad till ditt telefonnummer");
        setStep('otp');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Login error:', error);
        toast.error("Något gick fel. Försök igen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      otpSchema.parse({ otp });
      
      if (loginMethod === 'email') {
        // Verify custom 6-digit code
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-email-otp', {
          body: { email: contactInfo, code: otp }
        });

        if (verifyError || !verifyResult?.verified) {
          toast.error("Ogiltig verifieringskod");
          setIsSubmitting(false);
          return;
        }

        // Now sign in the user with OTP (which will auto-create if needed due to auto-confirm)
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: contactInfo,
          options: {
            shouldCreateUser: true,
          }
        });

        if (signInError) throw signInError;
        
        toast.success("Inloggning lyckades!");
      } else {
        // Phone verification using Supabase's built-in OTP
        const { error } = await supabase.auth.verifyOtp({
          phone: `${countryCode}${contactInfo}`,
          token: otp,
          type: 'sms'
        });

        if (error) throw error;
        toast.success("Inloggning lyckades!");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('OTP verification error:', error);
        toast.error("Ogiltig verifieringskod");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = leadSchema.parse({
        email: formData.email,
        businessName: formData.businessName,
        businessType: formData.businessType,
        phone: formData.phone || undefined,
        additionalInfo: formData.additionalInfo || undefined,
      });

      const { error } = await supabase
        .from('onboarding_leads')
        .insert({
          email: validatedData.email,
          business_name: validatedData.businessName,
          business_type: validatedData.businessType,
          phone: validatedData.phone,
          additional_info: validatedData.additionalInfo,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("Denna e-postadress är redan registrerad");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Tack! Boka nu ditt onboarding-samtal");
      setStep('booking');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error('Error submitting lead:', error);
        toast.error("Något gick fel. Försök igen senare.");
      }
    } finally {
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
      { name: "Björn Lundén", icon: Building2, color: "teal" },
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
      partners[(currentIndex + 4) % partners.length],
    ];

    return (
      <div className="mt-8 pt-8 border-t border-white/20">
        <h3 className="text-center text-sm font-semibold text-white/60 mb-6">
          FrontOffice samarbetar med:
        </h3>
        <div className="flex gap-8 items-center justify-center overflow-hidden">
          {visiblePartners.map((partner, idx) => {
            const Icon = partner.icon;
            return (
              <div
                key={`${partner.name}-${idx}`}
                className="flex flex-col items-center gap-2 transition-all duration-500 ease-in-out"
                style={{
                  animation: "fadeInOut 2s ease-in-out infinite",
                }}
              >
                <div className={`w-12 h-12 rounded-lg bg-${partner.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`text-${partner.color}-400`} size={24} />
                </div>
                <span className="text-xs text-white/70">{partner.name}</span>
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
              "Front Office har sparat oss så mycket tid. Vi kan nu fokusera på det vi är bäst på medan AI hanterar kundkommunikationen. Otroligt värdefullt!"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Sara Bergström</p>
                <p className="text-xs text-muted-foreground">VD, Bella Clinic Stockholm</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-3 h-3 fill-primary" viewBox="0 0 20 20">
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
                  <svg key={star} className="w-3 h-3 fill-primary" viewBox="0 0 20 20">
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

  if (step === 'otp' && mode === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-12 w-auto object-contain mb-4"
            />
            <CardTitle className="text-2xl font-bold">Ange verifieringskod</CardTitle>
            <CardDescription>
              Vi har skickat en 6-siffrig kod till {loginMethod === 'email' ? contactInfo : `${countryCode}${contactInfo}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verifieringskod</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="h-11 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={isSubmitting || otp.length !== 6}
              >
                {isSubmitting ? "Verifierar..." : "Verifiera"}
              </Button>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">eller</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('signup');
                  setStep('form');
                  setOtp('');
                }}
              >
                Kom igång
              </Button>
              <Button 
                type="button" 
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('form');
                  setOtp('');
                }}
              >
                Tillbaka
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-green-500/20">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Tack!</CardTitle>
            <CardDescription className="text-lg">
              Vi har tagit emot din intresseanmälan och ser fram emot att träffa dig på ditt onboarding-samtal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Du kommer att få en bekräftelse via e-post med mer information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'booking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        <div className="bg-[hsl(var(--auth-bg))] text-white p-12 flex flex-col justify-center">
          <img 
            src={logo} 
            alt="Front Office" 
            className="h-16 w-auto object-contain mb-12"
          />
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Välkommen till Front Office
          </h1>
          <p className="text-2xl text-yellow-accent font-semibold mb-8">
            Ditt nya digitala team
          </p>

          <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-accent/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="text-yellow-accent" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Spara 5+ timmar per vecka</h3>
                  <p className="text-white/70">Låt AI hantera repetitiva frågor och administrativa uppgifter automatiskt</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Alla kanaler, ett ställe</h3>
                  <p className="text-white/70">Hantera WhatsApp, SMS, Instagram, Messenger och mycket mer från en enda plattform</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Du har full kontroll</h3>
                  <p className="text-white/70">Granska och godkänn alla AI-genererade svar innan de skickas till dina kunder</p>
                </div>
              </div>
            </div>

            <PartnerLogos />
          </div>

          <div className="flex items-center justify-center p-12">
            <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary/10">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center mb-2">
                  <img 
                    src={logo} 
                    alt="Front Office Logo" 
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Calendar className="h-6 w-6" />
                    Boka ditt onboarding-samtal
                  </CardTitle>
                  <CardDescription className="text-base">
                    Välj en tid som passar dig, så guidar vi dig genom hur Front Office kan förenkla din vardag och öka dina bokningar
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <iframe 
                  src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1CquC8x_Kjq5WnMC_alUbWUwnabOexZ5JOW7-iSuqFnZUSOuF2UioDrBm1xP5rIz0KQiosFnln?gv=true" 
                  style={{ border: 0 }} 
                  width="100%" 
                  height="600" 
                  frameBorder="0"
                  title="Book Onboarding Call"
                />
              </CardContent>
              <div className="p-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStep('success')}
                  className="w-full"
                >
                  Jag har bokat min tid
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="lg:hidden min-h-screen flex flex-col">
          <div className="bg-[hsl(var(--auth-bg))] text-white px-6 pt-6 pb-8">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-12 w-auto object-contain mb-6"
            />
            <h1 className="text-3xl font-bold mb-2 leading-tight">
              Boka ditt onboarding-samtal
            </h1>
            <p className="text-lg text-yellow-accent font-semibold mb-2">
              Vi hjälper dig komma igång med Front Office
            </p>
          </div>

          <div className="flex-1 bg-background rounded-t-3xl -mt-4 p-6">
            <Card className="w-full border-0 shadow-lg">
              <CardContent className="p-0">
                <iframe 
                  src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1CquC8x_Kjq5WnMC_alUbWUwnabOexZ5JOW7-iSuqFnZUSOuF2UioDrBm1xP5rIz0KQiosFnln?gv=true" 
                  style={{ border: 0 }} 
                  width="100%" 
                  height="600" 
                  frameBorder="0"
                  title="Book Onboarding Call"
                />
              </CardContent>
              <div className="p-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('success')}
                  className="w-full"
                >
                  Jag har bokat min tid
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--auth-bg))]">
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        <div className="bg-[hsl(var(--auth-bg))] text-white p-12 flex flex-col justify-center">
          <img 
            src={logo} 
            alt="Front Office" 
            className="h-16 w-auto object-contain mb-12"
          />
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Välkommen till Front Office
          </h1>
          <p className="text-2xl text-yellow-accent font-semibold mb-8">
            Din digitala assistent — tillgänglig dygnet runt, året runt
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-accent/20 flex items-center justify-center flex-shrink-0">
                <Clock className="text-yellow-accent" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Spara 5+ timmar per vecka</h3>
                <p className="text-white/70">Låt AI hantera repetitiva kundsamtal och administrativa uppgifter automatiskt</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Alla kanaler på ett ställe</h3>
                <p className="text-white/70">Hantera WhatsApp, SMS, Instagram, Messenger och mycket mer från en enda plattform</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Du har full kontroll</h3>
                <p className="text-white/70">Granska och godkänn alla AI-genererade svar innan de skickas till dina kunder</p>
              </div>
            </div>
          </div>

            <PartnerLogos />
          </div>

          <div className="flex items-center justify-center p-12 bg-gradient-to-br from-background/50 to-primary/5 flex-col gap-6">
            <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center mb-2">
                <img 
                  src={logo} 
                  alt="Front Office Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                <div className="space-y-4">
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-xl font-bold">Välkommen tillbaka</h3>
                    <p className="text-sm text-muted-foreground">
                      Logga in med e-post eller telefonnummer
                    </p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'phone' | 'bankid')}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="email">E-post</TabsTrigger>
                        <TabsTrigger value="phone">Telefon</TabsTrigger>
                        <TabsTrigger value="bankid">BankID</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="email" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            E-postadress
                          </Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="din@email.se"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            required
                            className="h-11"
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="phone" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-phone" className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4" />
                            Telefonnummer
                          </Label>
                          <div className="flex gap-2">
                            <Select value={countryCode} onValueChange={setCountryCode}>
                              <SelectTrigger className="w-[100px] h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="+46">🇸🇪 +46</SelectItem>
                                <SelectItem value="+47">🇳🇴 +47</SelectItem>
                                <SelectItem value="+45">🇩🇰 +45</SelectItem>
                                <SelectItem value="+358">🇫🇮 +358</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              id="login-phone"
                              type="tel"
                              placeholder="701234567"
                              value={contactInfo}
                              onChange={(e) => setContactInfo(e.target.value.replace(/\D/g, ''))}
                              required
                              className="h-11 flex-1"
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="bankid" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                              <CreditCard className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-semibold">Logga in med BankID</h4>
                              <p className="text-sm text-muted-foreground">
                                Säker och smidig inloggning med ditt svenska BankID
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Skickar..." : loginMethod === 'bankid' ? "Öppna BankID" : "Skicka verifieringskod"}
                    </Button>
                    <div className="text-center pt-4">
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Ny användare? <span className="font-semibold">Kom igång här</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-xl font-bold">Kom igång med Front Office</h3>
                    <p className="text-sm text-muted-foreground">
                      Fyll i dina uppgifter så hjälper vi dig att boka ett kostnadsfritt konsultationssamtal
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-postadress *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="din@email.se"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Företagsnamn *
                        </Label>
                        <Input
                          id="businessName"
                          type="text"
                          placeholder="Ditt företag"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessType" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Bransch *
                        </Label>
                        <Select 
                          value={formData.businessType} 
                          onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                          required
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Välj bransch" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="health">Hälsa & Vård</SelectItem>
                            <SelectItem value="beauty">Skönhet & Wellness</SelectItem>
                            <SelectItem value="retail">Handel & Detaljhandel</SelectItem>
                            <SelectItem value="automotive">Fordon & Bilhandel</SelectItem>
                            <SelectItem value="storage">Lager & Logistik</SelectItem>
                            <SelectItem value="professional">Professionella Tjänster</SelectItem>
                            <SelectItem value="hospitality">Hotell & Restaurang</SelectItem>
                            <SelectItem value="fitness">Träning & Sport</SelectItem>
                            <SelectItem value="education">Utbildning</SelectItem>
                            <SelectItem value="other">Annat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4" />
                          Telefonnummer
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+46 70 123 45 67"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="additionalInfo">
                          Ytterligare information
                        </Label>
                        <Textarea
                          id="additionalInfo"
                          placeholder="Berätta gärna lite mer om dina behov..."
                          value={formData.additionalInfo}
                          onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                          className="min-h-[100px] resize-none"
                        />
                      </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Skickar..." : "Boka ett gratis konsultation"}
                    </Button>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Har du redan ett konto? <span className="font-semibold">Logga in här</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="w-full max-w-md">
            <TestimonialSection />
          </div>
        </div>
      </div>

      <div className="lg:hidden min-h-screen flex flex-col">
          <div className="bg-[hsl(var(--auth-bg))] text-white px-6 pt-6 pb-8">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-12 w-auto object-contain mb-6"
            />
          <h1 className="text-2xl font-bold mb-2 leading-tight">
            {mode === 'login' ? 'Välkommen tillbaka' : 'Kom igång med Front Office'}
          </h1>
          <p className="text-base text-yellow-accent font-semibold">
            {mode === 'login' ? 'Logga in för att fortsätta' : 'Din digitala assistent — tillgänglig dygnet runt'}
          </p>
        </div>

        <div className="flex-1 bg-background rounded-t-3xl -mt-4 p-6">
          <Card className="w-full border-0 shadow-none">
            <CardContent className="p-0">
              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'phone' | 'bankid')}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="email">E-post</TabsTrigger>
                      <TabsTrigger value="phone">Telefon</TabsTrigger>
                      <TabsTrigger value="bankid">BankID</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="email" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="mobile-login-email">E-postadress</Label>
                        <Input
                          id="mobile-login-email"
                          type="email"
                          placeholder="din@email.se"
                          value={contactInfo}
                          onChange={(e) => setContactInfo(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="phone" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="mobile-login-phone">Telefonnummer</Label>
                        <div className="flex gap-2">
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-[100px] h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+46">🇸🇪 +46</SelectItem>
                              <SelectItem value="+47">🇳🇴 +47</SelectItem>
                              <SelectItem value="+45">🇩🇰 +45</SelectItem>
                              <SelectItem value="+358">🇫🇮 +358</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="mobile-login-phone"
                            type="tel"
                            placeholder="701234567"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value.replace(/\D/g, ''))}
                            required
                            className="h-11 flex-1"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="bankid" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4 py-8">
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-10 w-10 text-primary" />
                          </div>
                          <div className="text-center space-y-2">
                            <h4 className="font-semibold">Logga in med BankID</h4>
                            <p className="text-sm text-muted-foreground">
                              Säker och smidig inloggning med ditt svenska BankID
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Skickar..." : loginMethod === 'bankid' ? "Öppna BankID" : "Skicka verifieringskod"}
                  </Button>
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Ny användare? <span className="font-semibold">Kom igång här</span>
                    </button>
                  </div>
                </form>
              ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile-email">E-postadress *</Label>
                      <Input
                        id="mobile-email"
                        type="email"
                        placeholder="din@email.se"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-businessName">Företagsnamn *</Label>
                      <Input
                        id="mobile-businessName"
                        type="text"
                        placeholder="Ditt företag"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-businessType">Bransch *</Label>
                      <Select 
                        value={formData.businessType} 
                        onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                        required
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Välj bransch" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="health">Hälsa & Vård</SelectItem>
                          <SelectItem value="beauty">Skönhet & Wellness</SelectItem>
                          <SelectItem value="retail">Handel & Detaljhandel</SelectItem>
                          <SelectItem value="automotive">Fordon & Bilhandel</SelectItem>
                          <SelectItem value="storage">Lager & Logistik</SelectItem>
                          <SelectItem value="professional">Professionella Tjänster</SelectItem>
                          <SelectItem value="hospitality">Hotell & Restaurang</SelectItem>
                          <SelectItem value="fitness">Träning & Sport</SelectItem>
                          <SelectItem value="education">Utbildning</SelectItem>
                          <SelectItem value="other">Annat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-phone">Telefonnummer</Label>
                      <Input
                        id="mobile-phone"
                        type="tel"
                        placeholder="+46 70 123 45 67"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-additionalInfo">Ytterligare information</Label>
                      <Textarea
                        id="mobile-additionalInfo"
                        placeholder="Berätta gärna lite mer om dina behov..."
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                        className="min-h-[100px] resize-none"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Skickar..." : "Boka ett gratis konsultation"}
                    </Button>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Har du redan ett konto? <span className="font-semibold">Logga in här</span>
                      </button>
                    </div>
                  </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
