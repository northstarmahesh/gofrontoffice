import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, BookOpen, Plus, Trash2, Globe, FileText, MapPin, Lock } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
    email: "",
    phone: "",
    address: "",
  });

  // Knowledge Base state
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urls, setUrls] = useState(["", "", ""]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [addressLocked, setAddressLocked] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clinicId) {
      loadClinicData();
      loadEntries();
    }
  }, [clinicId]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([37.7749, -122.4194], 13);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Fix icon paths for Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    // Add click handler for map
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Add or move marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        
        if (data.display_name) {
          setFormData({ ...formData, address: data.display_name });
          setAddressLocked(true);
          toast.success("Address set from map location");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        toast.error("Failed to get address from location");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map marker when address is manually changed and unlocked
  useEffect(() => {
    if (!addressLocked && formData.address && mapRef.current) {
      // Geocode the address to get coordinates
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          formData.address
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0]) {
            const { lat, lon } = data[0];
            const latLng: L.LatLngExpression = [parseFloat(lat), parseFloat(lon)];
            
            if (markerRef.current) {
              markerRef.current.setLatLng(latLng);
            } else if (mapRef.current) {
              markerRef.current = L.marker(latLng).addTo(mapRef.current);
            }
            
            mapRef.current?.setView(latLng, 15);
          }
        })
        .catch((error) => console.error("Geocoding error:", error));
    }
  }, [formData.address, addressLocked]);

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
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
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
            Basic information about your clinic
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@clinic.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </span>
                {addressLocked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddressLocked(false)}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Unlock to edit
                  </Button>
                )}
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setAddressLocked(false);
                }}
                placeholder="Click on the map below to set address, or type manually"
                rows={3}
                disabled={addressLocked}
                className={addressLocked ? "opacity-75" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {addressLocked 
                  ? "Address set from map. Click 'Unlock to edit' to change manually." 
                  : "Click anywhere on the map to set the address automatically"}
              </p>
              <div 
                ref={mapContainerRef}
                className="mt-4 rounded-lg overflow-hidden border h-[400px] w-full"
                style={{ zIndex: 0 }}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : clinicId ? "Update Information" : "Create Clinic"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                        <Globe className="h-4 w-4 mr-2" />
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
                        <Globe className="h-5 w-5 text-muted-foreground" />
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