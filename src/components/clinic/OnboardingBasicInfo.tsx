import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, CheckCircle2, Lock } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface OnboardingBasicInfoProps {
  onComplete: (clinicId: string) => void;
}

export const OnboardingBasicInfo = ({ onComplete }: OnboardingBasicInfoProps) => {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    address: "",
    timezone: "Europe/Stockholm",
  });
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLocked, setAddressLocked] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Debounced address search
  useEffect(() => {
    if (!addressQuery || addressLocked) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            addressQuery
          )}&limit=5`
        );
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (error) {
        console.error("Address search error:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addressQuery, addressLocked]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      // Pre-fill email from user's email and mark as verified if it matches
      const userEmail = user.email || "";
      setFormData(prev => ({ ...prev, email: userEmail }));
      // If using their auth email, consider it verified
      setIsEmailVerified(true);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-verification', {
        body: { email: formData.email }
      });

      if (error) throw error;

      setShowCodeInput(true);
      toast.success("Verification code sent to your email");
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email: formData.email, code }
      });

      if (error) throw error;

      if (data?.verified) {
        setIsEmailVerified(true);
        toast.success("Email verified successfully!");
      } else {
        toast.error("Invalid or expired code");
        setVerificationCode("");
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Failed to verify code");
      setVerificationCode("");
    }
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    // Reset verification if email changes and it's not the auth email
    if (email !== currentUser?.email) {
      setIsEmailVerified(false);
      setShowCodeInput(false);
      setVerificationCode("");
    } else {
      setIsEmailVerified(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailVerified) {
      toast.error("Please verify your email address");
      return;
    }

    setLoading(true);

    try {
      // Create new clinic (trigger automatically adds user as owner)
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .insert(formData)
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create default location
      const { error: locationError } = await supabase
        .from("clinic_locations")
        .insert({
          clinic_id: clinic.id,
          name: "Main Location",
          address: formData.address,
          admin_email: formData.email,
        });

      if (locationError) console.error("Error creating location:", locationError);

      toast.success("Clinic profile created!");
      onComplete(clinic.id);
    } catch (error: any) {
      console.error("Error creating clinic:", error);
      toast.error(error.message || "Failed to create clinic");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, slug });
  };

  const handleAddressSelect = (suggestion: any) => {
    const fullAddress = suggestion.display_name;
    setFormData({ ...formData, address: fullAddress });
    setAddressQuery(fullAddress);
    setAddressLocked(true);
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Clinic Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={generateSlug}
            required
            placeholder="Main Office, Downtown Branch, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="address"
                value={addressLocked ? formData.address : addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  if (!addressLocked) {
                    setFormData({ ...formData, address: e.target.value });
                  }
                }}
                onFocus={() => {
                  if (!addressLocked && addressQuery) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Start typing an address..."
                disabled={addressLocked}
                className={`pl-10 ${addressLocked ? "opacity-75" : ""}`}
              />
              {addressLocked && (
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {showSuggestions && addressSuggestions.length > 0 && !addressLocked && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAddressSelect(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {addressLocked && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setAddressLocked(false);
                setAddressQuery(formData.address);
              }}
              className="h-auto py-0 px-0 text-xs"
            >
              Unlock to edit
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Full address helps patients find your clinic
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Admin Email *</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                placeholder="admin@example.com"
                disabled={isEmailVerified}
              />
              {isEmailVerified && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            {!isEmailVerified && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendVerificationCode}
                disabled={sendingCode || !formData.email}
              >
                {sendingCode ? "Sending..." : "Send Code"}
              </Button>
            )}
          </div>

          {showCodeInput && !isEmailVerified && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="code">Enter 6-digit code</Label>
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => {
                  setVerificationCode(value);
                  if (value.length === 6) {
                    handleVerifyCode(value);
                  }
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleSendVerificationCode}
                disabled={sendingCode}
                className="h-auto p-0"
              >
                Resend code
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {isEmailVerified 
              ? "Email verified. This will be the primary admin contact for your clinic." 
              : "We'll send a verification code to confirm this email. You can change this later in settings."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          >
            <option value="Europe/Stockholm">Stockholm (Europe/Stockholm)</option>
            <option value="Europe/London">London (Europe/London)</option>
            <option value="Europe/Paris">Paris (Europe/Paris)</option>
            <option value="Europe/Berlin">Berlin (Europe/Berlin)</option>
            <option value="Europe/Rome">Rome (Europe/Rome)</option>
            <option value="Europe/Madrid">Madrid (Europe/Madrid)</option>
            <option value="Europe/Amsterdam">Amsterdam (Europe/Amsterdam)</option>
            <option value="America/New_York">New York (Eastern Time)</option>
            <option value="America/Chicago">Chicago (Central Time)</option>
            <option value="America/Denver">Denver (Mountain Time)</option>
            <option value="America/Los_Angeles">Los Angeles (Pacific Time)</option>
            <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
            <option value="Asia/Dubai">Dubai (Asia/Dubai)</option>
            <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
          </select>
        </div>

        {/* Hidden slug field - auto-generated */}
        <input type="hidden" value={formData.slug} />
      </div>

      <Button type="submit" disabled={loading || !isEmailVerified} className="w-full" size="lg">
        {loading ? "Creating..." : "Continue"}
      </Button>
    </form>
  );
};
