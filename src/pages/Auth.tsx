import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo-white-full.png";
import frontOfficeLogo from "@/assets/front-office-logo-auth.png";
import { CheckCircle2, Calendar, Building2, Mail, Phone as PhoneIcon, MessageSquare, Clock, Target, Instagram as InstagramIcon, CheckCircle } from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  businessName: z.string().min(2, "Företagsnamn måste vara minst 2 tecken"),
  businessType: z.string().min(1, "Vänligen välj verksamhetstyp"),
  phone: z.string().optional(),
  additionalInfo: z.string().optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'booking' | 'success'>('form');
  const [formData, setFormData] = useState({
    email: '',
    businessName: '',
    businessType: '',
    phone: '',
    additionalInfo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in - redirect to main app
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      const validatedData = leadSchema.parse({
        email: formData.email,
        businessName: formData.businessName,
        businessType: formData.businessType,
        phone: formData.phone || undefined,
        additionalInfo: formData.additionalInfo || undefined,
      });

      // Submit to database
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
        if (error.code === '23505') { // Unique constraint violation
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

  // Success screen
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

  // Booking screen
  if (step === 'booking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
          {/* Left side - Branding */}
          <div className="bg-[hsl(var(--auth-bg))] text-white p-12 flex flex-col justify-center">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-16 w-auto mb-12"
            />
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Välkommen till Front Office
            </h1>
            <p className="text-2xl text-yellow-accent font-semibold mb-8">
              Ditt nya digitala team
            </p>
            <p className="text-lg text-white/80 mb-12">
              Vi hjälper dig att automatisera kundkommunikation och öka dina bokningar — helt på autopilot. Spara tid, minska stress och förbättra kundupplevelsen med vår AI-drivna assistent.
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
                  <div className="flex gap-3 mt-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <MessageSquare className="text-green-400" size={16} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="text-blue-400" size={16} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <InstagramIcon className="text-pink-400" size={16} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <MessageSquare className="text-indigo-400" size={16} />
                    </div>
                  </div>
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
          </div>

          {/* Right side - Booking */}
          <div className="flex items-center justify-center p-12">
            <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary/10">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center mb-2">
                  <img 
                    src={frontOfficeLogo} 
                    alt="Front Office Logo" 
                    className="h-12 w-auto"
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
                  onClick={() => {
                    setStep('success');
                  }}
                  className="w-full"
                >
                  Jag har bokat min tid
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden min-h-screen flex flex-col">
          <div className="bg-[hsl(var(--auth-bg))] text-white px-6 pt-6 pb-8">
            <img 
              src={logo} 
              alt="Front Office" 
              className="h-14 w-auto mb-6"
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

  // Form screen
  return (
    <div className="min-h-screen bg-[hsl(var(--auth-bg))]">
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        {/* Left side - Branding */}
        <div className="bg-[hsl(var(--auth-bg))] text-white p-12 flex flex-col justify-center">
          <img 
            src={logo} 
            alt="Front Office" 
            className="h-16 w-auto mb-12"
          />
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Välkommen till Front Office
          </h1>
          <p className="text-2xl text-yellow-accent font-semibold mb-8">
            Din digitala assistent — tillgänglig dygnet runt, året runt
          </p>
          <p className="text-lg text-white/80 mb-12">
            Vi onboardar för närvarande kunder manuellt för att säkerställa att du får den bästa möjliga upplevelsen från dag ett. Låt oss hjälpa dig komma igång.
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
                <p className="text-white/70 flex items-center gap-2 flex-wrap">
                  Hantera WhatsApp, SMS, Instagram, Messenger och mycket mer från en enda plattform
                </p>
                <div className="flex gap-3 mt-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <MessageSquare className="text-green-400" size={16} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="text-blue-400" size={16} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <InstagramIcon className="text-pink-400" size={16} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <MessageSquare className="text-indigo-400" size={16} />
                  </div>
                </div>
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
        </div>

        {/* Right side - Form */}
        <div className="flex items-center justify-center p-12 bg-gradient-to-br from-background/50 to-primary/5">
          <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center mb-2">
                <img 
                  src={frontOfficeLogo} 
                  alt="Front Office Logo" 
                  className="h-12 w-auto"
                />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">
                  Kom igång med Front Office
                </CardTitle>
                <CardDescription className="text-base">
                  Fyll i dina uppgifter nedan så hjälper vi dig att boka ett kostnadsfritt konsultationssamtal
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
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
                  <Label htmlFor="businessType">Verksamhetstyp *</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                    required
                  >
                  <SelectTrigger id="businessType" className="h-11">
                      <SelectValue placeholder="Välj typ av verksamhet" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="hälsa-vård">Hälsa & Vård</SelectItem>
                      <SelectItem value="skönhet-wellness">Skönhet & Wellness</SelectItem>
                      <SelectItem value="handel-detaljhandel">Handel & Detaljhandel</SelectItem>
                      <SelectItem value="fordon-bilhandel">Fordon & Bilhandel</SelectItem>
                      <SelectItem value="fastighet-förvaltning">Fastighet & Förvaltning</SelectItem>
                      <SelectItem value="personliga-tjänster">Personliga tjänster</SelectItem>
                      <SelectItem value="professionella-tjänster">Professionella tjänster</SelectItem>
                      <SelectItem value="mat-dryck">Mat & Dryck</SelectItem>
                      <SelectItem value="utbildning-träning">Utbildning & Träning</SelectItem>
                      <SelectItem value="annat">Annat</SelectItem>
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
                  <Label htmlFor="additionalInfo">Övrig information</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Berätta gärna lite mer om din verksamhet och dina behov..."
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Skickar..." : "Boka ett gratis konsultation"}
                </Button>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Genom att skicka detta formulär godkänner du att vi kontaktar dig angående Front Office.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-[hsl(var(--auth-bg))] text-white px-6 pt-6 pb-8">
          <img 
            src={logo} 
            alt="Front Office" 
            className="h-14 w-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-2 leading-tight">
            Välkommen till Front Office
          </h1>
          <p className="text-base text-yellow-accent font-semibold mb-1">
            Din digitala assistent — dygnet runt
          </p>
          <p className="text-sm text-white/80 mb-4">
            Automatisera kundkommunikation och spara tid varje dag
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-accent/20 flex items-center justify-center mb-2">
                <Clock className="text-yellow-accent" size={20} />
              </div>
              <p className="text-xs font-semibold leading-tight">Spara 5+ timmar</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center mb-2">
                <MessageSquare className="text-blue-400" size={20} />
              </div>
              <p className="text-xs font-semibold leading-tight">Alla kanaler</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center mb-2">
                <CheckCircle className="text-purple-400" size={20} />
              </div>
              <p className="text-xs font-semibold leading-tight">Full kontroll</p>
            </div>
          </div>
          
          {/* Channel logos */}
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <MessageSquare className="text-green-400" size={14} />
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="text-blue-400" size={14} />
            </div>
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <InstagramIcon className="text-pink-400" size={14} />
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <MessageSquare className="text-indigo-400" size={14} />
            </div>
          </div>
        </div>

        <div className="flex-1 bg-background rounded-t-3xl -mt-4 p-6">
          <Card className="w-full border-0 shadow-lg bg-card p-6 rounded-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold mb-2">Kom igång</h2>
              <p className="text-sm text-muted-foreground">
                Fyll i dina uppgifter nedan så hjälper vi dig att boka ett kostnadsfritt konsultationssamtal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-mobile">E-postadress *</Label>
                <Input
                  id="email-mobile"
                  type="email"
                  placeholder="din@email.se"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName-mobile">Företagsnamn *</Label>
                <Input
                  id="businessName-mobile"
                  type="text"
                  placeholder="Ditt företag"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType-mobile">Verksamhetstyp *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                  required
                >
                  <SelectTrigger id="businessType-mobile">
                    <SelectValue placeholder="Välj typ" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="hälsa-vård">Hälsa & Vård</SelectItem>
                    <SelectItem value="skönhet-wellness">Skönhet & Wellness</SelectItem>
                    <SelectItem value="handel-detaljhandel">Handel & Detaljhandel</SelectItem>
                    <SelectItem value="fordon-bilhandel">Fordon & Bilhandel</SelectItem>
                    <SelectItem value="fastighet-förvaltning">Fastighet & Förvaltning</SelectItem>
                    <SelectItem value="personliga-tjänster">Personliga tjänster</SelectItem>
                    <SelectItem value="professionella-tjänster">Professionella tjänster</SelectItem>
                    <SelectItem value="mat-dryck">Mat & Dryck</SelectItem>
                    <SelectItem value="utbildning-träning">Utbildning & Träning</SelectItem>
                    <SelectItem value="annat">Annat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-mobile">Telefonnummer</Label>
                <Input
                  id="phone-mobile"
                  type="tel"
                  placeholder="+46 70 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo-mobile">Övrig information</Label>
                <Textarea
                  id="additionalInfo-mobile"
                  placeholder="Berätta gärna om din verksamhet..."
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Skickar..." : "Boka ett gratis konsultation"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Genom att skicka detta formulär godkänner du att vi kontaktar dig angående Front Office
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;