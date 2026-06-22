import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { fmt, usePayments, useSubscriptions, useSaasCompanies, usePlans } from "@/lib/saas";

export const Route = createFileRoute("/super-admin/_protected/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: payments = [] } = usePayments();
  const { data: subs = [] } = useSubscriptions();
  const { data: companies = [] } = useSaasCompanies();
  const { data: plans = [] } = usePlans();

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    payments.filter(p => p.status === "verified").forEach(p => {
      const month = p.paid_at.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + Number(p.amount || 0));
    });
    return [...map.entries()].sort().reverse().slice(0, 12);
  }, [payments]);

  const revenueByMethod = useMemo(() => {
    const map = new Map<string, number>();
    payments.filter(p => p.status === "verified").forEach(p => {
      map.set(p.method, (map.get(p.method) ?? 0) + Number(p.amount || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const subsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    subs.forEach(s => map.set(s.status, (map.get(s.status) ?? 0) + 1));
    return [...map.entries()];
  }, [subs]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">System Reports</h1>
        <p className="text-sm text-muted-foreground">Platform-wide revenue and tenant insights.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total companies</div><div className="text-2xl font-semibold">{companies.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Active plans</div><div className="text-2xl font-semibold">{plans.filter(p => p.is_active).length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Verified payments</div><div className="text-2xl font-semibold">{payments.filter(p => p.status === "verified").length}</div></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Revenue by month</div>
          {revenueByMonth.length === 0 ? <div className="text-sm text-muted-foreground p-4">No data</div> : (
            <div className="space-y-2">
              {revenueByMonth.map(([m, v]) => (
                <div key={m} className="flex justify-between text-sm"><span>{m}</span><span className="font-medium tabular-nums">{fmt(v)}</span></div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Revenue by method</div>
          {revenueByMethod.length === 0 ? <div className="text-sm text-muted-foreground p-4">No data</div> : (
            <div className="space-y-2">
              {revenueByMethod.map(([m, v]) => (
                <div key={m} className="flex justify-between text-sm"><span className="capitalize">{m}</span><span className="font-medium tabular-nums">{fmt(v)}</span></div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4 md:col-span-2">
          <div className="mb-3 text-sm font-medium">Subscriptions by status</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {subsByStatus.map(([s, n]) => (
              <div key={s} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground capitalize">{s}</div>
                <div className="text-xl font-semibold">{n}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
