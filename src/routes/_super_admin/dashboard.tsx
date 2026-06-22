import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Wallet, BadgeCheck, CalendarClock, Building2, Sparkles, Users, AlertTriangle } from "lucide-react";
import { fmt, addDays, usePlans, useSubscriptions, usePayments, useSaasCompanies } from "@/lib/saas";

export const Route = createFileRoute("/_super_admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: plans = [] } = usePlans();
  const { data: subs = [] } = useSubscriptions();
  const { data: payments = [] } = usePayments();
  const { data: companies = [] } = useSaasCompanies();

  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = today.slice(0, 7) + "-01";

  const mrr = subs
    .filter((s) => s.status === "active" || s.status === "trial")
    .reduce((acc, s) => {
      const p = planById[s.plan_id]; if (!p) return acc;
      const m = p.billing_cycle === "yearly" ? p.price / 12
        : p.billing_cycle === "quarterly" ? p.price / 3
        : p.billing_cycle === "lifetime" ? 0 : p.price;
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">SaaS Dashboard</h1>
        <p className="text-sm text-muted-foreground">Global platform metrics across all tenants.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="MRR" value={fmt(mrr)} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Revenue this month" value={fmt(revenueThisMonth)} />
        <Stat icon={<BadgeCheck className="h-4 w-4" />} label="Active subs" value={String(active)} />
        <Stat icon={<CalendarClock className="h-4 w-4" />} label="On trial" value={String(trial)} hint={`${trialsExpiring} ending ≤7d`} />
      </div>
      <Card className="p-4">
        <div className="mb-3 text-sm font-medium">Platform health</div>
        <ul className="space-y-2 text-sm">
          <Row icon={<Building2 className="h-4 w-4 text-primary" />} label="Companies" value={String(companies.length)} />
          <Row icon={<Users className="h-4 w-4 text-primary" />} label="Workspaces" value={String(new Set(companies.map((c: any) => c.id)).size)} />
          <Row icon={<Sparkles className="h-4 w-4 text-primary" />} label="Plans" value={String(plans.length)} />
          <Row icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Past due" value={String(pastDue)} />
          <Row icon={<Badge variant="secondary" className="text-[10px]">trial</Badge>} label="Trials ending ≤7d" value={String(trialsExpiring)} />
        </ul>
      </Card>
    </div>
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
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
