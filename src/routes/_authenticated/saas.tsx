import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Sparkles, DollarSign, Users, Building2, CalendarClock,
  CheckCircle2, AlertTriangle, Wallet, Search, BadgeCheck, XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/saas")({
  component: SaasPage,
});

// ───────────── Types

type Plan = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: number;
  currency: string;
  billing_cycle: string;
  trial_days: number;
  features: string[];
  limits: Record<string, number>;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
};

type Subscription = {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  auto_renew: boolean;
  notes: string | null;
};

type Payment = {
  id: string;
  subscription_id: string | null;
  company_id: string;
  amount: number;
  currency: string;
  method: string;
  txn_id: string | null;
  payer_msisdn: string | null;
  paid_at: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  notes: string | null;
};

type CompanyLite = { id: string; name: string };

const CYCLES = ["monthly", "quarterly", "yearly", "lifetime"];
const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR"];
const SUB_STATUS = ["trial", "active", "past_due", "cancelled", "expired"];
const PAY_METHODS = ["bkash", "nagad", "rocket", "cash", "bank", "card", "other"];
const PAY_STATUS = ["pending", "verified", "failed", "refunded"];

const fmt = (n: number, cur = "BDT") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);

// ───────────── Page

function SaasPage() {
  return (
    <>
      <PageHeader
        title="SaaS"
        description="Plans, company subscriptions, payments and SaaS metrics."
      />
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard"><BarTabIcon /> Dashboard</TabsTrigger>
          <TabsTrigger value="plans"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Plans</TabsTrigger>
          <TabsTrigger value="subscriptions"><BadgeCheck className="mr-1.5 h-3.5 w-3.5" />Subscriptions</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="mr-1.5 h-3.5 w-3.5" />Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="plans"><PlansTab /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function BarTabIcon() {
  return <DollarSign className="mr-1.5 h-3.5 w-3.5" />;
}

// ───────────── Shared hooks

function useCompanies() {
  return useQuery({
    queryKey: ["saas-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as CompanyLite[];
    },
  });
}

function usePlans() {
  return useQuery({
    queryKey: ["saas-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans" as never)
        .select("*")
        .order("sort_order")
        .order("price");
      if (error) throw error;
      return (data ?? []) as unknown as Plan[];
    },
  });
}

function useSubscriptions() {
  return useQuery({
    queryKey: ["saas-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Subscription[];
    },
  });
}

function usePayments() {
  return useQuery({
    queryKey: ["saas-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_payments" as never)
        .select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
  });
}

// ───────────── Dashboard tab

function DashboardTab() {
  const { data: plans = [] } = usePlans();
  const { data: subs = [] } = useSubscriptions();
  const { data: payments = [] } = usePayments();
  const { data: companies = [] } = useCompanies();

  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = today.slice(0, 7) + "-01";

  const mrr = subs
    .filter((s) => s.status === "active" || s.status === "trial")
    .reduce((acc, s) => {
      const p = planById[s.plan_id];
      if (!p) return acc;
      const m = p.billing_cycle === "yearly" ? p.price / 12
        : p.billing_cycle === "quarterly" ? p.price / 3
        : p.billing_cycle === "lifetime" ? 0
        : p.price;
      return acc + Number(m || 0);
    }, 0);

  const revenueThisMonth = payments
    .filter((p) => p.status === "verified" && p.paid_at >= startOfMonth)
    .reduce((a, p) => a + Number(p.amount || 0), 0);

  const active = subs.filter((s) => s.status === "active").length;
  const trial = subs.filter((s) => s.status === "trial").length;
  const pastDue = subs.filter((s) => s.status === "past_due").length;
  const trialsExpiring = subs.filter(
    (s) => s.status === "trial" && s.trial_ends_at && s.trial_ends_at <= addDays(today, 7),
  ).length;

  const planDist = useMemo(() => {
    const map = new Map<string, number>();
    subs.forEach((s) => { if (s.status === "active" || s.status === "trial") map.set(s.plan_id, (map.get(s.plan_id) ?? 0) + 1); });
    return [...map.entries()].map(([planId, count]) => ({ plan: planById[planId]?.name ?? "—", count }))
      .sort((a, b) => b.count - a.count);
  }, [subs, planById]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="MRR" value={fmt(mrr)} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Revenue this month" value={fmt(revenueThisMonth)} />
        <Stat icon={<BadgeCheck className="h-4 w-4" />} label="Active subs" value={String(active)} />
        <Stat icon={<CalendarClock className="h-4 w-4" />} label="On trial" value={String(trial)} hint={`${trialsExpiring} ending ≤7d`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Plan distribution</div>
            <Badge variant="secondary">{active + trial} subs</Badge>
          </div>
          {planDist.length === 0 ? (
            <div className="grid place-items-center p-8 text-sm text-muted-foreground">No active subscriptions</div>
          ) : (
            <div className="space-y-2">
              {planDist.map((row) => {
                const total = planDist.reduce((a, b) => a + b.count, 0);
                const pct = total ? (row.count / total) * 100 : 0;
                return (
                  <div key={row.plan}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{row.plan}</span>
                      <span className="text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Health</div>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="space-y-2 text-sm">
            <HealthRow icon={<Users className="h-4 w-4 text-primary" />} label="Companies" value={String(companies.length)} />
            <HealthRow icon={<Sparkles className="h-4 w-4 text-primary" />} label="Plans" value={String(plans.length)} />
            <HealthRow icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Past due" value={String(pastDue)} />
            <HealthRow icon={<CalendarClock className="h-4 w-4 text-warning" />} label="Trials ending ≤7d" value={String(trialsExpiring)} />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function HealthRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

// ───────────── Plans tab

const emptyPlan = {
  id: "", name: "", code: "", description: "", price: 0, currency: "BDT",
  billing_cycle: "monthly", trial_days: 0, sort_order: 0,
  is_active: true, is_public: true,
  features_text: "", limits_text: "",
};

function PlansTab() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = usePlans();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const editing = !!form.id;

  const save = useMutation({
    mutationFn: async (f: typeof emptyPlan) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.name || !f.code) throw new Error("Name and code are required");

      const features = f.features_text.split("\n").map((s) => s.trim()).filter(Boolean);
      const limits: Record<string, number> = {};
      f.limits_text.split("\n").map((s) => s.trim()).filter(Boolean).forEach((line) => {
        const [k, v] = line.split(":").map((x) => x?.trim());
        if (k && v && !Number.isNaN(Number(v))) limits[k] = Number(v);
      });

      const payload = {
        owner_id: u.user.id,
        name: f.name, code: f.code.toLowerCase(), description: f.description || null,
        price: Number(f.price) || 0, currency: f.currency,
        billing_cycle: f.billing_cycle, trial_days: Number(f.trial_days) || 0,
        features, limits,
        is_active: f.is_active, is_public: f.is_public, sort_order: Number(f.sort_order) || 0,
      };
      if (f.id) {
        const { error } = await supabase.from("saas_plans" as never).update(payload as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_plans" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["saas-plans"] });
      setOpen(false); setForm(emptyPlan);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_plans" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["saas-plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Pricing plans</div>
          <div className="text-xs text-muted-foreground">Define the plans you sell to your companies.</div>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyPlan); setOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />New plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
      ) : plans.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
          <Sparkles className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No plans yet</p>
          <p className="text-xs text-muted-foreground">Create your first subscription plan.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-semibold">{p.name}</div>
                    {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                    {!p.is_public && <Badge variant="outline">Private</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.code}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    setForm({
                      id: p.id, name: p.name, code: p.code, description: p.description ?? "",
                      price: Number(p.price), currency: p.currency, billing_cycle: p.billing_cycle,
                      trial_days: p.trial_days, sort_order: p.sort_order,
                      is_active: p.is_active, is_public: p.is_public,
                      features_text: (p.features ?? []).join("\n"),
                      limits_text: Object.entries(p.limits ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
                    });
                    setOpen(true);
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm(`Delete ${p.name}?`)) del.mutate(p.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{fmt(Number(p.price), p.currency)}</span>
                <span className="text-xs text-muted-foreground">/ {p.billing_cycle}</span>
              </div>
              {p.trial_days > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">{p.trial_days}-day trial</div>
              )}
              {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
              {p.features?.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 text-success" />{f}
                    </li>
                  ))}
                </ul>
              )}
              {Object.keys(p.limits ?? {}).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(p.limits).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs">{k}: {v}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="pro" />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" min={0} step="0.01" value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing cycle</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trial days</Label>
              <Input type="number" min={0} value={form.trial_days}
                onChange={(e) => setForm({ ...form, trial_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border"
                  checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border"
                  checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
                Public
              </label>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Features (one per line)</Label>
              <Textarea rows={4} value={form.features_text}
                onChange={(e) => setForm({ ...form, features_text: e.target.value })}
                placeholder={"Unlimited invoices\nPriority support"} />
            </div>
            <div className="col-span-2">
              <Label>Limits (key: number, one per line)</Label>
              <Textarea rows={3} value={form.limits_text}
                onChange={(e) => setForm({ ...form, limits_text: e.target.value })}
                placeholder={"users: 10\ninvoices_per_month: 1000\nstorage_mb: 2048"} />
              <p className="mt-1 text-xs text-muted-foreground">Used by feature flags / usage limits.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ───────────── Subscriptions tab

const emptySub = {
  id: "", company_id: "", plan_id: "", status: "trial",
  started_at: today(), current_period_start: today(), current_period_end: "",
  trial_ends_at: "", auto_renew: true, notes: "",
};

function SubscriptionsTab() {
  const qc = useQueryClient();
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: plans = [] } = usePlans();
  const { data: companies = [] } = useCompanies();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptySub);
  const [query, setQuery] = useState("");
  const editing = !!form.id;

  const companyById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) =>
      (companyById[s.company_id] ?? "").toLowerCase().includes(q) ||
      (planById[s.plan_id]?.name ?? "").toLowerCase().includes(q) ||
      s.status.includes(q),
    );
  }, [subs, query, companyById, planById]);

  const save = useMutation({
    mutationFn: async (f: typeof emptySub) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.company_id || !f.plan_id) throw new Error("Company and plan are required");

      const plan = planById[f.plan_id];
      let periodEnd = f.current_period_end || null;
      if (!periodEnd && f.current_period_start && plan) {
        periodEnd = addCycle(f.current_period_start, plan.billing_cycle);
      }
      let trialEnds = f.trial_ends_at || null;
      if (!trialEnds && f.status === "trial" && plan?.trial_days) {
        trialEnds = addDays(f.started_at || today(), plan.trial_days);
      }

      const payload = {
        owner_id: u.user.id,
        company_id: f.company_id, plan_id: f.plan_id, status: f.status,
        started_at: f.started_at, current_period_start: f.current_period_start || null,
        current_period_end: periodEnd, trial_ends_at: trialEnds,
        auto_renew: f.auto_renew, notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("saas_subscriptions" as never).update(payload as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_subscriptions" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Subscription updated" : "Subscription created");
      qc.invalidateQueries({ queryKey: ["saas-subscriptions"] });
      setOpen(false); setForm(emptySub);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_subscriptions" as never)
        .update({ status: "cancelled", canceled_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subscription cancelled"); qc.invalidateQueries({ queryKey: ["saas-subscriptions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_subscriptions" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subscription deleted"); qc.invalidateQueries({ queryKey: ["saas-subscriptions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search company, plan, status…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => { setForm(emptySub); setOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />New subscription
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
          <BadgeCheck className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No subscriptions</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Trial ends</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const p = planById[s.plan_id];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{companyById[s.company_id] ?? "—"}</TableCell>
                    <TableCell>
                      {p ? (
                        <div>
                          <div>{p.name}</div>
                          <div className="text-xs text-muted-foreground">{fmt(Number(p.price), p.currency)} / {p.billing_cycle}</div>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.current_period_start ?? "—"} → {s.current_period_end ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{s.trial_ends_at ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setForm({
                            id: s.id, company_id: s.company_id, plan_id: s.plan_id, status: s.status,
                            started_at: s.started_at, current_period_start: s.current_period_start ?? "",
                            current_period_end: s.current_period_end ?? "", trial_ends_at: s.trial_ends_at ?? "",
                            auto_renew: s.auto_renew, notes: s.notes ?? "",
                          });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {s.status !== "cancelled" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Cancel" onClick={() => { if (confirm("Cancel this subscription?")) cancel.mutate(s.id); }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this subscription?")) del.mutate(s.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit subscription" : "New subscription"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Company *</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Plan *</Label>
              <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} · {fmt(Number(p.price), p.currency)}/{p.billing_cycle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Started at</Label>
              <Input type="date" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} />
            </div>
            <div>
              <Label>Period start</Label>
              <Input type="date" value={form.current_period_start} onChange={(e) => setForm({ ...form, current_period_start: e.target.value })} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={form.current_period_end} onChange={(e) => setForm({ ...form, current_period_end: e.target.value })} placeholder="Auto from cycle" />
            </div>
            <div>
              <Label>Trial ends</Label>
              <Input type="date" value={form.trial_ends_at} onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value })} placeholder="Auto from plan" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border"
                  checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} />
                Auto renew
              </label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ───────────── Payments tab

const emptyPayment = {
  id: "", company_id: "", subscription_id: "", amount: 0, currency: "BDT",
  method: "bkash", txn_id: "", payer_msisdn: "",
  paid_at: today(), period_start: "", period_end: "",
  status: "verified", notes: "",
};

function PaymentsTab() {
  const qc = useQueryClient();
  const { data: payments = [], isLoading } = usePayments();
  const { data: subs = [] } = useSubscriptions();
  const { data: companies = [] } = useCompanies();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPayment);
  const editing = !!form.id;

  const companyById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const save = useMutation({
    mutationFn: async (f: typeof emptyPayment) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.company_id) throw new Error("Company is required");
      if (!f.amount || Number(f.amount) <= 0) throw new Error("Amount must be greater than 0");

      const payload = {
        owner_id: u.user.id,
        company_id: f.company_id,
        subscription_id: f.subscription_id || null,
        amount: Number(f.amount), currency: f.currency, method: f.method,
        txn_id: f.txn_id || null, payer_msisdn: f.payer_msisdn || null,
        paid_at: f.paid_at, period_start: f.period_start || null, period_end: f.period_end || null,
        status: f.status, notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("saas_payments" as never).update(payload as never).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_payments" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Payment updated" : "Payment recorded");
      qc.invalidateQueries({ queryKey: ["saas-payments"] });
      setOpen(false); setForm(emptyPayment);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_payments" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment deleted"); qc.invalidateQueries({ queryKey: ["saas-payments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const subsForCompany = subs.filter((s) => s.company_id === form.company_id);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Subscription payments</div>
          <div className="text-xs text-muted-foreground">Record bKash, Nagad, Rocket, bank or cash payments manually.</div>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyPayment); setOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Record payment
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
          <Wallet className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No payments yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paid at</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Txn / Mobile</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.paid_at}</TableCell>
                  <TableCell className="font-medium">{companyById[p.company_id] ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.method}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.txn_id ?? "—"}
                    {p.payer_msisdn && <div>{p.payer_msisdn}</div>}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{fmt(Number(p.amount), p.currency)}</TableCell>
                  <TableCell><PayStatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setForm({
                          id: p.id, company_id: p.company_id, subscription_id: p.subscription_id ?? "",
                          amount: Number(p.amount), currency: p.currency, method: p.method,
                          txn_id: p.txn_id ?? "", payer_msisdn: p.payer_msisdn ?? "",
                          paid_at: p.paid_at, period_start: p.period_start ?? "", period_end: p.period_end ?? "",
                          status: p.status, notes: p.notes ?? "",
                        });
                        setOpen(true);
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this payment?")) del.mutate(p.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit payment" : "Record payment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Company *</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v, subscription_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Subscription</Label>
              <Select
                value={form.subscription_id || "__none__"}
                onValueChange={(v) => setForm({ ...form, subscription_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {subsForCompany.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.status} · started {s.started_at}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" min={0} step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input value={form.txn_id} onChange={(e) => setForm({ ...form, txn_id: e.target.value })} placeholder="e.g. 9XY12AB34C" />
            </div>
            <div>
              <Label>Payer mobile</Label>
              <Input value={form.payer_msisdn} onChange={(e) => setForm({ ...form, payer_msisdn: e.target.value })} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label>Paid at</Label>
              <Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Period start</Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              </div>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editing ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ───────────── Helpers

function StatusBadge({ status }: { status: string }) {
  const variant: any = status === "active" ? "default"
    : status === "trial" ? "secondary"
    : status === "past_due" ? "destructive"
    : "outline";
  return <Badge variant={variant} className="capitalize">{status.replace("_", " ")}</Badge>;
}

function PayStatusBadge({ status }: { status: string }) {
  const variant: any = status === "verified" ? "default"
    : status === "pending" ? "secondary"
    : status === "failed" ? "destructive"
    : "outline";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addCycle(date: string, cycle: string) {
  const d = new Date(date);
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else if (cycle === "lifetime") d.setFullYear(d.getFullYear() + 100);
  return d.toISOString().slice(0, 10);
}
