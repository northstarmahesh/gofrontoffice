import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumberId: string;
  phoneNumber: string;
  onVerified: () => void;
}

export const PhoneVerificationDialog = ({
  open,
  onOpenChange,
  phoneNumberId,
  phoneNumber,
  onVerified,
}: PhoneVerificationDialogProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Automatically send code when dialog opens
  useEffect(() => {
    if (open && !codeSent) {
      handleSendCode();
    }
  }, [open]);

  const handleSendCode = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-otp", {
        body: { phoneNumberId },
      });

      if (error) throw error;
      setCodeSent(true);
      
      // Show dev code in toast for testing
      if (data?.devCode) {
        toast.success(`Code sent to ${phoneNumber}! Dev code: ${data.devCode}`, { duration: 10000 });
      } else {
        toast.success("Verification code sent to " + phoneNumber);
      }
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phoneNumberId, code },
      });

      if (error) throw error;

      toast.success("Phone number verified!");
      onVerified();
      onOpenChange(false);
      setCode("");
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Phone Number</DialogTitle>
          <DialogDescription>
            We'll send a verification code to {phoneNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending verification code...
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSendCode}
              disabled={sending}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Code"
              )}
            </Button>

            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6 || sending}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};