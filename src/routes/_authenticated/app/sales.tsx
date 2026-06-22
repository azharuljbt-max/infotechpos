import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Search, Eye, Trash2, Receipt, Plus, TrendingUp, DollarSign, ShoppingCart, FileText } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/sales")({
  component: SalesPage,
});

type Sale = {
  id: string;
  receipt_no: string;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change_due: number;
  status: string;
  notes: string | null;
  created_at: string;
};

type SaleItem = {
  id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

function useSettings() {
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("user_settings").select("currency_symbol").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });
}

function SalesPage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const sym = settings?.currency_symbol ?? "$";
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<"all" | "today" | "7d" | "30d">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff = period === "today" ? now - 86400000
      : period === "7d" ? now - 7 * 86400000
      : period === "30d" ? now - 30 * 86400000 : 0;
    return sales.filter((s) => {
      if (paymentFilter !== "all" && s.payment_method !== paymentFilter) return false;
      if (cutoff && new Date(s.created_at).getTime() < cutoff) return false;
      if (q && ![s.receipt_no, s.customer_name].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sales, query, period, paymentFilter]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const todaySales = sales.filter((s) => new Date(s.created_at).getTime() >= t);
    const sum = (arr: Sale[]) => arr.reduce((a, s) => a + Number(s.total || 0), 0);
    return {
      total: sales.length,
      revenue: sum(sales),
      today: sum(todaySales),
      todayCount: todaySales.length,
    };
  }, [sales]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("sale_items").delete().eq("sale_id", id);
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale deleted");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genInvoice = useMutation({
    mutationFn: async (sale: Sale) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const user_id = u.user.id;

      // Check if invoice already exists for this sale (by note marker)
      const marker = `sale ${sale.receipt_no}`;
      const { data: existing } = await supabase
        .from("invoices")
        .select("id, invoice_no")
        .eq("user_id", user_id)
        .ilike("notes", `%${marker}%`)
        .maybeSingle();
      if (existing) return { invoice_no: existing.invoice_no, existed: true };

      const { data: items, error: iErr } = await supabase
        .from("sale_items").select("*").eq("sale_id", sale.id);
      if (iErr) throw iErr;

      const invoice_no = `INV-${Date.now().toString(36).toUpperCase()}`;
      const status = Number(sale.amount_paid) >= Number(sale.total)
        ? "paid" : Number(sale.amount_paid) > 0 ? "partial" : "unpaid";
      const { data: inv, error: invErr } = await supabase.from("invoices").insert({
        user_id, invoice_no,
        customer_name: sale.customer_name,
        subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax,
        total: sale.total, amount_paid: sale.amount_paid, status,
        notes: `Generated from sale ${sale.receipt_no}`,
      }).select().single();
      if (invErr) throw invErr;

      if (items && items.length) {
        const rows = items.map((it: SaleItem & { product_id?: string | null }) => ({
          invoice_id: inv.id, user_id,
          product_id: (it as { product_id?: string | null }).product_id ?? null,
          product_name: it.product_name, sku: it.sku,
          quantity: it.quantity, unit_price: it.unit_price, total: it.total,
        }));
        const { error: iiErr } = await supabase.from("invoice_items").insert(rows);
        if (iiErr) throw iiErr;
      }
      return { invoice_no, existed: false };
    },
    onSuccess: ({ invoice_no, existed }) => {
      toast.success(existed ? `Invoice already exists: ${invoice_no}` : `Invoice ${invoice_no} generated`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <PageHeader
        title="Sales"
        description="View, filter and manage all completed sales from POS."
        actions={
          <Button size="sm" asChild>
            <Link to="/app/pos"><Plus className="mr-1.5 h-3.5 w-3.5" />New sale (POS)</Link>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total sales" value={stats.total} icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Total revenue" value={fmt(stats.revenue)} icon={<DollarSign className="h-4 w-4 text-green-500" />} />
        <Stat label="Today's revenue" value={fmt(stats.today)} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
        <Stat label="Today's sales" value={stats.todayCount} icon={<Receipt className="h-4 w-4" />} />
      </div>

      <Card className="p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Receipt # or customer…" className="pl-8" />
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No sales found</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.receipt_no}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</TableCell>
                <TableCell>{s.customer_name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-medium">{fmt(s.total)}</TableCell>
                <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewId(s.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${s.receipt_no}?`)) del.mutate(s.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <SaleDetailDialog id={viewId} onClose={() => setViewId(null)} sym={sym} sales={sales} />
    </>
  );
}

function SaleDetailDialog({ id, onClose, sym, sales }: { id: string | null; onClose: () => void; sym: string; sales: Sale[] }) {
  const sale = sales.find((s) => s.id === id) ?? null;
  const { data: items = [] } = useQuery({
    queryKey: ["sale-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("sale_items").select("*").eq("sale_id", id!);
      if (error) throw error;
      return data as SaleItem[];
    },
  });

  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> {sale?.receipt_no}</DialogTitle>
        </DialogHeader>
        {sale && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{new Date(sale.created_at).toLocaleString()}</span>
              <span className="capitalize">{sale.payment_method}</span>
            </div>
            {sale.customer_name && <div><span className="text-muted-foreground">Customer:</span> {sale.customer_name}</div>}
            <div className="border-t border-border pt-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between py-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">{it.quantity} × {fmt(it.unit_price)}</div>
                  </div>
                  <div className="font-medium">{fmt(it.total)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-2 text-sm">
              <Row label="Subtotal" value={fmt(sale.subtotal)} />
              {Number(sale.discount) > 0 && <Row label="Discount" value={`-${fmt(sale.discount)}`} />}
              {Number(sale.tax) > 0 && <Row label="Tax" value={fmt(sale.tax)} />}
              <Row label="Total" value={fmt(sale.total)} bold />
              <Row label="Paid" value={fmt(sale.amount_paid)} />
              {Number(sale.change_due) > 0 && <Row label="Change" value={fmt(sale.change_due)} />}
            </div>
            {sale.notes && <div className="border-t border-border pt-2 text-xs"><span className="text-muted-foreground">Notes:</span> {sale.notes}</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-lg font-semibold">{value}</div>
      </div>
    </Card>
  );
}
