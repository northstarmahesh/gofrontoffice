import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, BookOpen, Plus, Trash2, Globe as GlobeIcon, FileText, Mail } from "lucide-react";
import { LocationManager } from "./LocationManager";

interface ClinicInfoProps {
  clinicId?: string;
  onSaved?: (clinicId: string) => void;
}

interface KBEntry {
  id: string;
  source_type: "website" | "url" | "pdf";
  source_url?: string;
  file_path?: string;
  content?: string;
  title?: string;
}

export const ClinicInfo = ({ clinicId, onSaved }: ClinicInfoProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    website: "",
    admin_email: "",
  });

  // Knowledge Base state
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urls, setUrls] = useState(["", "", ""]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (clinicId) {
      loadClinicData();
      loadEntries();
    }
  }, [clinicId]);

  useEffect(() => {
    if (clinicId) {
      loadClinicData();
      loadEntries();
    }
  }, [clinicId]);

  const loadClinicData = async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .single();

    if (error) {
      toast.error("Failed to load clinic data");
      return;
    }

    if (data) {
      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        website: data.website || "",
        admin_email: data.admin_email || "",
      });
    }
  };

  const loadEntries = async () => {
    if (!clinicId) return;
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (clinicId) {
        // Update existing clinic
        const { error } = await supabase
          .from("clinics")
          .update(formData)
          .eq("id", clinicId);

        if (error) throw error;
        toast.success("Clinic information updated!");
      } else {
        // Create new clinic (trigger automatically adds user as owner)
        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .insert(formData)
          .select()
          .single();

        if (clinicError) throw clinicError;

        toast.success("Clinic created successfully!");
        if (onSaved) onSaved(clinic.id);
      }
    } catch (error: any) {
      console.error("Error saving clinic:", error);
      toast.error(error.message || "Failed to save clinic");
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

  const handleAddUrls = async () => {
    const validUrls = urls.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    setUploading(true);
    try {
      const entries = validUrls.map(url => ({
        clinic_id: clinicId!,
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
      setDialogOpen(false);
      loadEntries();
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
          clinic_id: clinicId!,
          source_type: "pdf",
          file_path: fileName,
          title: pdfFile.name,
        });

      if (dbError) throw dbError;

      toast.success("PDF uploaded successfully");
      setPdfFile(null);
      setDialogOpen(false);
      loadEntries();
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      toast.error(error.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entry: KBEntry) => {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      // Delete file from storage if it's a PDF
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
      loadEntries();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete source");
    }
  };

  return (
    <div className="space-y-6">
      {/* Clinic Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Clinic Information</CardTitle>
          </div>
          <CardDescription>
            Main information about your clinic organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Clinic Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={generateSlug}
                required
                placeholder="Main Street Health Clinic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                placeholder="main-street-health"
              />
              <p className="text-xs text-muted-foreground">
                Used for your clinic's unique URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Main Admin Email
              </Label>
              <Input
                id="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="admin@clinic.com"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : clinicId ? "Update Information" : "Create Clinic"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Locations Section */}
      {clinicId && <LocationManager clinicId={clinicId} />}

      {/* Knowledge Base Section */}
      {clinicId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Knowledge Base</CardTitle>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};