import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, LogOut, Users, Building2, DollarSign, Sparkles, Wallet,
} from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/super-admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/super-admin/login" });
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!sa) throw redirect({ to: "/super-admin/login" });
    return { user: data.user };
  },
  component: SuperAdminPanel,
});

function SuperAdminPanel() {
  const navigate = useNavigate();

  const companies = useQuery({
    queryKey: ["sa-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, owner_id, currency, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const subs = useQuery({
    queryKey: ["sa-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions")
        .select("id, company_id, plan_id, status, current_period_end, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const payments = useQuery({
    queryKey: ["sa-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_payments")
        .select("id, amount, currency, method, status, payer_mobile, txn_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plans = useQuery({
    queryKey: ["sa-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("id, name, price, billing_cycle, is_active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalWorkspaces = new Set((companies.data ?? []).map((c: any) => c.owner_id)).size;
  const activeSubs = (subs.data ?? []).filter((s: any) => s.status === "active").length;
  const totalRevenue = (payments.data ?? [])
    .filter((p: any) => p.status === "verified" || p.status === "completed")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/super-admin/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-8 w-8 rounded-md object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold tracking-tight">Super Admin</span>
                <Badge variant="secondary" className="text-[10px]">SYSTEM</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Global control panel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard"><Button variant="outline" size="sm">User app</Button></Link>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-1" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={Building2} label="Workspaces" value={totalWorkspaces} />
          <Stat icon={Users} label="Companies" value={(companies.data ?? []).length} />
          <Stat icon={Sparkles} label="Active subscriptions" value={activeSubs} />
          <Stat icon={DollarSign} label="Total revenue (BDT)" value={totalRevenue.toLocaleString()} />
        </div>

        <Tabs defaultValue="workspaces">
          <TabsList>
            <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            <TabsTrigger value="subs">Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(companies.data ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.owner_id?.slice(0, 8)}…</TableCell>
                      <TableCell>{c.currency}</TableCell>
                      <TableCell>{c.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(companies.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No companies yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="subs">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period end</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(subs.data ?? []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{s.company_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{s.plan_id?.slice(0, 8)}…</TableCell>
                      <TableCell>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(subs.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subscriptions</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments.data ?? []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{Number(p.amount).toLocaleString()} {p.currency}</TableCell>
                      <TableCell className="capitalize">{p.method}</TableCell>
                      <TableCell>{p.payer_mobile || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.txn_id || "—"}</TableCell>
                      <TableCell><Badge variant={p.status === "verified" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(payments.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(plans.data ?? []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{Number(p.price).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{p.billing_cycle}</TableCell>
                      <TableCell>{p.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                    </TableRow>
                  ))}
                  {(plans.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No plans</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}
