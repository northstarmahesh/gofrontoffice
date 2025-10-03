import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Link as LinkIcon, FileText, Globe, Loader2 } from "lucide-react";

interface KnowledgeBaseProps {
  clinicId: string;
}

interface KBSource {
  id: string;
  source_type: "website" | "url" | "pdf";
  source_url: string | null;
  file_path: string | null;
  title: string | null;
  content: string | null;
  created_at: string;
}

export const KnowledgeBase = ({ clinicId }: KnowledgeBaseProps) => {
  const [sources, setSources] = useState<KBSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // URL source state
  const [urlInputs, setUrlInputs] = useState(["", "", ""]);
  
  // PDF source state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");

  useEffect(() => {
    loadSources();
  }, [clinicId]);

  const loadSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_knowledge_base")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load knowledge sources");
      console.error(error);
    } else {
      setSources((data as KBSource[]) || []);
    }
    setLoading(false);
  };

  const handleAddUrls = async () => {
    const validUrls = urlInputs.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    setUploading(true);

    try {
      for (const url of validUrls) {
        const { error } = await supabase
          .from("clinic_knowledge_base")
          .insert({
            clinic_id: clinicId,
            source_type: "url",
            source_url: url,
            title: url,
            content: "Content will be fetched when processing",
          });

        if (error) throw error;
      }

      toast.success(`Added ${validUrls.length} URL source(s)`);
      setUrlInputs(["", "", ""]);
      setDialogOpen(false);
      loadSources();
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

    if (!pdfTitle.trim()) {
      toast.error("Please enter a title for the PDF");
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = pdfFile.name.split(".").pop();
      const fileName = `${clinicId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from("knowledge-base-pdfs")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      // Create database entry
      const { error: dbError } = await supabase
        .from("clinic_knowledge_base")
        .insert({
          clinic_id: clinicId,
          source_type: "pdf",
          file_path: fileName,
          title: pdfTitle,
          content: "PDF content will be extracted when processing",
        });

      if (dbError) throw dbError;

      toast.success("PDF uploaded successfully");
      setPdfFile(null);
      setPdfTitle("");
      setDialogOpen(false);
      loadSources();
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      toast.error(error.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      // Delete from storage if it's a PDF
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("knowledge-base-pdfs")
          .remove([filePath]);
        
        if (storageError) console.error("Storage deletion error:", storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from("clinic_knowledge_base")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Source deleted");
      loadSources();
    } catch (error: any) {
      console.error("Error deleting source:", error);
      toast.error("Failed to delete source");
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "website":
        return <Globe className="h-4 w-4" />;
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
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
                    <LinkIcon className="h-4 w-4 mr-2" />
                    URLs
                  </TabsTrigger>
                  <TabsTrigger value="pdf">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="urls" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add up to 3 URLs to your knowledge base
                  </p>
                  
                  {urlInputs.map((url, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`url-${index}`}>URL {index + 1}</Label>
                      <Input
                        id={`url-${index}`}
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => {
                          const newInputs = [...urlInputs];
                          newInputs[index] = e.target.value;
                          setUrlInputs(newInputs);
                        }}
                      />
                    </div>
                  ))}

                  <Button 
                    onClick={handleAddUrls} 
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add URLs"
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF document (max 20MB)
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-title">Document Title *</Label>
                    <Input
                      id="pdf-title"
                      placeholder="e.g., Office Policies"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-file">PDF File *</Label>
                    <Input
                      id="pdf-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button 
                    onClick={handleUploadPdf} 
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload PDF"
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Add websites and documents to power your AI assistant's knowledge
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No sources yet. Add URLs or PDFs to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 text-muted-foreground">
                    {getSourceIcon(source.source_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary uppercase">
                        {source.source_type}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">
                      {source.title || "Untitled"}
                    </p>
                    {source.source_url && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {source.source_url}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(source.id, source.file_path)}
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