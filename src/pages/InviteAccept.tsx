import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/front-office-logo-updated.png";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError("Ogiltig inbjudningslänk");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('team_invitations')
        .select(`
          *,
          clinics!inner(name)
        `)
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Inbjudan kunde inte hittas");
        setLoading(false);
        return;
      }

      // Check if expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError("Denna inbjudan har gått ut");
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError("Denna inbjudan har redan använts");
        setLoading(false);
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  const handleBankIDAccept = async () => {
    setIsSubmitting(true);
    try {
      // Store invitation token in session storage for callback
      sessionStorage.setItem('invitation_token', token!);
      
      const { data, error } = await supabase.functions.invoke('signicat-oauth-start');
      
      if (error || !data?.authUrl) {
        console.error('BankID start error:', error);
        toast.error("Kunde inte starta BankID-inloggning. Försök igen.");
        setIsSubmitting(false);
        return;
      }
      
      sessionStorage.setItem('oauth_state', data.state);
      const url = data.authUrl as string;
      try {
        if (window.top && window.top !== window) {
          (window.top as Window).location.assign(url);
        } else {
          window.location.assign(url);
        }
      } catch {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Något gick fel. Försök igen.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-orange-400/60 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Laddar inbjudan...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-orange-400/60 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <img src={logo} alt="Front Office" className="h-20 w-auto" />
          </div>
          
          <Card className="border-2 border-destructive/20">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h2 className="text-xl font-semibold mb-2">Inbjudan ogiltlig</h2>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Button onClick={() => navigate('/auth')} className="mt-4">
                  Gå till startsidan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-orange-400/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <img src={logo} alt="Front Office" className="h-20 w-auto" />
        </div>

        <Card className="shadow-2xl border-2 border-primary/20 bg-white">
          <CardContent className="p-10">
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">Du är inbjuden! 🎉</h1>
                <p className="text-muted-foreground">
                  Du har blivit inbjuden att gå med i
                </p>
                <p className="text-xl font-semibold mt-2">{invitation?.clinics?.name}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Din roll:</p>
                <p className="font-semibold">
                  {invitation?.role === 'admin' ? 'Administratör' : 'Personal'}
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleBankIDAccept}
                  className="w-full h-14 text-lg font-semibold"
                  disabled={isSubmitting}
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/4/42/BankID_logo.svg" 
                    alt="BankID" 
                    className="h-5 mr-2 brightness-0 invert"
                  />
                  {isSubmitting ? "Startar BankID..." : "Acceptera med BankID"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Genom att acceptera kommer du att få tillgång till {invitation?.clinics?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InviteAccept;
