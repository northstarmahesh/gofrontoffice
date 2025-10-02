import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Phone, Plus, Trash2 } from "lucide-react";

interface PhoneNumbersProps {
  clinicId: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  channel: string;
  is_active: boolean;
}

export const PhoneNumbers = ({ clinicId }: PhoneNumbersProps) => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: "",
    channel: "sms",
  });

  useEffect(() => {
    loadPhoneNumbers();
  }, [clinicId]);

  const loadPhoneNumbers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_phone_numbers")
      .select("*")
      .eq("clinic_id", clinicId);

    if (error) {
      console.error("Error loading phone numbers:", error);
      toast.error("Failed to load phone numbers");
    } else {
      setPhoneNumbers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("clinic_phone_numbers")
        .insert({
          clinic_id: clinicId,
          ...formData,
        });

      if (error) throw error;
      toast.success("Phone number added!");
      setDialogOpen(false);
      setFormData({ phone_number: "", channel: "sms" });
      loadPhoneNumbers();
    } catch (error: any) {
      console.error("Error adding phone number:", error);
      toast.error(error.message || "Failed to add phone number");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("clinic_phone_numbers")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update phone number");
    } else {
      toast.success(isActive ? "Phone number activated" : "Phone number deactivated");
      loadPhoneNumbers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;

    const { error } = await supabase
      .from("clinic_phone_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete phone number");
    } else {
      toast.success("Phone number deleted!");
      loadPhoneNumbers();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Phone Numbers</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Phone Number</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+14243298358"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel">Channel *</Label>
                  <select
                    id="channel"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    required
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="voice">Voice</option>
                  </select>
                </div>

                <Button type="submit" className="w-full">
                  Add Phone Number
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Configure phone numbers for your clinic's communication channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : phoneNumbers.length === 0 ? (
          <p className="text-muted-foreground">No phone numbers configured yet.</p>
        ) : (
          <div className="space-y-3">
            {phoneNumbers.map((phone) => (
              <div
                key={phone.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={phone.is_active}
                    onCheckedChange={(checked) => handleToggle(phone.id, checked)}
                  />
                  <div>
                    <p className="font-medium">{phone.phone_number}</p>
                    <p className="text-sm text-muted-foreground capitalize">{phone.channel}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(phone.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
