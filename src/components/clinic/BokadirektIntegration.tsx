import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";

interface BokadirektCalendar {
  id: string;
  calendar_url: string;
  service_name: string;
  service_description: string | null;
  is_active: boolean;
}

interface BokadirektIntegrationProps {
  clinicId: string;
  locationId?: string;
  isDialog?: boolean;
}

export const BokadirektIntegration = ({ clinicId, locationId, isDialog = false }: BokadirektIntegrationProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newCalendar, setNewCalendar] = useState({
    calendar_url: "",
    service_name: "",
    service_description: ""
  });

  // Fetch calendars
  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['bokadirekt-calendars', clinicId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('bokadirekt_calendars')
        .select('*')
        .eq('clinic_id', clinicId);
      
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as BokadirektCalendar[];
    }
  });

  // Add calendar mutation
  const addCalendarMutation = useMutation({
    mutationFn: async () => {
      console.log('Adding calendar with data:', {
        clinic_id: clinicId,
        location_id: locationId,
        ...newCalendar
      });

      const { data, error } = await supabase
        .from('bokadirekt_calendars')
        .insert({
          clinic_id: clinicId,
          location_id: locationId,
          ...newCalendar
        })
        .select()
        .single();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bokadirekt-calendars'] });
      toast({
        title: "Calendar added",
        description: "Bokadirekt calendar has been added successfully."
      });
      setNewCalendar({ calendar_url: "", service_name: "", service_description: "" });
      setIsAdding(false);
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add calendar. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete calendar mutation
  const deleteCalendarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bokadirekt_calendars')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bokadirekt-calendars'] });
      toast({
        title: "Kalender borttagen",
        description: "Bokadirekt-kalendern har tagits bort."
      });
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('bokadirekt_calendars')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bokadirekt-calendars'] });
    }
  });

  const handleAddCalendar = () => {
    if (!clinicId) {
      toast({
        title: "Error",
        description: "Clinic ID is missing. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    if (!newCalendar.calendar_url || !newCalendar.service_name) {
      toast({
        title: "Required fields",
        description: "Please fill in calendar URL and service name.",
        variant: "destructive"
      });
      return;
    }

    console.log('Attempting to add calendar...');
    addCalendarMutation.mutate();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const content = (
    <div className="space-y-4">
        {calendars.length > 0 && (
          <div className="space-y-3">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{calendar.service_name}</h4>
                    {calendar.service_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {calendar.service_description}
                      </p>
                    )}
                    <a
                      href={calendar.calendar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                    >
                      {calendar.calendar_url.substring(0, 50)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={calendar.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: calendar.id, is_active: checked })
                        }
                      />
                      <Label className="text-xs">Aktiv</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCalendarMutation.mutate(calendar.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdding ? (
          <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Lägg till kalender
          </Button>
        ) : (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="calendar_url">Bokadirekt Kalender-URL *</Label>
              <Input
                id="calendar_url"
                placeholder="https://www.bokadirekt.se/boka-tjanst/..."
                value={newCalendar.calendar_url}
                onChange={(e) => setNewCalendar({ ...newCalendar, calendar_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_name">Tjänstnamn *</Label>
              <Input
                id="service_name"
                placeholder="T.ex. Barnklippning, Manikyr, etc."
                value={newCalendar.service_name}
                onChange={(e) => setNewCalendar({ ...newCalendar, service_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_description">Beskrivning (valfritt)</Label>
              <Textarea
                id="service_description"
                placeholder="Beskriv tjänsten..."
                value={newCalendar.service_description}
                onChange={(e) => setNewCalendar({ ...newCalendar, service_description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddCalendar}
                disabled={addCalendarMutation.isPending}
              >
                {addCalendarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Spara
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewCalendar({ calendar_url: "", service_name: "", service_description: "" });
                }}
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </div>
  );

  if (isDialog) {
    return content;
  }

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calendar className="h-6 w-6 text-primary" />
          Bokadirekt Integration
        </CardTitle>
        <CardDescription className="text-base">
          Hantera dina Bokadirekt-kalenderlänkar. AI-assistenten kan kontrollera lediga tider från dessa kalendrar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};