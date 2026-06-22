import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Plus, Trash2, Pencil, Wallet, Landmark, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/accounting")({
  component: AccountingPage,
});

type Account = {
  id: string;
  code: string | null;
  name: string;
  type: string;
  opening_balance: number;
  description: string | null;
  is_active: boolean;
};

type Journal = {
  id: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  account_id: string | null;
  account_name: string | null;
  debit: number;
  credit: number;
  type: string;
  notes: string | null;
};

const ACCOUNT_TYPES = ["asset", "liability", "income", "expense", "equity"];

function AccountingPage() {
  const { fmt } = useCurrency();
  const qc = useQueryClient();
  const [tab, setTab] = useState("ledger");
  const [range, setRange] = useState("30");

  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - parseInt(range, 10));
    return d.toISOString();
  }, [range]);

  const sinceDate = since.slice(0, 10);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts").select("*").order("created_at");
      return (data ?? []) as Account[];
    },
  });
  const { data: journals = [] } = useQuery({
    queryKey: ["journals", since],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries").select("*").gte("entry_date", sinceDate).order("entry_date", { ascending: false });
      return (data ?? []) as Journal[];
    },
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["acc-sales", since],
    queryFn: async () => (await supabase.from("sales").select("*").gte("created_at", since)).data ?? [],
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["acc-purchases", since],
    queryFn: async () => (await supabase.from("purchases").select("*").gte("created_at", since)).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["acc-expenses", since],
    queryFn: async () => (await supabase.from("expenses").select("*").gte("expense_date", sinceDate)).data ?? [],
  });

  // Cash book: cash inflows from sales (cash) + outflows from expenses (cash) + purchases paid
  const cashInflow =
    sales.filter((s: any) => (s.payment_method || "cash").toLowerCase() === "cash").reduce((a: number, s: any) => a + Number(s.amount_paid || s.total || 0), 0);
  const cashOutflow =
    expenses.filter((e: any) => (e.payment_method || "cash").toLowerCase() === "cash").reduce((a: number, e: any) => a + Number(e.amount || 0), 0) +
    purchases.filter((p: any) => (p.payment_method || "cash").toLowerCase() === "cash").reduce((a: number, p: any) => a + Number(p.amount_paid || 0), 0);
  const cashBalance = cashInflow - cashOutflow;

  const bankInflow =
    sales.filter((s: any) => ["bank", "card", "transfer", "online"].includes((s.payment_method || "").toLowerCase())).reduce((a: number, s: any) => a + Number(s.amount_paid || s.total || 0), 0);
  const bankOutflow =
    expenses.filter((e: any) => ["bank", "card", "transfer", "online"].includes((e.payment_method || "").toLowerCase())).reduce((a: number, e: any) => a + Number(e.amount || 0), 0) +
    purchases.filter((p: any) => ["bank", "card", "transfer", "online"].includes((p.payment_method || "").toLowerCase())).reduce((a: number, p: any) => a + Number(p.amount_paid || 0), 0);
  const bankBalance = bankInflow - bankOutflow;

  const totalIncome = sales.reduce((a: number, s: any) => a + Number(s.total || 0), 0);
  const totalExpense = expenses.reduce((a: number, e: any) => a + Number(e.amount || 0), 0);
  const totalCogs = purchases.reduce((a: number, p: any) => a + Number(p.total || 0), 0);
  const netProfit = totalIncome - totalCogs - totalExpense;

  // build unified ledger
  const ledger = useMemo(() => {
    const rows: { date: string; ref: string; description: string; debit: number; credit: number; type: string }[] = [];
    sales.forEach((s: any) => rows.push({ date: s.created_at.slice(0, 10), ref: s.receipt_no || "", description: `Sale to ${s.customer_name || "Walk-in"}`, debit: Number(s.total || 0), credit: 0, type: "sale" }));
    purchases.forEach((p: any) => rows.push({ date: p.purchase_date || p.created_at.slice(0, 10), ref: p.invoice_no || "", description: `Purchase from ${p.supplier_name || ""}`, debit: 0, credit: Number(p.total || 0), type: "purchase" }));
    expenses.forEach((e: any) => rows.push({ date: e.expense_date, ref: e.reference || "", description: `${e.category} - ${e.vendor || ""}`, debit: 0, credit: Number(e.amount || 0), type: "expense" }));
    journals.forEach((j: any) => rows.push({ date: j.entry_date, ref: j.reference || "", description: j.description || j.account_name || "Journal", debit: Number(j.debit || 0), credit: Number(j.credit || 0), type: "journal" }));
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, purchases, expenses, journals]);

  const ledgerTotals = ledger.reduce((acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }), { debit: 0, credit: 0 });

  // --- account dialog
  const [accOpen, setAccOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<Account | null>(null);
  const [accForm, setAccForm] = useState({ code: "", name: "", type: "asset", opening_balance: "0", description: "", is_active: true });
  const openNewAcc = () => { setEditAcc(null); setAccForm({ code: "", name: "", type: "asset", opening_balance: "0", description: "", is_active: true }); setAccOpen(true); };
  const openEditAcc = (a: Account) => { setEditAcc(a); setAccForm({ code: a.code || "", name: a.name, type: a.type, opening_balance: String(a.opening_balance), description: a.description || "", is_active: a.is_active }); setAccOpen(true); };

  const saveAcc = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const payload = { ...accForm, opening_balance: Number(accForm.opening_balance) || 0, user_id: u.user.id };
      if (editAcc) {
        const { error } = await supabase.from("accounts").update(payload).eq("id", editAcc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setAccOpen(false); toast.success("Account saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const delAcc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Deleted"); },
  });

  // --- journal dialog
  const [jOpen, setJOpen] = useState(false);
  const [editJ, setEditJ] = useState<Journal | null>(null);
  const [jForm, setJForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), reference: "", description: "", account_id: "", debit: "0", credit: "0", notes: "" });
  const openNewJ = () => { setEditJ(null); setJForm({ entry_date: new Date().toISOString().slice(0, 10), reference: "", description: "", account_id: "", debit: "0", credit: "0", notes: "" }); setJOpen(true); };
  const openEditJ = (j: Journal) => { setEditJ(j); setJForm({ entry_date: j.entry_date, reference: j.reference || "", description: j.description || "", account_id: j.account_id || "", debit: String(j.debit), credit: String(j.credit), notes: j.notes || "" }); setJOpen(true); };

  const saveJ = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const acct = accounts.find((a) => a.id === jForm.account_id);
      const payload = {
        user_id: u.user.id,
        entry_date: jForm.entry_date,
        reference: jForm.reference,
        description: jForm.description,
        account_id: jForm.account_id || null,
        account_name: acct?.name ?? null,
        debit: Number(jForm.debit) || 0,
        credit: Number(jForm.credit) || 0,
        notes: jForm.notes,
        type: "manual",
      };
      if (editJ) {
        const { error } = await supabase.from("journal_entries").update(payload).eq("id", editJ.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journals"] }); setJOpen(false); toast.success("Entry saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const delJ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journals"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Calculator className="h-6 w-6" /> Accounting</h1>
          <p className="text-sm text-muted-foreground">Cash & bank books, ledger, P&L and journal entries.</p>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cash Balance" value={fmt(cashBalance)} icon={<Wallet className="h-4 w-4 text-emerald-500" />} />
        <Kpi label="Bank Balance" value={fmt(bankBalance)} icon={<Landmark className="h-4 w-4 text-blue-500" />} />
        <Kpi label="Total Income" value={fmt(totalIncome)} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <Kpi label="Net Profit" value={fmt(netProfit)} icon={<TrendingDown className={`h-4 w-4 ${netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`} />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="cash">Cash Book</TabsTrigger>
          <TabsTrigger value="bank">Bank Book</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardHeader><CardTitle>General Ledger</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ledger.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>) : ledger.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.ref}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                      <TableCell className="text-right text-emerald-500">{r.debit ? fmt(r.debit) : "-"}</TableCell>
                      <TableCell className="text-right text-rose-500">{r.credit ? fmt(r.credit) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={4} className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{fmt(ledgerTotals.debit)}</td>
                    <td className="p-2 text-right">{fmt(ledgerTotals.credit)}</td>
                  </tr>
                </tfoot>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash">
          <BookCard title="Cash Book" inflow={cashInflow} outflow={cashOutflow} balance={cashBalance} fmt={fmt}
            rows={[
              ...sales.filter((s: any) => (s.payment_method || "cash").toLowerCase() === "cash").map((s: any) => ({ date: s.created_at.slice(0, 10), desc: `Sale ${s.receipt_no || ""}`, in: Number(s.amount_paid || s.total || 0), out: 0 })),
              ...purchases.filter((p: any) => (p.payment_method || "cash").toLowerCase() === "cash").map((p: any) => ({ date: p.purchase_date, desc: `Purchase ${p.invoice_no || ""}`, in: 0, out: Number(p.amount_paid || 0) })),
              ...expenses.filter((e: any) => (e.payment_method || "cash").toLowerCase() === "cash").map((e: any) => ({ date: e.expense_date, desc: `Expense ${e.category}`, in: 0, out: Number(e.amount || 0) })),
            ]}
          />
        </TabsContent>

        <TabsContent value="bank">
          <BookCard title="Bank Book" inflow={bankInflow} outflow={bankOutflow} balance={bankBalance} fmt={fmt}
            rows={[
              ...sales.filter((s: any) => ["bank", "card", "transfer", "online"].includes((s.payment_method || "").toLowerCase())).map((s: any) => ({ date: s.created_at.slice(0, 10), desc: `Sale ${s.receipt_no || ""}`, in: Number(s.amount_paid || s.total || 0), out: 0 })),
              ...purchases.filter((p: any) => ["bank", "card", "transfer", "online"].includes((p.payment_method || "").toLowerCase())).map((p: any) => ({ date: p.purchase_date, desc: `Purchase ${p.invoice_no || ""}`, in: 0, out: Number(p.amount_paid || 0) })),
              ...expenses.filter((e: any) => ["bank", "card", "transfer", "online"].includes((e.payment_method || "").toLowerCase())).map((e: any) => ({ date: e.expense_date, desc: `Expense ${e.category}`, in: 0, out: Number(e.amount || 0) })),
            ]}
          />
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle>Profit & Loss</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Row label="Sales Revenue" value={fmt(totalIncome)} />
              <Row label="Cost of Goods (Purchases)" value={`- ${fmt(totalCogs)}`} />
              <Row label="Gross Profit" value={fmt(totalIncome - totalCogs)} bold />
              <Row label="Operating Expenses" value={`- ${fmt(totalExpense)}`} />
              <Row label="Net Profit" value={fmt(netProfit)} bold positive={netProfit >= 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Journal Entries</CardTitle>
              <Dialog open={jOpen} onOpenChange={setJOpen}>
                <DialogTrigger asChild><Button size="sm" onClick={openNewJ}><Plus className="mr-2 h-4 w-4" />New Entry</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editJ ? "Edit" : "New"} Journal Entry</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Date</Label><Input type="date" value={jForm.entry_date} onChange={(e) => setJForm({ ...jForm, entry_date: e.target.value })} /></div>
                      <div><Label>Reference</Label><Input value={jForm.reference} onChange={(e) => setJForm({ ...jForm, reference: e.target.value })} /></div>
                    </div>
                    <div>
                      <Label>Account</Label>
                      <Select value={jForm.account_id} onValueChange={(v) => setJForm({ ...jForm, account_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Input value={jForm.description} onChange={(e) => setJForm({ ...jForm, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Debit</Label><Input type="number" value={jForm.debit} onChange={(e) => setJForm({ ...jForm, debit: e.target.value })} /></div>
                      <div><Label>Credit</Label><Input type="number" value={jForm.credit} onChange={(e) => setJForm({ ...jForm, credit: e.target.value })} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={jForm.notes} onChange={(e) => setJForm({ ...jForm, notes: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button onClick={() => saveJ.mutate()} disabled={saveJ.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Account</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {journals.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No journal entries</TableCell></TableRow>) : journals.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>{j.entry_date}</TableCell>
                      <TableCell>{j.reference}</TableCell>
                      <TableCell>{j.account_name}</TableCell>
                      <TableCell>{j.description}</TableCell>
                      <TableCell className="text-right">{fmt(j.debit)}</TableCell>
                      <TableCell className="text-right">{fmt(j.credit)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEditJ(j)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delJ.mutate(j.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chart of Accounts</CardTitle>
              <Dialog open={accOpen} onOpenChange={setAccOpen}>
                <DialogTrigger asChild><Button size="sm" onClick={openNewAcc}><Plus className="mr-2 h-4 w-4" />New Account</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editAcc ? "Edit" : "New"} Account</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Code</Label><Input value={accForm.code} onChange={(e) => setAccForm({ ...accForm, code: e.target.value })} /></div>
                      <div>
                        <Label>Type</Label>
                        <Select value={accForm.type} onValueChange={(v) => setAccForm({ ...accForm, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Name</Label><Input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} /></div>
                    <div><Label>Opening Balance</Label><Input type="number" value={accForm.opening_balance} onChange={(e) => setAccForm({ ...accForm, opening_balance: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={accForm.description} onChange={(e) => setAccForm({ ...accForm, description: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button onClick={() => saveAcc.mutate()} disabled={saveAcc.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Opening Balance</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No accounts yet</TableCell></TableRow>) : accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.code}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(a.opening_balance)}</TableCell>
                      <TableCell>{a.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEditAcc(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delAcc.mutate(a.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span>{icon}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </CardContent></Card>
  );
}

function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b py-2 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={bold ? (positive ? "text-emerald-500" : "text-rose-500") : ""}>{value}</span>
    </div>
  );
}

function BookCard({ title, rows, inflow, outflow, balance, fmt }: { title: string; rows: { date: string; desc: string; in: number; out: number }[]; inflow: number; outflow: number; balance: number; fmt: (n: number) => string }) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">In {fmt(inflow)} · Out {fmt(outflow)} · Balance <strong className={balance >= 0 ? "text-emerald-500" : "text-rose-500"}>{fmt(balance)}</strong></span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead></TableRow></TableHeader>
          <TableBody>
            {sorted.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>) : sorted.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.desc}</TableCell>
                <TableCell className="text-right text-emerald-500">{r.in ? fmt(r.in) : "-"}</TableCell>
                <TableCell className="text-right text-rose-500">{r.out ? fmt(r.out) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
