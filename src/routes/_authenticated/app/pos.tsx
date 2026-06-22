import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package, X,
  CreditCard, Banknote, Smartphone, Receipt, Printer,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/pos")({
  component: POSPage,
});

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  price: number;
  stock: number;
  unit: string;
  status: string;
};

type CartItem = {
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  stock: number;
};

type PayMethod = "cash" | "card" | "mobile";

function POSPage() {
  const qc = useQueryClient();
  const { symbol: sym } = useCurrency();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<null | {
    receipt_no: string;
    items: CartItem[];
    subtotal: number; discount: number; tax: number; total: number;
    payment_method: string; amount_paid: number; change_due: number;
    customer: string; date: string;
  }>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,barcode,category,price,stock,unit,status")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.category && s.add(p.category));
    return ["all", ...Array.from(s).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  // Barcode enter-to-add
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match =
      products.find((p) => (p.barcode ?? "").toLowerCase() === q) ||
      products.find((p) => (p.sku ?? "").toLowerCase() === q) ||
      filtered[0];
    if (match) {
      addToCart(match);
      setQuery("");
    }
  };

  const addToCart = (p: Product) => {
    if (p.stock <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) {
        if (existing.quantity + 1 > p.stock) {
          toast.error(`Only ${p.stock} ${p.unit} of ${p.name} in stock`);
          return c;
        }
        return c.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...c,
        { product_id: p.id, name: p.name, sku: p.sku, price: Number(p.price), quantity: 1, stock: Number(p.stock) },
      ];
    });
  };

  const setQty = (id: string, qty: number) => {
    setCart((c) =>
      c
        .map((i) => {
          if (i.product_id !== id) return i;
          const next = Math.max(0, Math.min(qty, i.stock));
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (id: string) =>
    setCart((c) => c.filter((i) => i.product_id !== id));

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart],
  );
  const discountAmt = Math.min(discount, subtotal);
  const taxable = Math.max(0, subtotal - discountAmt);
  const taxAmt = taxable * (taxRate / 100);
  const total = taxable + taxAmt;
  const change = Math.max(0, amountPaid - total);

  useEffect(() => {
    if (payOpen) setAmountPaid(Number(total.toFixed(2)));
  }, [payOpen, total]);

  const checkout = useMutation({
    mutationFn: async () => {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr || !userData.user) throw new Error("Not signed in");
      const user_id = userData.user.id;
      if (cart.length === 0) throw new Error("Cart is empty");
      if (amountPaid < total) throw new Error("Insufficient payment");

      const receipt_no = `R-${Date.now().toString(36).toUpperCase()}`;
      const { data: sale, error: sErr } = await supabase
        .from("sales")
        .insert({
          user_id, receipt_no, customer_name: customer || null,
          subtotal, discount: discountAmt, tax: taxAmt, total,
          payment_method: payMethod, amount_paid: amountPaid,
          change_due: change, notes: notes || null, status: "completed",
        })
        .select()
        .single();
      if (sErr) throw sErr;

      const items = cart.map((i) => ({
        sale_id: sale.id,
        user_id,
        product_id: i.product_id,
        product_name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: i.price,
        total: i.price * i.quantity,
      }));
      const { error: iErr } = await supabase.from("sale_items").insert(items);
      if (iErr) throw iErr;

      // Auto-generate invoice for the sale
      const invoice_no = `INV-${Date.now().toString(36).toUpperCase()}`;
      const invStatus = amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id,
          invoice_no,
          customer_name: customer || null,
          subtotal,
          discount: discountAmt,
          tax: taxAmt,
          total,
          amount_paid: amountPaid,
          status: invStatus,
          notes: notes ? `${notes}\n\nAuto-generated from sale ${receipt_no}` : `Auto-generated from sale ${receipt_no}`,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      const invItems = cart.map((i) => ({
        invoice_id: invoice.id,
        user_id,
        product_id: i.product_id,
        product_name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: i.price,
        total: i.price * i.quantity,
      }));
      const { error: iiErr } = await supabase.from("invoice_items").insert(invItems);
      if (iiErr) throw iiErr;

      return { sale, receipt_no, invoice_no };
    },
    onSuccess: ({ receipt_no, invoice_no }) => {
      toast.success(`Sale ${receipt_no} completed • Invoice ${invoice_no} created`);
      setReceipt({
        receipt_no,
        items: cart,
        subtotal, discount: discountAmt, tax: taxAmt, total,
        payment_method: payMethod, amount_paid: amountPaid, change_due: change,
        customer, date: new Date().toLocaleString(),
      });
      setCart([]); setCustomer(""); setDiscount(0); setNotes("");
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const holdSale = () => {
    if (cart.length === 0) return;
    const payload = { cart, customer, discount, taxRate, notes, at: Date.now() };
    const held = JSON.parse(localStorage.getItem("pos-held") || "[]");
    held.push(payload);
    localStorage.setItem("pos-held", JSON.stringify(held));
    setCart([]); setCustomer(""); setDiscount(0); setNotes("");
    toast.success("Sale held");
  };

  const resumeSale = () => {
    const held = JSON.parse(localStorage.getItem("pos-held") || "[]");
    if (held.length === 0) return toast.info("No held sales");
    const last = held.pop();
    localStorage.setItem("pos-held", JSON.stringify(held));
    setCart(last.cart); setCustomer(last.customer || "");
    setDiscount(last.discount || 0); setTaxRate(last.taxRate || 0);
    setNotes(last.notes || "");
    toast.success("Sale resumed");
  };

  return (
    <>
      <PageHeader
        title="Point of Sale"
        description="Scan, search, sell. Stock updates automatically."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resumeSale}>Resume</Button>
            <Button variant="outline" size="sm" onClick={holdSale} disabled={!cart.length}>Hold</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Catalog */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Scan barcode or search name / SKU…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs capitalize transition",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid place-items-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <Package className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs text-muted-foreground">
                {products.length === 0 ? "Add products first in Products module." : "Try a different search or category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const out = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={cn(
                      "group relative flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/60 hover:shadow-sm",
                      out && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex h-16 w-full items-center justify-center rounded-md bg-muted/50">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</div>
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold">{sym}{Number(p.price).toFixed(2)}</span>
                      <Badge variant={p.stock <= 5 ? "destructive" : "secondary"} className="text-[10px]">
                        {p.stock} {p.unit}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <aside className="flex flex-col rounded-lg border border-border bg-card lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" /> Current Sale
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          <div className="px-4 pt-3">
            <Input
              placeholder="Customer name (optional)"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center py-10 text-center">
                <div>
                  <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs text-muted-foreground">Tap a product to add</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((i) => (
                  <li key={i.product_id} className="rounded-md border border-border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{sym}{i.price.toFixed(2)} each</div>
                      </div>
                      <button onClick={() => removeItem(i.product_id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(i.product_id, i.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          className="h-7 w-14 text-center"
                          value={i.quantity}
                          onChange={(e) => setQty(i.product_id, Number(e.target.value) || 0)}
                        />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(i.product_id, i.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-semibold">{sym}{(i.price * i.quantity).toFixed(2)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Discount</Label>
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="h-8" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Tax %</Label>
                <Input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value) || 0))} className="h-8" />
              </div>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <Row label="Subtotal" value={subtotal} sym={sym} />
              <Row label="Discount" value={-discountAmt} sym={sym} />
              <Row label={`Tax (${taxRate}%)`} value={taxAmt} sym={sym} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span><span>{sym}{total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => setPayOpen(true)}>
              <Receipt className="mr-2 h-4 w-4" /> Charge {sym}{total.toFixed(2)}
            </Button>
          </div>
        </aside>
      </div>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>Complete sale of {sym}{total.toFixed(2)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "cash", icon: Banknote, label: "Cash" },
                { v: "card", icon: CreditCard, label: "Card" },
                { v: "mobile", icon: Smartphone, label: "Mobile" },
              ] as const).map((m) => (
                <button
                  key={m.v}
                  onClick={() => setPayMethod(m.v)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition",
                    payMethod === m.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <m.icon className="h-5 w-5" /> {m.label}
                </button>
              ))}
            </div>
            <div>
              <Label>Amount Received</Label>
              <Input type="number" min={0} step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20, Math.ceil(total / 50) * 50]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <Button key={v} variant="outline" size="sm" onClick={() => setAmountPaid(Number(v.toFixed(2)))}>
                    {sym}{v.toFixed(2)}
                  </Button>
                ))}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>Change Due</span>
              <span className="text-lg font-semibold">{sym}{change.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={() => checkout.mutate()} disabled={checkout.isPending || amountPaid < total}>
              {checkout.isPending ? "Processing…" : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription>{receipt?.receipt_no}</DialogDescription>
          </DialogHeader>
          {receipt && (
            <div id="receipt-print" className="space-y-3 rounded-md border border-border p-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">Infotech ERP</div>
                <div className="text-xs text-muted-foreground">{receipt.date}</div>
                {receipt.customer && <div className="text-xs">Customer: {receipt.customer}</div>}
              </div>
              <div className="space-y-1 border-y border-border py-2">
                {receipt.items.map((i) => (
                  <div key={i.product_id} className="flex justify-between text-xs">
                    <span>{i.name} × {i.quantity}</span>
                    <span>{sym}{(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs">
                <Row label="Subtotal" value={receipt.subtotal} sym={sym} />
                <Row label="Discount" value={-receipt.discount} sym={sym} />
                <Row label="Tax" value={receipt.tax} sym={sym} />
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <span>Total</span><span>{sym}{receipt.total.toFixed(2)}</span>
                </div>
                <Row label={`Paid (${receipt.payment_method})`} value={receipt.amount_paid} sym={sym} />
                <Row label="Change" value={receipt.change_due} sym={sym} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button onClick={() => setReceipt(null)}>New Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, sym = "$" }: { label: string; value: number; sym?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{sym}{value.toFixed(2)}</span>
    </div>
  );
}
