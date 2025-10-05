import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, MapPin, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Clinic {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  clinic_type: string | null;
  created_at: string;
}

const AdminClinicList = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, email, phone, address, status, clinic_type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClinics(data || []);
    } catch (error) {
      console.error('Error loading clinics:', error);
      toast.error('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const updateClinicStatus = async (clinicId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ status: newStatus })
        .eq('id', clinicId);

      if (error) throw error;
      
      toast.success(`Clinic ${newStatus === 'active' ? 'activated' : 'status updated'}`);
      loadClinics();
    } catch (error) {
      console.error('Error updating clinic status:', error);
      toast.error('Failed to update clinic status');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending_setup':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">All Clinics ({clinics.length})</h2>
      </div>

      {clinics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clinics yet. Create your first clinic to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle>{clinic.name}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(clinic.status)}>
                        {clinic.status.replace('_', ' ')}
                      </Badge>
                      {clinic.clinic_type && (
                        <Badge variant="outline">{clinic.clinic_type}</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Created {new Date(clinic.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {clinic.status === 'pending_setup' && (
                      <Button
                        size="sm"
                        onClick={() => updateClinicStatus(clinic.id, 'active')}
                      >
                        Activate
                      </Button>
                    )}
                    {clinic.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateClinicStatus(clinic.id, 'suspended')}
                      >
                        Suspend
                      </Button>
                    )}
                    {clinic.status === 'suspended' && (
                      <Button
                        size="sm"
                        onClick={() => updateClinicStatus(clinic.id, 'active')}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {clinic.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{clinic.email}</span>
                    </div>
                  )}
                  {clinic.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{clinic.phone}</span>
                    </div>
                  )}
                  {clinic.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{clinic.address}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/?clinicId=${clinic.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Clinic Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClinicList;
