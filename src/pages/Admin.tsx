import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Loader2, Shield, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import AdminClinicList from "@/components/admin/AdminClinicList";
import AdminClinicCreation from "@/components/admin/AdminClinicCreation";

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Go Front Office Admin</h1>
              <p className="text-muted-foreground">Manage clinics and onboard new clients</p>
            </div>
          </div>
          <Button onClick={() => navigate("/crm")} variant="outline">
            <Building2 className="mr-2 h-4 w-4" />
            Open CRM
          </Button>
        </div>

        <Tabs defaultValue="clinics" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="clinics">All Clinics</TabsTrigger>
            <TabsTrigger value="create">Create Clinic</TabsTrigger>
          </TabsList>

          <TabsContent value="clinics" className="mt-6">
            <AdminClinicList />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <AdminClinicCreation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
