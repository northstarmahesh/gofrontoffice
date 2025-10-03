import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Phone, BookOpen, Plus, Trash2, Globe as GlobeIcon, FileText } from "lucide-react";

interface ResourcesManagerProps {
  clinicId: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  channel: string;
  is_active: boolean;
}

interface KBEntry {
  id: string;
  source_type: "website" | "url" | "pdf";
  source_url?: string;
  file_path?: string;
  content?: string;
  title?: string;
}

export const ResourcesManager = ({ clinicId }: ResourcesManagerProps) => {
  // Phone Numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [phonesLoading, setPhonesLoading] = useState(true);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneFormData, setPhoneFormData] = useState({
    phone_number: "",
    channel: "sms",
  });

  // Knowledge Base state
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [urls, setUrls] = useState(["", "", ""]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    loadPhoneNumbers();
    loadKnowledgeBase();
  }, [clinicId]);

  // Phone Numbers Functions
  const loadPhoneNumbers = async () => {
    setPhonesLoading(true);
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
    setPhonesLoading(false);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("clinic_phone_numbers")
        .insert({
          clinic_id: clinicId,
          ...phoneFormData,
        });

      if (error) throw error;
      toast.success("Phone number added!");
      setPhoneDialogOpen(false);
      setPhoneFormData({ phone_number: "", channel: "sms" });
      loadPhoneNumbers();
    } catch (error: any) {
      console.error("Error adding phone number:", error);
      toast.error(error.message || "Failed to add phone number");
    }
  };

  const handlePhoneToggle = async (id: string, isActive: boolean) => {
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

  const handlePhoneDelete = async (id: string) => {
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

  // Knowledge Base Functions
  const loadKnowledgeBase = async () => {
    setKbLoading(true);
    const { data, error } = await supabase
      .from("clinic_knowledge_base")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load knowledge base");
      console.error(error);
    } else {
      setEntries((data || []) as KBEntry[]);
    }
    setKbLoading(false);
  };

  const handleAddUrls = async () => {
    const validUrls = urls.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    setUploading(true);
    try {
      const entries = validUrls.map(url => ({
        clinic_id: clinicId,
        source_type: "url",
        source_url: url,
        title: new URL(url).hostname,
      }));

      const { error } = await supabase
        .from("clinic_knowledge_base")
        .insert(entries);

      if (error) throw error;
      
      toast.success(`Added ${validUrls.length} URL source(s)`);
      setUrls(["", "", ""]);
      setKbDialogOpen(false);
      loadKnowledgeBase();
    } catch (error: any) {
      console.error("Error adding URLs:", error);
      toast.error(error.message || "Failed to add URLs");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) {
      toast.error("Please select a PDF file");
      return;
    }

    setUploading(true);
    try {
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${clinicId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base-pdfs")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("clinic_knowledge_base")
        .insert({
          clinic_id: clinicId,
          source_type: "pdf",
          file_path: fileName,
          title: pdfFile.name,
        });

      if (dbError) throw dbError;

      toast.success("PDF uploaded successfully");
      setPdfFile(null);
      setKbDialogOpen(false);
      loadKnowledgeBase();
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      toast.error(error.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleKbDelete = async (entry: KBEntry) => {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      if (entry.source_type === "pdf" && entry.file_path) {
        const { error: storageError } = await supabase.storage
          .from("knowledge-base-pdfs")
          .remove([entry.file_path]);
        
        if (storageError) console.error("Storage delete error:", storageError);
      }

      const { error } = await supabase
        .from("clinic_knowledge_base")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;
      
      toast.success("Source deleted!");
      loadKnowledgeBase();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete source");
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone Numbers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <CardTitle>Phone Numbers</CardTitle>
            </div>
            <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
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
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      value={phoneFormData.phone_number}
                      onChange={(e) => setPhoneFormData({ ...phoneFormData, phone_number: e.target.value })}
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
                      value={phoneFormData.channel}
                      onChange={(e) => setPhoneFormData({ ...phoneFormData, channel: e.target.value })}
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
          {phonesLoading ? (
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
                      onCheckedChange={(checked) => handlePhoneToggle(phone.id, checked)}
                    />
                    <div>
                      <p className="font-medium">{phone.phone_number}</p>
                      <p className="text-sm text-muted-foreground capitalize">{phone.channel}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePhoneDelete(phone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Base Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Knowledge Base</CardTitle>
            </div>
            <Dialog open={kbDialogOpen} onOpenChange={setKbDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Knowledge Source</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="urls" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="urls">
                      <GlobeIcon className="h-4 w-4 mr-2" />
                      Website URLs
                    </TabsTrigger>
                    <TabsTrigger value="pdf">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF Document
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="urls" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add up to 3 website URLs to use as knowledge sources
                    </p>
                    {urls.map((url, index) => (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`url-${index}`}>URL {index + 1}</Label>
                        <Input
                          id={`url-${index}`}
                          type="url"
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...urls];
                            newUrls[index] = e.target.value;
                            setUrls(newUrls);
                          }}
                        />
                      </div>
                    ))}
                    <Button 
                      onClick={handleAddUrls} 
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? "Adding..." : "Add URLs"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="pdf" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a PDF document to extract knowledge from
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="pdf-file">PDF File (Max 20MB)</Label>
                      <Input
                        id="pdf-file"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                      {pdfFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={handleUploadPdf} 
                      disabled={uploading || !pdfFile}
                      className="w-full"
                    >
                      {uploading ? "Uploading..." : "Upload PDF"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Add website URLs or PDF documents to build your clinic's knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kbLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground">No sources yet. Add your first one!</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {entry.source_type === "pdf" ? (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <GlobeIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{entry.title || "Untitled"}</p>
                      {entry.source_url && (
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {entry.source_url}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {entry.source_type === "pdf" ? "PDF Document" : "Website"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleKbDelete(entry)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
