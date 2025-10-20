import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, Edit, Mail, Phone, MessageSquare, Eye, MapPin } from "lucide-react";
import ContactDetailDialog from "./ContactDetailDialog";
import { normalizePhoneNumber } from "@/lib/phone-utils";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  last_contacted?: string;
  created_at: string;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface ContactsProps {
  selectedContactName?: string;
  onNavigateToTools?: () => void;
}

export const Contacts = ({ selectedContactName, onNavigateToTools }: ContactsProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
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
    loadLocations();
    loadContacts(true);
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadContacts(true);
    }
  }, [selectedLocation]);

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

  const loadLocations = async () => {
    try {
      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .single();

      if (clinicData?.clinic_id) {
        const { data, error } = await supabase
          .from("clinic_locations")
          .select("id, name, address")
          .eq("clinic_id", clinicData.clinic_id)
          .order("name");

        if (error) {
          console.error("Error loading locations:", error);
        } else {
          setLocations(data || []);
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadContacts = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setPage(0);
      setContacts([]);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setContacts([]);
        return;
      }

      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicData?.clinic_id) {
        setContacts([]);
        return;
      }

      const currentPage = reset ? 0 : page;
      let query = supabase
        .from("contacts")
        .select("*", { count: 'exact' })
        .eq("clinic_id", clinicData.clinic_id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (selectedLocation !== "all") {
        query = query.eq("location_id", selectedLocation);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error loading contacts:", error);
        toast.error("Failed to load contacts");
      } else {
        if (reset) {
          setContacts(data || []);
        } else {
          setContacts(prev => [...prev, ...(data || [])]);
        }
        setHasMore((count ?? 0) > (currentPage + 1) * PAGE_SIZE);
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get clinic_id for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: clinicData } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicData?.clinic_id) {
        toast.error("No business found for user");
        return;
      }

      const contactData = {
        clinic_id: clinicData.clinic_id,
        name: formData.name,
        phone: normalizePhoneNumber(formData.phone),
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
    } catch (error: any) {
      console.error("Error saving contact:", error);
      if (error?.code === '23505' && error?.message?.includes('unique_phone_per_clinic')) {
        toast.error("A contact with this phone number already exists");
      } else {
        toast.error("Failed to save contact");
      }
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

  const filteredContacts = contacts.filter((contact) => {
    const normalizedQuery = normalizePhoneNumber(searchQuery);
    const normalizedContactPhone = normalizePhoneNumber(contact.phone);
    
    return contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      normalizedContactPhone.includes(normalizedQuery) ||
      contact.phone.includes(searchQuery);
  });

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
          {locations.length > 0 ? (
            <Tabs value={selectedLocation} onValueChange={setSelectedLocation} className="w-full">
              <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: `repeat(${locations.length + 1}, minmax(0, 1fr))` }}>
                <TabsTrigger value="all">
                  <MapPin className="h-4 w-4 mr-2" />
                  All Locations
                </TabsTrigger>
                {locations.map((location) => (
                  <TabsTrigger key={location.id} value={location.id}>
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="mt-0">
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
              {hasMore && !searchQuery && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => loadContacts(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
              </TabsContent>
              {locations.map((location) => (
                <TabsContent key={location.id} value={location.id} className="mt-0">
                  {loading ? (
                    <p className="text-muted-foreground">Loading contacts...</p>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No contacts found matching your search" : `No contacts yet for ${location.name}. They'll appear here from your activity logs.`}
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
                   {hasMore && !searchQuery && (
                     <div className="flex justify-center pt-4">
                       <Button
                         variant="outline"
                         onClick={() => loadContacts(false)}
                         disabled={loadingMore}
                       >
                         {loadingMore ? "Loading..." : "Load More"}
                       </Button>
                     </div>
                   )}
                 </TabsContent>
              ))}
            </Tabs>
          ) : (
            <>
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
          {hasMore && !searchQuery && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadContacts(false)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contacts;
