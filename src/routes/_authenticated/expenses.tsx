import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Wallet, TrendingDown, Calendar } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

type Expense = {
  id: string;
  category: string;
  amount: number;
  payment_method: string;
  vendor: string | null;
  reference: string | null;
  expense_date: string;
  notes: string | null;
  created_at: string;
};

const CATEGORIES = ["Rent", "Utilities", "Salary", "Transport", "Marketing", "Supplies", "Maintenance", "Tax", "Other"];
const METHODS = ["cash", "card", "bank", "mobile"];

const empty = {
  id: "",
  category: "Other",
  amount: 0,
  payment_method: "cash",
  vendor: "",
  reference: "",
  expense_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function ExpensesPage() {
  const qc = useQueryClient();
  const { fmt } = useCurrency();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<"all" | "today" | "7d" | "30d">("30d");
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const editing = !!form.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff = period === "today" ? now - 86400000
      : period === "7d" ? now - 7 * 86400000
      : period === "30d" ? now - 30 * 86400000 : 0;
    return items.filter((e) => {
      if (catFilter !== "all" && e.category !== catFilter) return false;
      if (cutoff && new Date(e.expense_date).getTime() < cutoff - 86400000) return false;
      if (q && ![e.category, e.vendor, e.reference, e.notes].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, query, period, catFilter]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const m = monthStart.getTime();
    const sum = (arr: Expense[]) => arr.reduce((a, e) => a + Number(e.amount || 0), 0);
    return {
      total: sum(items),
      today: sum(items.filter((e) => new Date(e.expense_date).getTime() >= t)),
      month: sum(items.filter((e) => new Date(e.expense_date).getTime() >= m)),
      count: items.length,
    };
  }, [items]);

  const save = useMutation({
    mutationFn: async (f: typeof empty) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.category) throw new Error("Category required");
      if (Number(f.amount) <= 0) throw new Error("Amount must be > 0");
      const payload = {
        user_id: u.user.id,
        category: f.category,
        amount: Number(f.amount),
        payment_method: f.payment_method,
        vendor: f.vendor || null,
        reference: f.reference || null,
        expense_date: f.expense_date,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Expense updated" : "Expense recorded");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track operational and recurring expenses."
        actions={
          <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />New expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <Stat icon={Wallet} label="Total" value={fmt(stats.total)} tint="bg-chart-1/15 text-chart-1" />
        <Stat icon={Calendar} label="This Month" value={fmt(stats.month)} tint="bg-chart-2/15 text-chart-2" />
        <Stat icon={TrendingDown} label="Today" value={fmt(stats.today)} tint="bg-chart-4/15 text-chart-4" />
        <Stat icon={Wallet} label="Entries" value={String(stats.count)} tint="bg-chart-3/15 text-chart-3" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search category, vendor, notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
            <Wallet className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No expenses</p>
            <p className="text-xs text-muted-foreground">Record your first expense.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.expense_date}</TableCell>
                    <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                    <TableCell className="text-sm">{e.vendor ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{e.payment_method}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmt(e.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setForm({ ...empty, ...e, vendor: e.vendor ?? "", reference: e.reference ?? "", notes: e.notes ?? "" }); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this expense?")) del.mutate(e.id); }}>
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
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit expense" : "New expense"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Reference</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt #, voucher…" />
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
    </>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: typeof Wallet; label: string; value: string; tint: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </div>
      </div>
    </Card>
  );
}
