import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingCart, Wallet, Receipt,
  AlertTriangle, Plus, CalendarIcon, Landmark, ArrowLeftRight, Banknote, Clock, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { useCurrency } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  component: DashboardPage,
});

type RangePreset = "7d" | "30d" | "90d" | "custom";


const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthBuckets(count: number) {
  const now = new Date();
  const buckets: { key: string; m: string; year: number; month: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      m: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return buckets;
}


function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + 1); return x; }
function fmtDateLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function DashboardPage() {
  const { symbol: sym } = useCurrency();
  const fmtMoney = (n: number) => `${sym} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calOpen, setCalOpen] = useState(false);

  const { start, end, label, days } = useMemo(() => {
    const now = new Date();
    if (preset === "custom" && customRange?.from) {
      const s = startOfDay(customRange.from);
      const e = endOfDay(customRange.to ?? customRange.from);
      const d = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
      return { start: s, end: e, days: d, label: `${fmtDateLabel(s)} – ${fmtDateLabel(new Date(e.getTime() - 1))}` };
    }
    const d = preset === "30d" ? 30 : preset === "90d" ? 90 : 7;
    const e = endOfDay(now);
    const s = new Date(e); s.setDate(s.getDate() - d);
    return { start: s, end: e, days: d, label: `Last ${d} days` };
  }, [preset, customRange]);

  const rangeKey = `${start.toISOString()}|${end.toISOString()}`;

  const { data: totals } = useQuery({
    queryKey: ["dashboard-range-totals", rangeKey],
    queryFn: async () => {
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const startDate = startIso.slice(0, 10);
      const endDate = endIso.slice(0, 10);
      const [salesRes, purchasesRes, expensesRes] = await Promise.all([
        supabase.from("sales").select("total").gte("created_at", startIso).lt("created_at", endIso),
        supabase.from("purchases").select("total").gte("created_at", startIso).lt("created_at", endIso),
        supabase.from("expenses").select("amount").gte("expense_date", startDate).lt("expense_date", endDate),
      ]);
      const sum = (rows: any[] | null, key: string) =>
        (rows ?? []).reduce((a, r) => a + Number(r[key] ?? 0), 0);
      const sales = sum(salesRes.data, "total");
      const purchase = sum(purchasesRes.data, "total");
      const expense = sum(expensesRes.data, "amount");
      return { sales, purchase, expense, profit: sales - purchase - expense };
    },
  });

  const { data: daily } = useQuery({
    queryKey: ["dashboard-daily-due"],
    queryFn: async () => {
      const now = new Date();
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      const dayStartIso = dayStart.toISOString();
      const dayEndIso = dayEnd.toISOString();
      const dayStartDate = dayStartIso.slice(0, 10);
      const dayEndDate = dayEndIso.slice(0, 10);

      const isBank = (m?: string | null) => {
        const x = (m ?? "").toLowerCase();
        return x !== "" && x !== "cash";
      };

      const [salesToday, purchasesToday, expensesToday, salesAll, purchasesAll] = await Promise.all([
        supabase.from("sales").select("total, amount_paid, payment_method")
          .gte("created_at", dayStartIso).lt("created_at", dayEndIso),
        supabase.from("purchases").select("total, amount_paid, payment_method")
          .gte("created_at", dayStartIso).lt("created_at", dayEndIso),
        supabase.from("expenses").select("amount, payment_method")
          .gte("expense_date", dayStartDate).lt("expense_date", dayEndDate),
        supabase.from("sales").select("total, amount_paid"),
        supabase.from("purchases").select("total, amount_paid"),
      ]);

      const s = salesToday.data ?? [];
      const p = purchasesToday.data ?? [];
      const e = expensesToday.data ?? [];

      const bank =
        s.filter((r: any) => isBank(r.payment_method)).reduce((a, r: any) => a + Number(r.amount_paid ?? 0), 0) +
        p.filter((r: any) => isBank(r.payment_method)).reduce((a, r: any) => a + Number(r.amount_paid ?? 0), 0) +
        e.filter((r: any) => isBank(r.payment_method)).reduce((a, r: any) => a + Number(r.amount ?? 0), 0);

      const transactions = s.length + p.length + e.length;

      const payment =
        s.reduce((a, r: any) => a + Number(r.amount_paid ?? 0), 0) +
        p.reduce((a, r: any) => a + Number(r.amount_paid ?? 0), 0) +
        e.reduce((a, r: any) => a + Number(r.amount ?? 0), 0);

      const dailyDue =
        s.reduce((a, r: any) => a + Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0)), 0) +
        p.reduce((a, r: any) => a + Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0)), 0);

      const totalDue =
        (salesAll.data ?? []).reduce((a, r: any) => a + Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0)), 0) +
        (purchasesAll.data ?? []).reduce((a, r: any) => a + Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0)), 0);

      return { bank, transactions, payment, dailyDue, totalDue };
    },
  });


  const sales = totals?.sales ?? 0;
  const purchase = totals?.purchase ?? 0;
  const expense = totals?.expense ?? 0;
  const profit = totals?.profit ?? 0;
  const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;

  const rangeHint = preset === "custom" ? label : `last ${days} days`;
  const kpis = [
    { label: "Sales", value: fmtMoney(sales), delta: "", up: true, icon: ShoppingCart, hint: rangeHint,
      gradient: "from-[oklch(0.64_0.18_38)] to-[oklch(0.72_0.2_50)]" },
    { label: "Purchase", value: fmtMoney(purchase), delta: "", up: true, icon: Receipt, hint: rangeHint,
      gradient: "from-[oklch(0.6_0.2_265)] to-[oklch(0.65_0.18_295)]" },
    { label: "Expense", value: fmtMoney(expense), delta: "", up: false, icon: Wallet, hint: rangeHint,
      gradient: "from-[oklch(0.65_0.22_350)] to-[oklch(0.6_0.2_15)]" },
    { label: "Profit", value: fmtMoney(profit), delta: "", up: profit >= 0, icon: TrendingUp, hint: `net margin ${margin}%`,
      gradient: "from-[oklch(0.62_0.16_155)] to-[oklch(0.7_0.16_180)]" },
  ];

  const { data: topProducts = [] } = useQuery({
    queryKey: ["dashboard-top-products", rangeKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("product_name, quantity, total")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      const map = new Map<string, { name: string; sold: number; revenue: number }>();
      for (const r of data ?? []) {
        const key = r.product_name ?? "Unknown";
        const cur = map.get(key) ?? { name: key, sold: 0, revenue: 0 };
        cur.sold += Number(r.quantity ?? 0);
        cur.revenue += Number(r.total ?? 0);
        map.set(key, cur);
      }
      return Array.from(map.values()).sort((a, b) => b.sold - a.sold).slice(0, 5);
    },
  });


  const { data: lowStock = [] } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("name, sku, stock, reorder_level")
        .order("stock", { ascending: true })
        .limit(50);
      return (data ?? [])
        .filter((p) => Number(p.reorder_level ?? 0) > 0 && Number(p.stock ?? 0) <= Number(p.reorder_level ?? 0))
        .slice(0, 5)
        .map((p) => ({ name: p.name, sku: p.sku ?? "—", stock: Number(p.stock ?? 0), reorder: Number(p.reorder_level ?? 0) }));
    },
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, receipt_no, customer_name, total, status, amount_paid")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []).map((s) => {
        const paid = Number(s.amount_paid ?? 0);
        const total = Number(s.total ?? 0);
        const status = s.status
          ? s.status
          : paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending";
        return {
          id: s.receipt_no ?? s.id.slice(0, 8),
          customer: s.customer_name ?? "Walk-in",
          amount: fmtMoney(total),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        };
      });
    },
  });

  const { data: monthly = [] } = useQuery({
    queryKey: ["dashboard-monthly-sales-purchase"],
    queryFn: async () => {
      const buckets = monthBuckets(12);
      const start = new Date(buckets[0].year, buckets[0].month, 1).toISOString();
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from("sales").select("total, created_at").gte("created_at", start),
        supabase.from("purchases").select("total, created_at").gte("created_at", start),
      ]);
      const init = buckets.map((b) => ({ m: b.m, key: b.key, sales: 0, purchase: 0 }));
      const idx = new Map(init.map((r, i) => [r.key, i]));
      for (const r of salesRes.data ?? []) {
        const d = new Date(r.created_at as string);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) init[i].sales += Number(r.total ?? 0);
      }
      for (const r of purchasesRes.data ?? []) {
        const d = new Date(r.created_at as string);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) init[i].purchase += Number(r.total ?? 0);
      }
      return init;
    },
  });

  const { data: ie = [] } = useQuery({
    queryKey: ["dashboard-income-expense"],
    queryFn: async () => {
      const buckets = monthBuckets(6);
      const start = new Date(buckets[0].year, buckets[0].month, 1);
      const startIso = start.toISOString();
      const startDate = startIso.slice(0, 10);
      const [salesRes, expensesRes] = await Promise.all([
        supabase.from("sales").select("total, created_at").gte("created_at", startIso),
        supabase.from("expenses").select("amount, expense_date").gte("expense_date", startDate),
      ]);
      const init = buckets.map((b) => ({ m: b.m, key: b.key, income: 0, expense: 0 }));
      const idx = new Map(init.map((r, i) => [r.key, i]));
      for (const r of salesRes.data ?? []) {
        const d = new Date(r.created_at as string);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) init[i].income += Number(r.total ?? 0);
      }
      for (const r of expensesRes.data ?? []) {
        const d = new Date(r.expense_date as string);
        const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (i !== undefined) init[i].expense += Number(r.amount ?? 0);
      }
      return init;
    },
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Performance across your company."
        actions={
          <>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Sale</Button>
          </>
        }
      />

      {/* Date range selector */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 shadow-sm">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPreset(p); setCustomRange(undefined); }}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition",
                preset === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition",
                  preset === "custom"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Custom
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(r) => {
                  setCustomRange(r);
                  setPreset("custom");
                  if (r?.from && r?.to) setCalOpen(false);
                }}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={`relative overflow-hidden p-4 text-white transition hover:shadow-lg bg-gradient-to-br ${k.gradient} border-0`}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-white/80">{k.label}</div>
                  <div className="text-xl font-semibold tracking-tight">{k.value}</div>
                </div>
              </div>
              <div className="relative mt-3 flex items-center gap-2 text-xs">
                {k.delta && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 font-medium">
                    {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {k.delta}
                  </span>
                )}
                <span className="text-white/80">{k.hint}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sales vs Purchases</h3>
              <p className="text-xs text-muted-foreground">Monthly, last 12 months (in thousands)</p>
            </div>
            <Badge variant="secondary" className="text-xs">2026</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="purchase" stroke="var(--color-chart-2)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Income vs Expense</h3>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ie}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tables */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top selling products</h3>
            <Button variant="ghost" size="sm" className="text-xs">View all</Button>
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Sold</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{p.sold}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <h3 className="text-sm font-semibold">Low stock</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{lowStock.length}</Badge>
          </div>
          <ul className="space-y-2">
            {lowStock.map((p) => (
              <li key={p.sku} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-destructive text-xs font-semibold">{p.stock}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono">{p.sku}</span>
                  <span>Reorder at {p.reorder}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-destructive" style={{ width: `${(p.stock / p.reorder) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent orders</h3>
            <Button variant="ghost" size="sm" className="text-xs">View all</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Invoice</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                    <td className="px-3 py-2">{o.customer}</td>
                    <td className="px-3 py-2 text-right font-medium">{o.amount}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge
                        variant="secondary"
                        className={
                          o.status === "Paid" ? "bg-success/10 text-success border-success/20" :
                          o.status === "Pending" ? "bg-warning/10 text-warning-foreground border-warning/30" :
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
