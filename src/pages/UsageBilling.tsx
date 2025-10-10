import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, TrendingUp, Sparkles } from "lucide-react";

const UsageBilling = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load billing data
      const { data: billingData } = await supabase
        .from("billing_usage")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setBillingData(billingData);

      // Load credit packages
      const { data: packages } = await supabase
        .from("credit_packages")
        .select("*")
        .order("display_order");

      setCreditPackages(packages || []);

      // Load transactions
      const { data: trans } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(trans || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoTopup = async () => {
    if (!billingData) return;
    
    try {
      const { error } = await supabase
        .from("billing_usage")
        .update({ auto_topup_enabled: !billingData.auto_topup_enabled })
        .eq("id", billingData.id);

      if (error) throw error;

      setBillingData({ ...billingData, auto_topup_enabled: !billingData.auto_topup_enabled });
      toast.success("Auto top-up settings updated");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const purchasePackage = async (pkg: any) => {
    toast.info("Payment integration coming soon!");
    // TODO: Integrate with payment provider
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const creditsPercentage = billingData
    ? (billingData.current_credits / billingData.included_monthly_credits) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Usage & Billing</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Current Plan */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Monthly Fee</span>
                <span className="text-2xl font-bold">2 950 kr/mån</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Was: 3 950 kr</span>
                <Badge variant="secondary">Sparar 1 000 kr/mån</Badge>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {billingData?.setup_fee_paid ? "Setup fee paid" : "Setup fee: 12 950 kr (Spara 9 000 kr)"}
                </p>
              </div>
            </div>
          </Card>

          {/* Credit Balance */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Credit Balance</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Available Credits</span>
                <span className="text-2xl font-bold">{billingData?.current_credits || 0}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${creditsPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Used this month: {billingData?.credits_used_this_month || 0}
                </span>
                <span className="text-muted-foreground">
                  Included: {billingData?.included_monthly_credits || 100}/mån
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Auto Top-up */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Auto Top-up</h3>
              <p className="text-sm text-muted-foreground">
                Automatically purchase credits when running low
              </p>
            </div>
            <Switch
              checked={billingData?.auto_topup_enabled || false}
              onCheckedChange={toggleAutoTopup}
            />
          </div>
        </Card>

        {/* Credit Packages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Extra Credit Packages</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {creditPackages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`p-6 relative ${
                  pkg.is_popular ? "border-primary border-2" : ""
                }`}
              >
                {pkg.is_popular && (
                  <Badge className="absolute top-4 right-4">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Populär
                  </Badge>
                )}
                <div className="text-center space-y-4">
                  <div>
                    <div className="text-3xl font-bold">{pkg.credits}</div>
                    <div className="text-sm text-muted-foreground">krediter</div>
                  </div>
                  <div className="text-2xl font-bold">{pkg.price_kr} kr/mån</div>
                  <Button
                    onClick={() => purchasePackage(pkg)}
                    variant={pkg.is_popular ? "default" : "outline"}
                    className="w-full"
                  >
                    Purchase
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Credit Usage Info */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How Assistant Credits Work</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Simple Tasks (1-2 krediter)</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• SMS-svar</li>
                <li>• Telefonsamtal</li>
                <li>• Svar på öppettider, priser, adresser</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Avancerade Tasks (3+ krediter)</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• SMS multi-step</li>
                <li>• Telefon multi-step</li>
                <li>• Boka tid + uppdatera CRM + skicka bekräftelse</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Transactions
            </h2>
            <div className="space-y-2">
              {transactions.map((trans) => (
                <div
                  key={trans.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{trans.description || trans.transaction_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(trans.created_at).toLocaleDateString("sv-SE")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${trans.credits_amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {trans.credits_amount > 0 ? "+" : ""}{trans.credits_amount} krediter
                    </div>
                    {trans.price_kr && (
                      <div className="text-sm text-muted-foreground">{trans.price_kr} kr</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UsageBilling;
