import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, Users, CreditCard, Activity, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ClinicData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  clinic_type: string;
  billing_usage?: {
    current_credits: number;
    credits_used_this_month: number;
  }[];
  clinic_users?: {
    role: string;
    profiles: {
      full_name: string;
      email: string;
    };
  }[];
}

export default function CRM() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Du har inte behörighet att visa denna sida");
      navigate("/");
      return;
    }

    if (isAdmin) {
      loadClinics();
    }
  }, [isAdmin, adminLoading, navigate]);

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select(`
          *,
          billing_usage (
            current_credits,
            credits_used_this_month
          ),
          clinic_users (
            role,
            profiles:user_id (
              full_name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClinics(data || []);
    } catch (error) {
      console.error("Error loading clinics:", error);
      toast.error("Kunde inte ladda klientdata");
    } finally {
      setLoading(false);
    }
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClinics = clinics.length;
  const activeClinics = clinics.filter(c => c.status === "active").length;
  const totalCreditsInUse = clinics.reduce((sum, c) => 
    sum + (c.billing_usage?.[0]?.current_credits || 0), 0
  );
  const totalTeamMembers = clinics.reduce((sum, c) => 
    sum + (c.clinic_users?.length || 0), 0
  );

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => navigate("/admin")} variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Klient-CRM</h1>
          <p className="text-muted-foreground">
            Hantera alla dina kliniker från ett och samma ställe
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Kliniker</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClinics}</div>
            <p className="text-xs text-muted-foreground">
              {activeClinics} aktiva
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Teammedlemmar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Alla användare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditsInUse}</div>
            <p className="text-xs text-muted-foreground">
              Tillgängliga
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClinics}</div>
            <p className="text-xs text-muted-foreground">
              Aktiva kliniker
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alla Kliniker</CardTitle>
          <CardDescription>
            Sök och hantera klientinformation
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök efter namn, e-post eller telefon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Teammedlemmar</TableHead>
                <TableHead>Skapad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClinics.map((clinic) => (
                <TableRow key={clinic.id}>
                  <TableCell className="font-medium">{clinic.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {clinic.clinic_type || "medical"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{clinic.email}</div>
                      <div className="text-muted-foreground">{clinic.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={clinic.status === "active" ? "default" : "secondary"}
                    >
                      {clinic.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {clinic.billing_usage?.[0]?.current_credits || 0}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({clinic.billing_usage?.[0]?.credits_used_this_month || 0} används)
                    </span>
                  </TableCell>
                  <TableCell>
                    {clinic.clinic_users?.length || 0} användare
                  </TableCell>
                  <TableCell>
                    {new Date(clinic.created_at).toLocaleDateString("sv-SE")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
