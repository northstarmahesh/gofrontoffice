import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Globe, FileText, RefreshCw, Loader2 } from "lucide-react";

interface KnowledgeBaseProps {
  clinicId: string;
}

interface KBEntry {
  id: string;
  source_type: "website" | "url" | "pdf";
  source_url?: string;
  file_path?: string;
  content?: string;
  title?: string;
  sync_status?: 'pending' | 'syncing' | 'synced' | 'failed';
  synced_at?: string;
  sync_error?: string;
  elevenlabs_doc_id?: string;
  updated_at?: string;
  created_at?: string;
}

export const KnowledgeBase = ({ clinicId }: KnowledgeBaseProps) => {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urls, setUrls] = useState(["", "", ""]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [acceptedTypes] = useState(".pdf,.doc,.docx,.xls,.xlsx,.csv");
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    loadEntries();
    
    // Poll for status updates every 5 seconds
    const pollInterval = setInterval(() => {
      loadEntries();
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [clinicId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_knowledge_base")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load knowledge base");
      console.error(error);
    } else {
      const entries = (data || []) as KBEntry[];
      
      // Detect stuck documents (syncing for > 5 minutes)
      const now = new Date();
      const stuckEntries = entries.filter(e => {
        if (e.sync_status !== 'syncing') return false;
        const updatedAt = e.updated_at ? new Date(e.updated_at) : null;
        if (!updatedAt) return false;
        const minutesElapsed = (now.getTime() - updatedAt.getTime()) / 1000 / 60;
        return minutesElapsed > 5;
      });
      
      // Auto-reset stuck documents
      if (stuckEntries.length > 0) {
        console.log(`Found ${stuckEntries.length} stuck document(s), resetting...`);
        for (const stuck of stuckEntries) {
          await supabase
            .from('clinic_knowledge_base')
            .update({
              sync_status: 'failed',
              sync_error: 'Sync timeout - please retry'
            })
            .eq('id', stuck.id);
        }
        // Reload to show updated status
        setTimeout(() => loadEntries(), 1000);
      }
      
      setEntries(entries);
    }
    setLoading(false);
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
      setDialogOpen(false);
      
      // Auto-sync newly added URLs
      const { data: newEntries } = await supabase
        .from("clinic_knowledge_base")
        .select("id")
        .eq("clinic_id", clinicId)
        .in("source_url", validUrls);
      
      if (newEntries) {
        for (const entry of newEntries) {
          triggerSync(entry.id);
        }
      }
      
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
      toast.error("Please select a file");
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (pdfFile.size > maxSize) {
      toast.error("File size must be less than 20MB");
      return;
    }

    // Validate file type
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
    const fileExt = pdfFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast.error("Invalid file type. Please upload PDF, Word, Excel, or CSV files.");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${clinicId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base-pdfs")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      const { data: newEntry, error: dbError } = await supabase
        .from("clinic_knowledge_base")
        .insert({
          clinic_id: clinicId,
          source_type: "pdf",
          file_path: fileName,
          title: pdfFile.name,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setPdfFile(null);
      setDialogOpen(false);
      
      // Auto-sync newly uploaded document
      if (newEntry) {
        triggerSync(newEntry.id);
      }
      
      loadEntries();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
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

  const triggerSync = async (kbEntryId: string) => {
    setSyncingIds(prev => new Set(prev).add(kbEntryId));
    
    try {
      const { error } = await supabase.functions.invoke(
        'elevenlabs-knowledge-sync',
        {
          body: {
            kb_entry_id: kbEntryId,
            clinic_id: clinicId
          }
        }
      );

      if (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync document");
      } else {
        toast.success("Sync started");
        // Poll for status updates
        setTimeout(() => loadEntries(), 2000);
      }
    } catch (error) {
      console.error("Error triggering sync:", error);
      toast.error("Failed to trigger sync");
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(kbEntryId);
        return newSet;
      });
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    const pendingOrFailed = entries.filter(
      e => e.sync_status === 'pending' || e.sync_status === 'failed'
    );
    
    if (pendingOrFailed.length === 0) {
      toast.info("No documents need syncing");
      setSyncingAll(false);
      return;
    }

    toast.info(`Syncing ${pendingOrFailed.length} document(s)...`);
    
    for (const entry of pendingOrFailed) {
      await triggerSync(entry.id);
      // Add small delay between syncs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setSyncingAll(false);
    toast.success("All documents synced");
  };

  const SyncStatusBadge = ({ entry }: { entry: KBEntry }) => {
    const isSyncing = syncingIds.has(entry.id);
    
    if (isSyncing || entry.sync_status === 'syncing') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      );
    }

    switch (entry.sync_status) {
      case 'pending':
        return <Badge variant="secondary">🟡 Pending</Badge>;
      case 'synced':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  ✅ Synced
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {entry.synced_at 
                  ? `Synced ${new Date(entry.synced_at).toLocaleString('sv-SE')}`
                  : 'Synced'
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive">❌ Failed</Badge>
              </TooltipTrigger>
              <TooltipContent>
                {entry.sync_error || 'Sync failed'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return null;
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
          <div className="flex gap-2">
            {entries.some(e => e.sync_status === 'pending' || e.sync_status === 'failed') && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSyncAll}
                disabled={syncingAll}
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync All
                  </>
                )}
              </Button>
            )}
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
                    <Globe className="h-4 w-4 mr-2" />
                    Website URLs
                  </TabsTrigger>
                  <TabsTrigger value="pdf">
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
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
                    Upload documents to extract knowledge from (PDF, Word, Excel, CSV)
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pdf-file">Document File (Max 20MB)</Label>
                    <Input
                      id="pdf-file"
                      type="file"
                      accept={acceptedTypes}
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    />
                    {pdfFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV
                    </p>
                  </div>
                  <Button 
                    onClick={handleUploadPdf} 
                    disabled={uploading || !pdfFile}
                    className="w-full"
                  >
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <CardDescription>
          Add website URLs or documents (PDF, Word, Excel, CSV) to build your business's knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground">No sources yet. Add your first one!</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {entry.source_type === "pdf" ? (
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.title || "Untitled"}</p>
                    {entry.source_url && (
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.source_url}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {entry.source_type === "pdf" ? "Document" : "Website"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SyncStatusBadge entry={entry} />
                    {(entry.sync_status === 'failed' || entry.sync_status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => triggerSync(entry.id)}
                        disabled={syncingIds.has(entry.id)}
                        title="Retry sync"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entry)}
                  className="flex-shrink-0"
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
