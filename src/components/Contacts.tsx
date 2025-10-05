import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, Edit, Mail, Phone, MessageSquare, Eye } from "lucide-react";
import ContactDetailDialog from "./ContactDetailDialog";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  last_contacted?: string;
  created_at: string;
}

interface ContactsProps {
  selectedContactName?: string;
  onNavigateToTools?: () => void;
}

export const Contacts = ({ selectedContactName, onNavigateToTools }: ContactsProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContactName && contacts.length > 0) {
      setSearchQuery(selectedContactName);
      // Scroll to the contact if found
      const contactElement = document.getElementById(`contact-${selectedContactName}`);
      if (contactElement) {
        contactElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedContactName, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    
    try {
      // First get clinic_id for current user
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .single();

      if (!clinicData?.clinic_id) {
        // If no clinic, fall back to extracting from activity_logs
        const { data: logs, error } = await supabase
          .from("activity_logs")
          .select("*")
          .not("contact_name", "is", null)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading contacts:", error);
          toast.error("Failed to load contacts");
        } else {
          const contactMap = new Map<string, Contact>();
          
          logs?.forEach((log) => {
            const key = log.contact_info || log.contact_name;
            if (key && !contactMap.has(key)) {
              contactMap.set(key, {
                id: log.id,
                name: log.contact_name || "Unknown",
                phone: log.contact_info || "",
                email: undefined,
                notes: log.summary || "",
                last_contacted: log.created_at,
                created_at: log.created_at,
              });
            }
          });

          setContacts(Array.from(contactMap.values()));
        }
      } else {
        // Load from contacts table
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("clinic_id", clinicData.clinic_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading contacts:", error);
          toast.error("Failed to load contacts");
        } else {
          // Also check for last_contacted from activity_logs
          const contactsWithActivity = await Promise.all(
            (data || []).map(async (contact) => {
              const { data: logs } = await supabase
                .from("activity_logs")
                .select("created_at")
                .eq("contact_info", contact.phone)
                .order("created_at", { ascending: false })
                .limit(1);

              return {
                ...contact,
                last_contacted: logs?.[0]?.created_at || contact.created_at
              };
            })
          );

          setContacts(contactsWithActivity);
        }
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast.error("Failed to load contacts");
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get clinic_id for current user
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .single();

      if (!clinicData?.clinic_id) {
        toast.error("No business found for user");
        return;
      }

      const contactData = {
        clinic_id: clinicData.clinic_id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        notes: formData.notes || null
      };

      if (editingContact) {
        const { error } = await supabase
          .from("contacts")
          .update(contactData)
          .eq("id", editingContact.id);

        if (error) throw error;
        toast.success("Contact updated successfully");
      } else {
        const { error } = await supabase
          .from("contacts")
          .insert(contactData);

        if (error) throw error;
        toast.success("Contact added successfully");
      }

      setDialogOpen(false);
      resetForm();
      loadContacts();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setEditingContact(null);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      notes: contact.notes || ""
    });
    setDialogOpen(true);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const openContactDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailDialogOpen(true);
  };

  const handleContactUpdated = () => {
    loadContacts();
  };

  return (
    <div className="space-y-6">
      {/* Contact Detail Dialog */}
      <ContactDetailDialog
        contactId={selectedContact?.id}
        contactName={selectedContact?.name || null}
        contactInfo={selectedContact?.phone}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onContactUpdated={handleContactUpdated}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-muted-foreground">
            Manage your business contact list or{" "}
            <button
              onClick={onNavigateToTools}
              className="text-primary hover:underline font-medium"
            >
              connect your CRM directly
            </button>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any relevant notes..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingContact ? "Update Contact" : "Add Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Contact List</CardTitle>
            </div>
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <CardDescription>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading contacts...</p>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? "No contacts found matching your search" : "No contacts yet. They'll appear here from your activity logs."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  id={`contact-${contact.name}`}
                  className={`flex items-start justify-between p-4 border rounded-lg transition-colors cursor-pointer ${
                    selectedContactName === contact.name
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => openContactDetail(contact)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{contact.name}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.notes && (
                        <div className="flex items-start gap-2 mt-2">
                          <MessageSquare className="h-3 w-3 mt-0.5" />
                          <span className="text-xs line-clamp-1">{contact.notes}</span>
                        </div>
                      )}
                      {contact.last_contacted && (
                        <p className="text-xs mt-2">
                          Last contacted: {new Date(contact.last_contacted).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openContactDetail(contact);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(contact);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contacts;
