import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingCart, Wallet, Receipt,
  Package, AlertTriangle, Plus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const kpis = [
  { label: "Today's Sales", value: "৳ 1,28,400", delta: "+12.4%", up: true, icon: ShoppingCart, hint: "vs yesterday", tint: "bg-chart-1/15 text-chart-1 ring-chart-1/20" },
  { label: "Today's Purchase", value: "৳ 64,200", delta: "+3.1%", up: true, icon: Receipt, hint: "vs yesterday", tint: "bg-chart-2/15 text-chart-2 ring-chart-2/20" },
  { label: "Today's Expense", value: "৳ 18,750", delta: "-5.2%", up: false, icon: Wallet, hint: "vs yesterday", tint: "bg-chart-4/15 text-chart-4 ring-chart-4/20" },
  { label: "Today's Profit", value: "৳ 45,450", delta: "+22.8%", up: true, icon: TrendingUp, hint: "net margin 35%", tint: "bg-chart-3/15 text-chart-3 ring-chart-3/20" },
];

const monthly = [
  { m: "Jan", sales: 240, purchase: 180 }, { m: "Feb", sales: 280, purchase: 200 },
  { m: "Mar", sales: 320, purchase: 220 }, { m: "Apr", sales: 300, purchase: 240 },
  { m: "May", sales: 360, purchase: 260 }, { m: "Jun", sales: 420, purchase: 280 },
  { m: "Jul", sales: 480, purchase: 320 }, { m: "Aug", sales: 520, purchase: 360 },
  { m: "Sep", sales: 500, purchase: 340 }, { m: "Oct", sales: 580, purchase: 380 },
  { m: "Nov", sales: 640, purchase: 420 }, { m: "Dec", sales: 720, purchase: 460 },
];

const ie = [
  { m: "Jun", income: 420, expense: 280 }, { m: "Jul", income: 480, expense: 310 },
  { m: "Aug", income: 520, expense: 340 }, { m: "Sep", income: 500, expense: 330 },
  { m: "Oct", income: 580, expense: 360 }, { m: "Nov", income: 640, expense: 400 },
];

const topProducts = [
  { name: "iPhone 15 Pro 256GB", sold: 142, revenue: "৳ 1,98,80,000" },
  { name: "Samsung Galaxy S24", sold: 98, revenue: "৳ 1,07,80,000" },
  { name: "MacBook Air M3", sold: 56, revenue: "৳ 78,40,000" },
  { name: "AirPods Pro 2", sold: 312, revenue: "৳ 93,60,000" },
  { name: "iPad Air", sold: 74, revenue: "৳ 51,80,000" },
];

const lowStock = [
  { name: "USB-C Cable 2m", sku: "CBL-USC-002", stock: 4, reorder: 20 },
  { name: "Logitech MX Master 3S", sku: "MOU-LGT-3S", stock: 2, reorder: 10 },
  { name: "Anker 65W Charger", sku: "CHG-ANK-65W", stock: 6, reorder: 25 },
];

const recentOrders = [
  { id: "INV-10284", customer: "Rahim Trading", amount: "৳ 24,500", status: "Paid" },
  { id: "INV-10283", customer: "Karim Electronics", amount: "৳ 87,200", status: "Pending" },
  { id: "INV-10282", customer: "Walk-in", amount: "৳ 3,150", status: "Paid" },
  { id: "INV-10281", customer: "Hossain & Sons", amount: "৳ 1,42,000", status: "Partial" },
  { id: "INV-10280", customer: "Walk-in", amount: "৳ 8,900", status: "Paid" },
];

function DashboardPage() {
  const { symbol: sym } = useCurrency();
  const fmtMoney = (n: number) => `${sym} ${n.toLocaleString()}`;
  const kpis = [
    { label: "Today's Sales", value: fmtMoney(128400), delta: "+12.4%", up: true, icon: ShoppingCart, hint: "vs yesterday", tint: "bg-chart-1/15 text-chart-1 ring-chart-1/20" },
    { label: "Today's Purchase", value: fmtMoney(64200), delta: "+3.1%", up: true, icon: Receipt, hint: "vs yesterday", tint: "bg-chart-2/15 text-chart-2 ring-chart-2/20" },
    { label: "Today's Expense", value: fmtMoney(18750), delta: "-5.2%", up: false, icon: Wallet, hint: "vs yesterday", tint: "bg-chart-4/15 text-chart-4 ring-chart-4/20" },
    { label: "Today's Profit", value: fmtMoney(45450), delta: "+22.8%", up: true, icon: TrendingUp, hint: "net margin 35%", tint: "bg-chart-3/15 text-chart-3 ring-chart-3/20" },
  ];
  const topProducts = [
    { name: "iPhone 15 Pro 256GB", sold: 142, revenue: fmtMoney(19880000) },
    { name: "Samsung Galaxy S24", sold: 98, revenue: fmtMoney(10780000) },
    { name: "MacBook Air M3", sold: 56, revenue: fmtMoney(7840000) },
    { name: "AirPods Pro 2", sold: 312, revenue: fmtMoney(9360000) },
    { name: "iPad Air", sold: 74, revenue: fmtMoney(5180000) },
  ];
  const lowStock = [
    { name: "USB-C Cable 2m", sku: "CBL-USC-002", stock: 4, reorder: 20 },
    { name: "Logitech MX Master 3S", sku: "MOU-LGT-3S", stock: 2, reorder: 10 },
    { name: "Anker 65W Charger", sku: "CHG-ANK-65W", stock: 6, reorder: 25 },
  ];
  const recentOrders = [
    { id: "INV-10284", customer: "Rahim Trading", amount: fmtMoney(24500), status: "Paid" },
    { id: "INV-10283", customer: "Karim Electronics", amount: fmtMoney(87200), status: "Pending" },
    { id: "INV-10282", customer: "Walk-in", amount: fmtMoney(3150), status: "Paid" },
    { id: "INV-10281", customer: "Hossain & Sons", amount: fmtMoney(142000), status: "Partial" },
    { id: "INV-10280", customer: "Walk-in", amount: fmtMoney(8900), status: "Paid" },
  ];
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's performance across your company."
        actions={
          <>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Sale</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ${k.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-xl font-semibold tracking-tight">{k.value}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${k.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </span>
                <span className="text-muted-foreground">{k.hint}</span>
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
                    <td className="px-3 py-2 text-right font-medium">{p.revenue}</td>
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
