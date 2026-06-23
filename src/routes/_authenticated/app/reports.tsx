import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, FileSpreadsheet, FileText, Search } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: ReportsPage,
});

const startOf = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

function toCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function toXLSX(rows: Record<string, any>[], filename: string, sheetName = "Report") {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

async function toPDF(title: string, rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  const headers = Object.keys(rows[0]);
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 20);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => headers.map((h) => (r[h] == null ? "" : String(r[h])))),
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] },
  });
  doc.save(filename);
}

function matches(row: Record<string, any>, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(needle));
}

function ReportsPage() {
  const { fmt, symbol } = useCurrency();
  const [range, setRange] = useState("30");
  const [tab, setTab] = useState("sales");

  const since = useMemo(() => startOf(parseInt(range, 10)), [range]);

  const { data: sales = [] } = useQuery({
    queryKey: ["rep-sales", since],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*").gte("created_at", since).order("created_at");
      return data ?? [];
    },
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["rep-purchases", since],
    queryFn: async () => {
      const { data } = await supabase.from("purchases").select("*").gte("created_at", since).order("created_at");
      return data ?? [];
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["rep-expenses", since],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").gte("expense_date", since.slice(0, 10)).order("expense_date");
      return data ?? [];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["rep-invoices", since],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").gte("created_at", since);
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["rep-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data ?? [];
    },
  });
  const { data: saleItems = [] } = useQuery({
    queryKey: ["rep-sale-items", since],
    queryFn: async () => {
      const ids = sales.map((s: any) => s.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("sale_items").select("*").in("sale_id", ids);
      return data ?? [];
    },
    enabled: sales.length > 0,
  });

  const totalSales = sales.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
  const totalPurchases = purchases.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
  const totalExpenses = expenses.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const dueFromInvoices = invoices.reduce(
    (s: number, r: any) => s + Math.max(0, Number(r.total || 0) - Number(r.amount_paid || 0)),
    0,
  );
  const stockValue = products.reduce((s: number, p: any) => s + Number(p.cost || 0) * Number(p.stock || 0), 0);
  const lowStock = products.filter((p: any) => Number(p.stock || 0) <= Number(p.reorder_level || 0));

  // group by day
  const dayMap: Record<string, { day: string; sales: number; purchases: number; expenses: number }> = {};
  const ensure = (d: string) => (dayMap[d] ??= { day: d, sales: 0, purchases: 0, expenses: 0 });
  sales.forEach((s: any) => (ensure(s.created_at.slice(0, 10)).sales += Number(s.total || 0)));
  purchases.forEach((p: any) => (ensure(p.created_at.slice(0, 10)).purchases += Number(p.total || 0)));
  expenses.forEach((e: any) => (ensure(e.expense_date).expenses += Number(e.amount || 0)));
  const trend = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));

  // top products
  const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  saleItems.forEach((it: any) => {
    const key = it.product_id || it.name;
    const name = it.name || products.find((p: any) => p.id === it.product_id)?.name || "Unknown";
    prodMap[key] ??= { name, qty: 0, revenue: 0 };
    prodMap[key].qty += Number(it.quantity || 0);
    prodMap[key].revenue += Number(it.quantity || 0) * Number(it.unit_price || it.price || 0);
  });
  const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // expense by category
  const catMap: Record<string, number> = {};
  expenses.forEach((e: any) => {
    catMap[e.category || "Other"] = (catMap[e.category || "Other"] || 0) + Number(e.amount || 0);
  });
  const expenseByCat = Object.entries(catMap).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="h-6 w-6" /> Reports</h1>
          <p className="text-sm text-muted-foreground">Sales, purchases, expenses, inventory & financial summaries.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Date Range</Label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Sales" value={fmt(totalSales)} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <Kpi label="Total Purchases" value={fmt(totalPurchases)} icon={<TrendingDown className="h-4 w-4 text-blue-500" />} />
        <Kpi label="Total Expenses" value={fmt(totalExpenses)} icon={<DollarSign className="h-4 w-4 text-amber-500" />} />
        <Kpi label="Net Profit" value={fmt(netProfit)} icon={<DollarSign className={`h-4 w-4 ${netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`} />} />
        <Kpi label="Gross Profit" value={fmt(grossProfit)} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <Kpi label="Outstanding Dues" value={fmt(dueFromInvoices)} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} />
        <Kpi label="Stock Value" value={fmt(stockValue)} icon={<Package className="h-4 w-4 text-indigo-500" />} />
        <Kpi label="Low Stock Items" value={String(lowStock.length)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="dues">Dues</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Trend</CardTitle>
              <Button size="sm" variant="outline" onClick={() => toCSV(sales as any, "sales.csv")}><Download className="mr-2 h-4 w-4" />Export</Button>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v: any) => `${symbol}${Number(v).toFixed(2)}`} /><Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topProducts.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No sales in selected period</TableCell></TableRow>) : topProducts.map((p, i) => (
                    <TableRow key={i}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell><TableCell className="text-right">{fmt(p.revenue)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Purchases</CardTitle><Button size="sm" variant="outline" onClick={() => toCSV(purchases as any, "purchases.csv")}><Download className="mr-2 h-4 w-4" />Export</Button></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell></TableRow>) : purchases.map((p: any) => (
                    <TableRow key={p.id}><TableCell>{p.invoice_no}</TableCell><TableCell>{p.supplier_name}</TableCell><TableCell>{p.purchase_date}</TableCell><TableCell><Badge variant="secondary">{p.status}</Badge></TableCell><TableCell className="text-right">{fmt(p.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Expenses by Category</CardTitle><Button size="sm" variant="outline" onClick={() => toCSV(expenses as any, "expenses.csv")}><Download className="mr-2 h-4 w-4" />Export</Button></CardHeader>
            <CardContent className="h-72">
              {expenseByCat.length === 0 ? <div className="flex h-full items-center justify-center text-muted-foreground">No expenses</div> : (
                <ResponsiveContainer><PieChart><Pie data={expenseByCat} dataKey="value" nameKey="name" outerRadius={90} label>{expenseByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => `${symbol}${Number(v).toFixed(2)}`} /><Legend /></PieChart></ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle>Profit & Loss Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PnLRow label="Revenue (Sales)" value={fmt(totalSales)} />
              <PnLRow label="Cost of Goods (Purchases)" value={`- ${fmt(totalPurchases)}`} />
              <PnLRow label="Gross Profit" value={fmt(grossProfit)} bold />
              <PnLRow label="Operating Expenses" value={`- ${fmt(totalExpenses)}`} />
              <PnLRow label="Net Profit" value={fmt(netProfit)} bold highlight={netProfit >= 0 ? "pos" : "neg"} />
              <div className="h-72 pt-4">
                <ResponsiveContainer><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v: any) => `${symbol}${Number(v).toFixed(2)}`} /><Legend /><Bar dataKey="sales" fill="hsl(var(--primary))" /><Bar dataKey="purchases" fill="#3b82f6" /><Bar dataKey="expenses" fill="#f59e0b" /></BarChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Low / Out of Stock</CardTitle><Button size="sm" variant="outline" onClick={() => toCSV(lowStock as any, "low-stock.csv")}><Download className="mr-2 h-4 w-4" />Export</Button></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Reorder Level</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lowStock.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">All stocked up</TableCell></TableRow>) : lowStock.map((p: any) => (
                    <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.sku}</TableCell><TableCell className="text-right">{p.stock}</TableCell><TableCell className="text-right">{p.reorder_level}</TableCell><TableCell className="text-right">{fmt(Number(p.cost || 0) * Number(p.stock || 0))}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Outstanding Invoices</CardTitle><Button size="sm" variant="outline" onClick={() => toCSV(invoices as any, "invoices.csv")}><Download className="mr-2 h-4 w-4" />Export</Button></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.filter((i: any) => Number(i.total) > Number(i.amount_paid || 0)).map((i: any) => (
                    <TableRow key={i.id}><TableCell>{i.invoice_no}</TableCell><TableCell>{i.customer_name}</TableCell><TableCell>{i.due_date}</TableCell><TableCell className="text-right">{fmt(i.total)}</TableCell><TableCell className="text-right">{fmt(i.amount_paid)}</TableCell><TableCell className="text-right font-semibold text-rose-500">{fmt(Number(i.total) - Number(i.amount_paid || 0))}</TableCell></TableRow>
                  ))}
                  {invoices.filter((i: any) => Number(i.total) > Number(i.amount_paid || 0)).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No outstanding invoices</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PnLRow({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: "pos" | "neg" }) {
  return (
    <div className={`flex items-center justify-between border-b py-2 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={highlight === "pos" ? "text-emerald-500" : highlight === "neg" ? "text-rose-500" : ""}>{value}</span>
    </div>
  );
}
