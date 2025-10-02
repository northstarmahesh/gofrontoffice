import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, Trash2 } from "lucide-react";

interface KnowledgeBaseProps {
  clinicId: string;
}

interface KBEntry {
  id: string;
  category: string;
  question: string | null;
  answer: string;
  priority: number;
}

export const KnowledgeBase = ({ clinicId }: KnowledgeBaseProps) => {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null);
  const [formData, setFormData] = useState({
    category: "general",
    question: "",
    answer: "",
    priority: 0,
  });

  useEffect(() => {
    loadEntries();
  }, [clinicId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_knowledge_base")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("priority", { ascending: false });

    if (error) {
      toast.error("Failed to load knowledge base");
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from("clinic_knowledge_base")
          .update(formData)
          .eq("id", editingEntry.id);

        if (error) throw error;
        toast.success("Entry updated!");
      } else {
        const { error } = await supabase
          .from("clinic_knowledge_base")
          .insert({ ...formData, clinic_id: clinicId });

        if (error) throw error;
        toast.success("Entry added!");
      }

      setDialogOpen(false);
      resetForm();
      loadEntries();
    } catch (error: any) {
      console.error("Error saving entry:", error);
      toast.error(error.message || "Failed to save entry");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    const { error } = await supabase
      .from("clinic_knowledge_base")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete entry");
    } else {
      toast.success("Entry deleted!");
      loadEntries();
    }
  };

  const resetForm = () => {
    setFormData({ category: "general", question: "", answer: "", priority: 0 });
    setEditingEntry(null);
  };

  const openEditDialog = (entry: KBEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      question: entry.question || "",
      answer: entry.answer,
      priority: entry.priority,
    });
    setDialogOpen(true);
  };

  const categories = ["general", "appointments", "services", "insurance", "billing", "policies"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Knowledge Base</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Entry" : "Add New Entry"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question">Question (Optional)</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="What are your office hours?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer">Answer *</Label>
                  <Textarea
                    id="answer"
                    value={formData.answer}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    placeholder="Our office hours are Monday-Friday 9am-5pm..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (0-100)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Higher priority entries are used first</p>
                </div>

                <Button type="submit" className="w-full">
                  {editingEntry ? "Update Entry" : "Add Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Manage your clinic's information and common responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground">No entries yet. Add your first one!</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                        {entry.category}
                      </span>
                      {entry.priority > 0 && (
                        <span className="text-xs text-muted-foreground">Priority: {entry.priority}</span>
                      )}
                    </div>
                    {entry.question && (
                      <p className="font-medium mt-2">{entry.question}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{entry.answer}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
