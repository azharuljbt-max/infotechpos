import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Sparkles, CheckCircle2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type Plan = {
  id: string; name: string; code: string; description: string | null;
  price: number; currency: string; billing_cycle: string; trial_days: number;
  features: string[]; limits: Record<string, number>;
  is_active: boolean; is_public: boolean; sort_order: number;
};

export type Subscription = {
  id: string; company_id: string; plan_id: string; status: string;
  started_at: string; current_period_start: string | null; current_period_end: string | null;
  trial_ends_at: string | null; cancel_at: string | null; canceled_at: string | null;
  auto_renew: boolean; notes: string | null;
};

export type Payment = {
  id: string; subscription_id: string | null; company_id: string;
  amount: number; currency: string; method: string; txn_id: string | null;
  payer_msisdn: string | null; paid_at: string;
  period_start: string | null; period_end: string | null;
  status: string; notes: string | null;
};

export type CompanyLite = { id: string; name: string };

export const CYCLES = ["monthly", "quarterly", "yearly", "lifetime"];
export const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR"];
export const SUB_STATUS = ["trial", "active", "past_due", "cancelled", "expired"];
export const PAY_METHODS = ["bkash", "nagad", "rocket", "cash", "bank", "card", "other"];
export const PAY_STATUS = ["pending", "verified", "failed", "refunded"];

export const fmt = (n: number, cur = "BDT") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function useSaasCompanies() {
  return useQuery({
    queryKey: ["sa-companies-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as CompanyLite[];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["sa-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans" as never).select("*")
        .order("sort_order").order("price");
      if (error) throw error;
      return (data ?? []) as unknown as Plan[];
    },
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ["sa-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions" as never).select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Subscription[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["sa-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_payments" as never).select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
  });
}

// ───────────── Plans editor (shared)

const emptyPlan = {
  id: "", name: "", code: "", description: "", price: 0, currency: "BDT",
  billing_cycle: "monthly", trial_days: 0, sort_order: 0,
  is_active: true, is_public: true, features_text: "", limits_text: "",
};

export function PlansEditor() {
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
      qc.invalidateQueries({ queryKey: ["sa-plans"] });
      setOpen(false); setForm(emptyPlan);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_plans" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["sa-plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Pricing plans</div>
          <div className="text-xs text-muted-foreground">Plans you sell to companies.</div>
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
              {p.trial_days > 0 && <div className="mt-1 text-xs text-muted-foreground">{p.trial_days}-day trial</div>}
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
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
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
                <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Trial days</Label><Input type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Features (one per line)</Label><Textarea rows={3} value={form.features_text} onChange={(e) => setForm({ ...form, features_text: e.target.value })} /></div>
            <div className="col-span-2"><Label>Limits (key: number per line)</Label><Textarea rows={3} value={form.limits_text} onChange={(e) => setForm({ ...form, limits_text: e.target.value })} placeholder="users: 10&#10;invoices: 1000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Subscriptions editor (assign plan to company)
export function SubscriptionsEditor() {
  const qc = useQueryClient();
  const { data: subs = [] } = useSubscriptions();
  const { data: plans = [] } = usePlans();
  const { data: companies = [] } = useSaasCompanies();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState("active");

  const planById = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);
  const compById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const plan = planById[planId];
      if (!plan) throw new Error("Pick a plan");
      const start = new Date(); const end = new Date();
      if (plan.billing_cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
      else if (plan.billing_cycle === "quarterly") end.setMonth(end.getMonth() + 3);
      else if (plan.billing_cycle === "monthly") end.setMonth(end.getMonth() + 1);
      else end.setFullYear(end.getFullYear() + 100);
      const { error } = await supabase.from("saas_subscriptions" as never).insert({
        owner_id: u.user.id, company_id: companyId, plan_id: planId, status,
        started_at: start.toISOString(),
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: status === "trial" && plan.trial_days
          ? addDays(start.toISOString().slice(0, 10), plan.trial_days) : null,
        auto_renew: true,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription created");
      qc.invalidateQueries({ queryKey: ["sa-subs"] });
      setOpen(false); setCompanyId(""); setPlanId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Company subscriptions</div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New</Button>
      </div>
      <div className="space-y-2">
        {subs.length === 0 && <div className="text-sm text-muted-foreground p-8 text-center">No subscriptions yet</div>}
        {subs.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">{compById[s.company_id]?.name ?? s.company_id.slice(0,8)}</div>
              <div className="text-xs text-muted-foreground">{planById[s.plan_id]?.name ?? "—"} · {s.status}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {s.current_period_end ? `until ${new Date(s.current_period_end).toLocaleDateString()}` : ""}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !companyId || !planId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Payments editor
export function PaymentsEditor() {
  const qc = useQueryClient();
  const { data: payments = [] } = usePayments();
  const { data: companies = [] } = useSaasCompanies();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: "", amount: 0, currency: "BDT", method: "bkash", txn_id: "", payer_msisdn: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("saas_payments" as never).insert({
        owner_id: u.user.id, company_id: form.company_id,
        amount: Number(form.amount) || 0, currency: form.currency, method: form.method,
        txn_id: form.txn_id || null, payer_msisdn: form.payer_msisdn || null,
        paid_at: new Date().toISOString(), status: "verified",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["sa-payments"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("saas_payments" as never).update({ status } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-payments"] }); toast.success("Updated"); },
  });

  const compById = Object.fromEntries(companies.map(c => [c.id, c]));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Manual payments</div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Record</Button>
      </div>
      <div className="space-y-2">
        {payments.length === 0 && <div className="text-sm text-muted-foreground p-8 text-center">No payments</div>}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">{fmt(Number(p.amount), p.currency)} <span className="text-xs text-muted-foreground ml-2 capitalize">{p.method}</span></div>
              <div className="text-xs text-muted-foreground">
                {compById[p.company_id]?.name ?? p.company_id.slice(0,8)} · {p.txn_id ?? "no txn"} · {p.payer_msisdn ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "verified" ? "default" : "secondary"}>{p.status}</Badge>
              {p.status !== "verified" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: p.id, status: "verified" })}>Verify</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Transaction ID</Label><Input value={form.txn_id} onChange={(e) => setForm({ ...form, txn_id: e.target.value })} /></div>
            <div><Label>Payer mobile</Label><Input value={form.payer_msisdn} onChange={(e) => setForm({ ...form, payer_msisdn: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.company_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
