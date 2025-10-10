import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TeamInvitationDialogProps {
  clinicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export const TeamInvitationDialog = ({ clinicId, open, onOpenChange, onInviteSent }: TeamInvitationDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [permissions, setPermissions] = useState({
    can_manage_integrations: false,
    can_edit_prompts: false,
    can_toggle_assistant: false,
    can_change_ai_mode: false,
    can_edit_schedule: false,
    can_view_billing: false,
    can_manage_team: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("E-postadress är obligatorisk");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        toast.error("Du måste vara inloggad");
        return;
      }

      // Create invitation token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          clinic_id: clinicId,
          email: email.trim(),
          phone: phone.trim() || null,
          personal_number: personalNumber.trim() || null,
          role,
          permissions,
          token,
          expires_at: expiresAt.toISOString(),
          invited_by: currentUser.user.id,
        });

      if (inviteError) throw inviteError;

      // Get the newly created invitation
      const { data: newInvitation } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('token', token)
        .single();

      if (newInvitation) {
        // Send invitation email via edge function
        const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
          body: { invitationId: newInvitation.id },
        });

        if (emailError) {
          console.error("Error sending invitation email:", emailError);
          toast.warning("Inbjudan skapad men e-post kunde inte skickas");
        } else {
          toast.success("Inbjudan skickad!");
        }
      }
      
      // Reset form
      setEmail("");
      setPhone("");
      setPersonalNumber("");
      setRole("staff");
      setPermissions({
        can_manage_integrations: false,
        can_edit_prompts: false,
        can_toggle_assistant: false,
        can_change_ai_mode: false,
        can_edit_schedule: false,
        can_view_billing: false,
        can_manage_team: false,
      });
      
      onInviteSent();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error("Kunde inte skicka inbjudan. Försök igen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bjud in teammedlem</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground">BankID rekommenderas</span> för snabbast onboarding. Fyll i personnummer för smidigast process.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                E-postadress <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="namn@example.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalNumber">Personnummer (rekommenderat för BankID)</Label>
              <Input
                id="personalNumber"
                type="text"
                placeholder="ÅÅÅÅMMDD-XXXX"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Gör inloggningen med BankID snabbare</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+46 70 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Roll</Label>
              <Select value={role} onValueChange={(value: "admin" | "staff") => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Personal</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "staff" && (
            <div className="space-y-3 border-t pt-4">
              <Label>Behörigheter</Label>
              <div className="space-y-3">
                {[
                  { key: 'can_manage_integrations', label: 'Hantera integrationer' },
                  { key: 'can_edit_prompts', label: 'Redigera AI-prompter' },
                  { key: 'can_toggle_assistant', label: 'Aktivera/avaktivera assistent' },
                  { key: 'can_change_ai_mode', label: 'Ändra AI-läge' },
                  { key: 'can_edit_schedule', label: 'Redigera schema' },
                  { key: 'can_view_billing', label: 'Visa fakturering' },
                  { key: 'can_manage_team', label: 'Hantera team' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={permissions[key as keyof typeof permissions]}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, [key]: checked })
                      }
                    />
                    <Label htmlFor={key} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                "Skicka inbjudan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
