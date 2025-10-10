import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, TrendingUp, Sparkles, Phone, MessageSquare, Zap, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const UsageBilling = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<any[]>([]);
  const [usageBreakdown, setUsageBreakdown] = useState<any[]>([]);

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

      // Generate mock monthly usage data with detailed breakdown
      const mockMonthlyData = [
        { month: "Jan", credits: 85, phoneSimple: 25, phoneAdvanced: 15, textSimple: 35, textAdvanced: 10 },
        { month: "Feb", credits: 120, phoneSimple: 35, phoneAdvanced: 20, textSimple: 45, textAdvanced: 20 },
        { month: "Mar", credits: 95, phoneSimple: 28, phoneAdvanced: 17, textSimple: 37, textAdvanced: 13 },
        { month: "Apr", credits: 110, phoneSimple: 32, phoneAdvanced: 18, textSimple: 42, textAdvanced: 18 },
        { month: "May", credits: 140, phoneSimple: 40, phoneAdvanced: 25, textSimple: 52, textAdvanced: 23 },
        { month: "Jun", credits: 105, phoneSimple: 30, phoneAdvanced: 18, textSimple: 40, textAdvanced: 17 },
      ];
      setMonthlyUsage(mockMonthlyData);

      // Current month breakdown
      const breakdown = [
        { name: "Phone - Simple", value: 45, color: "#3b82f6" },
        { name: "Phone - Advanced", value: 25, color: "#8b5cf6" },
        { name: "Text - Simple", value: 55, color: "#10b981" },
        { name: "Text - Advanced", value: 20, color: "#f59e0b" },
      ];
      setUsageBreakdown(breakdown);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newValue = !billingData.auto_topup_enabled;

      // Update billing_usage table
      const { error: billingError } = await supabase
        .from("billing_usage")
        .update({ auto_topup_enabled: newValue })
        .eq("id", billingData.id);

      if (billingError) throw billingError;

      // Also update notification_settings table to keep in sync
      const { error: notifError } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          auto_topup_enabled: newValue,
        });

      if (notifError) throw notifError;

      setBillingData({ ...billingData, auto_topup_enabled: newValue });
      toast.success("Auto top-up settings updated across all settings");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const purchasePackage = async (pkg: any) => {
    toast.success(
      `${pkg.name} will be added to your next invoice. Don't worry - unused credits will roll over to the next month!`,
      { duration: 5000 }
    );
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

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Credit Packages - Moved to Top */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Extra Credit Packages</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Purchase additional credits when needed. <strong>Unused credits automatically roll over to the next month.</strong>
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {creditPackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`p-6 relative ${
                      pkg.is_popular ? "border-primary border-2" : ""
                    }`}
                  >
                    {pkg.is_popular && (
                      <Badge className="absolute top-4 right-4 bg-yellow-accent text-primary">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Populär
                      </Badge>
                    )}
                    <div className="text-center space-y-4">
                      <div>
                        <div className="text-3xl font-bold">{pkg.credits}</div>
                        <div className="text-sm text-muted-foreground">krediter</div>
                      </div>
                      <div className="text-2xl font-bold">{pkg.price_kr} kr</div>
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
            </Card>

            {/* Credit Balance */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Current Credit Balance</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available Credits</span>
                  <span className="text-3xl font-bold">{billingData?.current_credits || 0}</span>
                </div>
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
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
                <div className="pt-3 border-t">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    ✓ Unused credits roll over to next month
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Auto Top-up */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Auto Top-up</h3>
                  <p className="text-sm text-muted-foreground">
                    AI automatically finds the cheapest credit package based on your usage
                  </p>
                </div>
                <Switch
                  checked={billingData?.auto_topup_enabled || false}
                  onCheckedChange={toggleAutoTopup}
                />
              </div>
            </Card>

            {/* Graph 1: Total Credits Month on Month */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Total Credits Used Month on Month</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Credits', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="credits" 
                    fill="hsl(var(--primary))" 
                    name="Total Credits"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Graph 2: Channel Breakdown with Task Complexity */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Channel Usage: Simple vs Advanced Tasks</h2>
              <div className="space-y-6">
                {/* Phone Channel */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                    <h3 className="font-semibold">Phone Calls</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyUsage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="phoneSimple" 
                        stackId="phone"
                        fill="hsl(var(--chart-1))" 
                        name="Simple"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar 
                        dataKey="phoneAdvanced" 
                        stackId="phone"
                        fill="hsl(var(--chart-2))" 
                        name="Advanced"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Text Channel */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5" style={{ color: 'hsl(var(--yellow-accent))' }} />
                    <h3 className="font-semibold">Text Messages (SMS/WhatsApp/Instagram/Messenger)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyUsage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="textSimple" 
                        stackId="text"
                        fill="hsl(var(--chart-3))" 
                        name="Simple"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar 
                        dataKey="textAdvanced" 
                        stackId="text"
                        fill="hsl(var(--chart-4))" 
                        name="Advanced"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>


            {/* Credit Usage Info */}
            <Card className="p-6">
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
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
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

            {/* Monthly Billing History */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Billing History</h2>
              <div className="space-y-3">
                {[
                  { month: "June 2025", subscription: 2950, credits: 895, total: 3845 },
                  { month: "May 2025", subscription: 2950, credits: 1495, total: 4445 },
                  { month: "April 2025", subscription: 2950, credits: 0, total: 2950 },
                  { month: "March 2025", subscription: 2950, credits: 225, total: 3175 },
                  { month: "February 2025", subscription: 2950, credits: 895, total: 3845 },
                  { month: "January 2025", subscription: 12950, credits: 0, total: 12950, note: "Setup fee included" },
                ].map((bill, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{bill.month}</div>
                        {bill.note && (
                          <div className="text-xs text-muted-foreground">{bill.note}</div>
                        )}
                      </div>
                      <div className="text-xl font-bold">{bill.total.toLocaleString()} kr</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Monthly subscription</span>
                        <span>{bill.subscription.toLocaleString()} kr</span>
                      </div>
                      {bill.credits > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Extra credits</span>
                          <span>{bill.credits.toLocaleString()} kr</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Total Yearly Summary */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">2025 Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Paid (2025)</span>
                  <span className="text-3xl font-bold">31 210 kr</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground">Subscription</div>
                    <div className="text-lg font-semibold">27 700 kr</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Extra Credits</div>
                    <div className="text-lg font-semibold">3 510 kr</div>
                  </div>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UsageBilling;
