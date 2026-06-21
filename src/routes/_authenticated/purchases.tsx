import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag, Plus, Search, Eye, Trash2, Package, X, Minus, Truck, DollarSign, FileText,
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
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/purchases")({
  component: PurchasesPage,
});

type Purchase = {
  id: string;
  invoice_no: string;
  supplier_name: string | null;
  warehouse_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  payment_method: string;
  status: string;
  notes: string | null;
  purchase_date: string;
  created_at: string;
};

type PurchaseItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  total: number;
};

type Product = {
  id: string; name: string; sku: string | null; cost: number; stock: number; unit: string;
};

type Warehouse = { id: string; name: string };

type CartItem = {
  product_id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit_cost: number;
};

function PurchasesPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

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

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Purchase[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) =>
      [p.invoice_no, p.supplier_name].some((x) => x?.toLowerCase().includes(q)),
    );
  }, [purchases, query]);

  const stats = useMemo(() => {
    const sum = (k: keyof Purchase) => purchases.reduce((a, p) => a + Number(p[k] || 0), 0);
    const totalSpent = sum("total");
    const totalPaid = sum("amount_paid");
    return {
      count: purchases.length,
      spent: totalSpent,
      paid: totalPaid,
      due: totalSpent - totalPaid,
    };
  }, [purchases]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase deleted");
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Record stock-in from suppliers — automatically updates product stock."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New purchase</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Purchases" value={stats.count} icon={<ShoppingBag className="h-4 w-4" />} />
        <Stat label="Total spent" value={fmt(stats.spent)} icon={<DollarSign className="h-4 w-4" />} />
        <Stat label="Total paid" value={fmt(stats.paid)} icon={<DollarSign className="h-4 w-4 text-green-500" />} />
        <Stat label="Outstanding" value={fmt(stats.due)} icon={<FileText className="h-4 w-4 text-orange-500" />} />
      </div>

      <Card className="p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Invoice # or supplier…" className="pl-8" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No purchases yet</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoice_no}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.purchase_date}</TableCell>
                <TableCell>{p.supplier_name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-medium">{fmt(p.total)}</TableCell>
                <TableCell className="text-right">{fmt(p.amount_paid)}</TableCell>
                <TableCell><Badge variant={p.status === "received" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewId(p.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${p.invoice_no}? Stock will NOT be reversed.`)) del.mutate(p.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewPurchaseDialog open={open} onClose={() => setOpen(false)} sym={sym} />
      <PurchaseDetailDialog id={viewId} onClose={() => setViewId(null)} sym={sym} purchases={purchases} />
    </>
  );
}

function NewPurchaseDialog({ open, onClose, sym }: { open: boolean; onClose: () => void; sym: string }) {
  const qc = useQueryClient();
  const [supplier, setSupplier] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("none");
  const [payMethod, setPayMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["purchase-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,sku,cost,stock,unit").order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["purchase-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("id,name").order("name");
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: open,
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 20);
  }, [products, productSearch]);

  const addProduct = (p: Product) => {
    setCart((c) => {
      const exist = c.find((x) => x.product_id === p.id);
      if (exist) return c.map((x) => x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { product_id: p.id, name: p.name, sku: p.sku, quantity: 1, unit_cost: Number(p.cost) || 0 }];
    });
  };

  const updateQty = (id: string, q: number) => {
    if (q <= 0) return setCart((c) => c.filter((x) => x.product_id !== id));
    setCart((c) => c.map((x) => x.product_id === id ? { ...x, quantity: q } : x));
  };

  const updateCost = (id: string, c: number) =>
    setCart((p) => p.map((x) => x.product_id === id ? { ...x, unit_cost: c } : x));

  const subtotal = cart.reduce((a, x) => a + x.quantity * x.unit_cost, 0);
  const total = Math.max(0, subtotal - discount + tax);
  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  const reset = () => {
    setSupplier(""); setWarehouseId("none"); setPayMethod("cash"); setAmountPaid(0);
    setDiscount(0); setTax(0); setNotes(""); setCart([]); setProductSearch("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Add at least one item");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const invoice_no = `PO-${Date.now().toString().slice(-8)}`;
      const { data: purchase, error: perr } = await supabase.from("purchases").insert({
        user_id: u.user.id,
        invoice_no,
        supplier_name: supplier.trim() || null,
        warehouse_id: warehouseId === "none" ? null : warehouseId,
        subtotal, discount, tax, total,
        amount_paid: amountPaid,
        payment_method: payMethod,
        status: "received",
        notes: notes.trim() || null,
        purchase_date: purchaseDate,
      }).select("id").single();
      if (perr) throw perr;
      const items = cart.map((c) => ({
        purchase_id: purchase.id,
        user_id: u.user.id,
        product_id: c.product_id,
        product_name: c.name,
        sku: c.sku,
        quantity: c.quantity,
        unit_cost: c.unit_cost,
        total: c.quantity * c.unit_cost,
      }));
      const { error: ierr } = await supabase.from("purchase_items").insert(items);
      if (ierr) throw ierr;
      return invoice_no;
    },
    onSuccess: (inv) => {
      toast.success(`Purchase ${inv} recorded — stock updated`);
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New purchase</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr,320px]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Supplier</Label>
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Add products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU…" className="pl-8" />
              </div>
              {productSearch && (
                <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-border">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">No products</div>
                  ) : filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku || "—"} · Stock: {p.stock}</div>
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
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-6 w-6" />
                  No items yet
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {cart.map((c) => (
                    <div key={c.product_id} className="flex items-center gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.sku || "—"}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(c.product_id, c.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                        <Input className="h-7 w-14 text-center" type="number" min={1} value={c.quantity}
                          onChange={(e) => updateQty(c.product_id, Number(e.target.value) || 0)} />
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(c.product_id, c.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{sym}</span>
                        <Input className="h-7 w-20" type="number" min={0} step="0.01" value={c.unit_cost}
                          onChange={(e) => updateCost(c.product_id, Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-20 text-right text-sm font-medium">{fmt(c.quantity * c.unit_cost)}</div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(c.product_id, 0)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="space-y-1.5">
              <Row label="Subtotal" value={fmt(subtotal)} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Discount</span>
                <Input type="number" min={0} step="0.01" className="h-7 w-24 text-right"
                  value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tax</span>
                <Input type="number" min={0} step="0.01" className="h-7 w-24 text-right"
                  value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>

            <div>
              <Label>Payment method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit (pay later)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount paid</Label>
              <Input type="number" min={0} step="0.01" value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} />
              {amountPaid < total && (
                <div className="mt-1 text-xs text-orange-500">Due: {fmt(total - amountPaid)}</div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={cart.length === 0 || save.isPending}>
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            {save.isPending ? "Saving…" : "Record purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDetailDialog({ id, onClose, sym, purchases }: { id: string | null; onClose: () => void; sym: string; purchases: Purchase[] }) {
  const purchase = purchases.find((p) => p.id === id) ?? null;
  const { data: items = [] } = useQuery({
    queryKey: ["purchase-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_items").select("*").eq("purchase_id", id!);
      if (error) throw error;
      return data as PurchaseItem[];
    },
  });
  const fmt = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> {purchase?.invoice_no}</DialogTitle>
        </DialogHeader>
        {purchase && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{purchase.purchase_date}</span>
              <span className="capitalize">{purchase.payment_method}</span>
            </div>
            {purchase.supplier_name && <div><span className="text-muted-foreground">Supplier:</span> {purchase.supplier_name}</div>}
            <div className="border-t border-border pt-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between py-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">{it.quantity} × {fmt(it.unit_cost)}</div>
                  </div>
                  <div className="font-medium">{fmt(it.total)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-2">
              <Row label="Subtotal" value={fmt(purchase.subtotal)} />
              {Number(purchase.discount) > 0 && <Row label="Discount" value={`-${fmt(purchase.discount)}`} />}
              {Number(purchase.tax) > 0 && <Row label="Tax" value={fmt(purchase.tax)} />}
              <div className={cn("flex justify-between pt-1 text-base font-semibold")}>
                <span>Total</span><span>{fmt(purchase.total)}</span>
              </div>
              <Row label="Paid" value={fmt(purchase.amount_paid)} />
              {purchase.total > purchase.amount_paid && (
                <Row label="Due" value={fmt(purchase.total - purchase.amount_paid)} />
              )}
            </div>
            {purchase.notes && <div className="border-t border-border pt-2 text-xs"><span className="text-muted-foreground">Notes:</span> {purchase.notes}</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
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
