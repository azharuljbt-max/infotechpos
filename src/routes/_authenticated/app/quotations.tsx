import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature, Plus, Search, Eye, Trash2, Edit, Send, Package, X, Printer, CheckCircle2, Clock, FileText, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QuotationPrintDialog } from "@/components/quotation-print-dialog";

export const Route = createFileRoute("/_authenticated/app/quotations")({
  component: QuotationsPage,
});

type Quotation = {
  id: string;
  quotation_no: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
};

type QuotationItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

type Product = { id: string; name: string; sku: string | null; price: number };

type CartItem = {
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
};

const STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "accepted") return "default";
  if (s === "rejected" || s === "expired") return "destructive";
  if (s === "sent") return "secondary";
  return "outline";
}

function QuotationsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("user_settings").select("currency_symbol").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });
  const sym = settings?.currency_symbol ?? "$";

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quotation[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotations.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (q && ![i.quotation_no, i.customer_name, i.customer_email].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [quotations, query, statusFilter]);

  const stats = useMemo(() => {
    const sum = (arr: Quotation[]) => arr.reduce((a, x) => a + Number(x.total || 0), 0);
    const accepted = quotations.filter((q) => q.status === "accepted");
    const pending = quotations.filter((q) => q.status === "draft" || q.status === "sent");
    return {
      total: quotations.length,
      value: sum(quotations),
      acceptedValue: sum(accepted),
      pendingCount: pending.length,
    };
  }, [quotations]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Quotation deleted"); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["quotations"] }); },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (q: Quotation) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: items, error: ierr } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      if (ierr) throw ierr;
      const invoice_no = `INV-${Date.now().toString().slice(-8)}`;
      const { data: inv, error: cerr } = await supabase.from("invoices").insert({
        user_id: u.user.id,
        invoice_no,
        customer_name: q.customer_name,
        customer_email: q.customer_email,
        customer_phone: q.customer_phone,
        customer_address: q.customer_address,
        issue_date: new Date().toISOString().slice(0, 10),
        subtotal: q.subtotal, discount: q.discount, tax: q.tax, total: q.total,
        status: "draft", notes: q.notes,
      }).select("id").single();
      if (cerr) throw cerr;
      if (items && items.length) {
        await supabase.from("invoice_items").insert(items.map((it: QuotationItem) => ({
          invoice_id: inv.id, user_id: u.user!.id,
          product_id: it.product_id, product_name: it.product_name, sku: it.sku,
          quantity: it.quantity, unit_price: it.unit_price, total: it.total,
        })));
      }
      await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);
      return invoice_no;
    },
    onSuccess: (inv) => {
      toast.success(`Converted to invoice ${inv}`);
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Create and track customer quotes — convert accepted quotes to invoices."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />New quotation</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total quotes" value={stats.total} icon={<FileText className="h-4 w-4" />} />
        <Stat label="Total value" value={fmt(stats.value)} icon={<DollarSign className="h-4 w-4" />} />
        <Stat label="Accepted value" value={fmt(stats.acceptedValue)} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} />
        <Stat label="Pending" value={stats.pendingCount} icon={<Clock className="h-4 w-4 text-orange-500" />} />
      </div>

      <Card className="p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Quote # or customer…" className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No quotations yet</TableCell></TableRow>
            ) : filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.quotation_no}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{q.issue_date}</TableCell>
                <TableCell>{q.customer_name || "—"}</TableCell>
                <TableCell className="text-xs">{q.valid_until || "—"}</TableCell>
                <TableCell className="text-right font-medium">{fmt(q.total)}</TableCell>
                <TableCell>
                  <Select value={q.status} onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}>
                    <SelectTrigger className="h-7 w-24">
                      <Badge variant={statusVariant(q.status)} className="capitalize">{q.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="View" onClick={() => setViewId(q.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Print / Preview" onClick={() => setPrintId(q.id)}><Printer className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" title="Convert to invoice" onClick={() => { if (confirm(`Convert ${q.quotation_no} to invoice?`)) convertToInvoice.mutate(q); }}>
                      <Send className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => { setEditing(q); setOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${q.quotation_no}?`)) del.mutate(q.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <QuotationEditor open={open} onClose={() => setOpen(false)} editing={editing} sym={sym} />
      <QuotationDetail id={viewId} onClose={() => setViewId(null)} sym={sym} quotations={quotations} onPrint={(id) => { setViewId(null); setPrintId(id); }} />
      <QuotationPrintWrapper id={printId} quotations={quotations} onClose={() => setPrintId(null)} />
    </>
  );
}

function QuotationEditor({ open, onClose, editing, sym }: { open: boolean; onClose: () => void; editing: Quotation | null; sym: string }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("draft");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["quote-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,sku,price").order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  useMemo(() => {
    if (!open) return;
    if (editing) {
      setCustomer(editing.customer_name ?? "");
      setEmail(editing.customer_email ?? "");
      setPhone(editing.customer_phone ?? "");
      setAddress(editing.customer_address ?? "");
      setIssueDate(editing.issue_date);
      setValidUntil(editing.valid_until ?? "");
      setStatus(editing.status);
      setDiscount(Number(editing.discount));
      setTax(Number(editing.tax));
      setNotes(editing.notes ?? "");
      supabase.from("quotation_items").select("*").eq("quotation_id", editing.id).then(({ data }) => {
        setCart((data ?? []).map((d: QuotationItem) => ({
          product_id: d.product_id, name: d.product_name, sku: d.sku,
          quantity: Number(d.quantity), unit_price: Number(d.unit_price),
        })));
      });
    } else {
      setCustomer(""); setEmail(""); setPhone(""); setAddress("");
      setIssueDate(new Date().toISOString().slice(0, 10));
      setValidUntil(""); setStatus("draft");
      setDiscount(0); setTax(0); setNotes(""); setCart([]); setProductSearch("");
    }
  }, [editing, open]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 20);
  }, [products, productSearch]);

  const addProduct = (p: Product) => setCart((c) => {
    const ex = c.find((x) => x.product_id === p.id);
    if (ex) return c.map((x) => x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x);
    return [...c, { product_id: p.id, name: p.name, sku: p.sku, quantity: 1, unit_price: Number(p.price) || 0 }];
  });
  const addBlank = () => setCart((c) => [...c, { product_id: null, name: "", sku: null, quantity: 1, unit_price: 0 }]);
  const updateLine = (idx: number, patch: Partial<CartItem>) =>
    setCart((c) => c.map((x, i) => i === idx ? { ...x, ...patch } : x));
  const removeLine = (idx: number) => setCart((c) => c.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((a, x) => a + x.quantity * x.unit_price, 0);
  const total = Math.max(0, subtotal - discount + tax);
  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  const save = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Add at least one item");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = {
        user_id: u.user.id,
        customer_name: customer.trim() || null,
        customer_email: email.trim() || null,
        customer_phone: phone.trim() || null,
        customer_address: address.trim() || null,
        issue_date: issueDate,
        valid_until: validUntil || null,
        subtotal, discount, tax, total,
        status,
        notes: notes.trim() || null,
      };
      let quoteId: string;
      if (editing) {
        const { error } = await supabase.from("quotations").update(payload).eq("id", editing.id);
        if (error) throw error;
        quoteId = editing.id;
        await supabase.from("quotation_items").delete().eq("quotation_id", quoteId);
      } else {
        const quotation_no = `QT-${Date.now().toString().slice(-8)}`;
        const { data, error } = await supabase.from("quotations").insert({ ...payload, quotation_no }).select("id").single();
        if (error) throw error;
        quoteId = data.id;
      }
      const items = cart.filter((c) => c.name.trim()).map((c) => ({
        quotation_id: quoteId, user_id: u.user!.id,
        product_id: c.product_id, product_name: c.name, sku: c.sku,
        quantity: c.quantity, unit_price: c.unit_price, total: c.quantity * c.unit_price,
      }));
      if (items.length) {
        const { error } = await supabase.from("quotation_items").insert(items);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Quotation updated" : "Quotation created");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.quotation_no}` : "New quotation"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr,300px]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Customer</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Issue date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
              <div><Label>Valid until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
            </div>
            <div><Label>Address</Label><Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>

            <div>
              <Label>Add product (or use blank line)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products…" className="pl-8" />
                </div>
                <Button variant="outline" size="sm" onClick={addBlank}><Plus className="mr-1 h-3.5 w-3.5" />Blank</Button>
              </div>
              {productSearch && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">No products</div>
                  ) : filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => { addProduct(p); setProductSearch(""); }}
                      className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku || "—"} · {fmt(p.price)}</div>
                      </div>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border border-border">
              <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                Items ({cart.length})
              </div>
              {cart.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground"><Package className="mx-auto mb-2 h-6 w-6" />No items</div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {cart.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-2 p-2">
                      <Input className="h-8" value={c.name} onChange={(e) => updateLine(idx, { name: e.target.value })} placeholder="Item description" />
                      <Input className="h-8 w-16 text-center" type="number" min={1} value={c.quantity}
                        onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })} />
                      <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">{sym}</span>
                        <Input className="h-8 w-20" type="number" min={0} step="0.01" value={c.unit_price}
                          onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="w-20 text-right text-sm font-medium">{fmt(c.quantity * c.unit_price)}</div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(idx)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <Row label="Subtotal" value={fmt(subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Discount</span>
              <Input type="number" min={0} step="0.01" className="h-7 w-24 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tax</span>
              <Input type="number" min={0} step="0.01" className="h-7 w-24 text-right" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
            <div><Label>Notes / Terms</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={cart.length === 0 || save.isPending}>
            <FileSignature className="mr-1.5 h-3.5 w-3.5" />{save.isPending ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuotationDetail({ id, onClose, sym, quotations, onPrint }: { id: string | null; onClose: () => void; sym: string; quotations: Quotation[]; onPrint: (id: string) => void }) {
  const q = quotations.find((x) => x.id === id) ?? null;
  const { data: items = [] } = useQuery({
    queryKey: ["quotation-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotation_items").select("*").eq("quotation_id", id!);
      if (error) throw error;
      return data as QuotationItem[];
    },
  });
  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSignature className="h-4 w-4" /> {q?.quotation_no}</DialogTitle>
        </DialogHeader>
        {q && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Issue: {q.issue_date}</span>
              {q.valid_until && <span>Valid until: {q.valid_until}</span>}
            </div>
            {q.customer_name && (
              <div className="rounded bg-muted/40 p-2">
                <div className="font-medium">{q.customer_name}</div>
                {q.customer_email && <div className="text-xs text-muted-foreground">{q.customer_email}</div>}
                {q.customer_phone && <div className="text-xs text-muted-foreground">{q.customer_phone}</div>}
                {q.customer_address && <div className="mt-1 text-xs whitespace-pre-wrap">{q.customer_address}</div>}
              </div>
            )}
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
            <div className="space-y-1 border-t border-border pt-2">
              <Row label="Subtotal" value={fmt(q.subtotal)} />
              {Number(q.discount) > 0 && <Row label="Discount" value={`-${fmt(q.discount)}`} />}
              {Number(q.tax) > 0 && <Row label="Tax" value={fmt(q.tax)} />}
              <div className="flex justify-between pt-1 text-base font-semibold"><span>Total</span><span>{fmt(q.total)}</span></div>
            </div>
            {q.notes && <div className="border-t border-border pt-2 text-xs"><span className="text-muted-foreground">Notes:</span> {q.notes}</div>}
            <div className="flex justify-end gap-2 border-t border-border pt-2">
              <Button size="sm" variant="outline" onClick={() => q && onPrint(q.id)}><Printer className="mr-1.5 h-3.5 w-3.5" />Print / Preview</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
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

function QuotationPrintWrapper({ id, quotations, onClose }: { id: string | null; quotations: Quotation[]; onClose: () => void }) {
  const q = quotations.find((x) => x.id === id) ?? null;
  const { data: items = [] } = useQuery({
    queryKey: ["quotation-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotation_items").select("*").eq("quotation_id", id!);
      if (error) throw error;
      return data as QuotationItem[];
    },
  });
  return (
    <QuotationPrintDialog
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      quotation={q}
      items={items.map((it) => ({
        product_name: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        total: Number(it.total),
      }))}
    />
  );
}
