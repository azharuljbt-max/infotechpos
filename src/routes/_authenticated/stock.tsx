import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes, Search, ArrowDownToLine, ArrowUpFromLine, Settings2,
  History, AlertTriangle, Package,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stock")({
  component: StockPage,
});

type Product = {
  id: string; name: string; sku: string | null; category: string | null;
  unit: string; stock: number; cost: number; price: number; reorder_level: number;
};

type Movement = {
  id: string; product_id: string; type: string; quantity: number;
  reason: string | null; reference: string | null; balance_after: number | null;
  created_at: string; products?: { name: string; sku: string | null } | null;
};

type MoveType = "in" | "out" | "adjustment";

function StockPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [moveType, setMoveType] = useState<MoveType>("in");
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,category,unit,stock,cost,price,reorder_level")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,product_id,type,quantity,reason,reference,balance_after,created_at,products(name,sku)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Movement[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + Number(p.stock), 0);
    const stockValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.cost), 0);
    const retailValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.price), 0);
    const lowCount = products.filter((p) => p.stock <= p.reorder_level).length;
    const outCount = products.filter((p) => p.stock <= 0).length;
    return { totalUnits, stockValue, retailValue, lowCount, outCount };
  }, [products]);

  const openFor = (p: Product | null, type: MoveType) => {
    setMoveType(type);
    setProductId(p?.id ?? "");
    setQuantity(type === "adjustment" ? Number(p?.stock ?? 0) : 0);
    setReason(""); setReference("");
    setOpen(true);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr || !userData.user) throw new Error("Not signed in");
      if (!productId) throw new Error("Select a product");
      if (quantity < 0 || (moveType !== "adjustment" && quantity <= 0))
        throw new Error("Enter a valid quantity");
      const { error } = await supabase.from("stock_movements").insert({
        user_id: userData.user.id,
        product_id: productId,
        type: moveType,
        quantity,
        reason: reason || null,
        reference: reference || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["stock-products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <>
      <PageHeader
        title="Stock"
        description="Real-time inventory with ledger and adjustments."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openFor(null, "out")}>
              <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" /> Stock Out
            </Button>
            <Button size="sm" onClick={() => openFor(null, "in")}>
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> Stock In
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard tint="bg-chart-1/15 text-chart-1 ring-chart-1/20" icon={Boxes} label="Total Units" value={stats.totalUnits.toLocaleString()} />
        <StatCard tint="bg-chart-2/15 text-chart-2 ring-chart-2/20" icon={Package} label="Stock Value" value={`$${stats.stockValue.toFixed(0)}`} />
        <StatCard tint="bg-chart-3/15 text-chart-3 ring-chart-3/20" icon={Package} label="Retail Value" value={`$${stats.retailValue.toFixed(0)}`} />
        <StatCard tint="bg-chart-4/15 text-chart-4 ring-chart-4/20" icon={AlertTriangle} label="Low Stock" value={String(stats.lowCount)} />
        <StatCard tint="bg-destructive/15 text-destructive ring-destructive/20" icon={AlertTriangle} label="Out of Stock" value={String(stats.outCount)} />
      </div>

      <Tabs defaultValue="inventory" className="mt-4">
        <TabsList>
          <TabsTrigger value="inventory"><Boxes className="mr-1.5 h-3.5 w-3.5" />Inventory</TabsTrigger>
          <TabsTrigger value="ledger"><History className="mr-1.5 h-3.5 w-3.5" />Movement Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-3">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search name, SKU, category…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            {isLoading ? (
              <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading inventory…</div>
            ) : filtered.length === 0 ? (
              <div className="grid place-items-center rounded-md border border-dashed border-border p-12 text-center">
                <Package className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No products</p>
                <p className="text-xs text-muted-foreground">Add products in the Products module first.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Reorder</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const low = p.stock <= p.reorder_level;
                      const out = p.stock <= 0;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn("font-semibold", out && "text-destructive", !out && low && "text-warning-foreground")}>
                              {p.stock} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{p.reorder_level}</TableCell>
                          <TableCell className="text-right">${(Number(p.stock) * Number(p.cost)).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Stock In" onClick={() => openFor(p, "in")}>
                                <ArrowDownToLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Stock Out" onClick={() => openFor(p, "out")}>
                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjust" onClick={() => openFor(p, "adjustment")}>
                                <Settings2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-3">
          <Card className="p-4">
            {movements.length === 0 ? (
              <div className="grid place-items-center p-12 text-center">
                <History className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No movements yet</p>
                <p className="text-xs text-muted-foreground">Stock in/out and adjustments will appear here.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              m.type === "in" && "bg-success/10 text-success border-success/20",
                              m.type === "out" && "bg-destructive/10 text-destructive border-destructive/20",
                              m.type === "adjustment" && "bg-warning/10 text-warning-foreground border-warning/20",
                            )}
                          >
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {m.type === "out" ? "−" : m.type === "in" ? "+" : "="}{m.quantity}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{m.balance_after ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{m.reason ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{m.reference ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Stock {moveType}</DialogTitle>
            <DialogDescription>
              {moveType === "in" && "Add units to inventory (purchase, return, restock)."}
              {moveType === "out" && "Remove units from inventory (damage, loss, internal use)."}
              {moveType === "adjustment" && "Set the exact stock count after a physical recount."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku && `· ${p.sku}`} ({p.stock} {p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {moveType === "adjustment" ? "New stock count" : "Quantity"}
              </Label>
              <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
              {selectedProduct && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current: <span className="font-semibold">{selectedProduct.stock} {selectedProduct.unit}</span>
                  {moveType !== "adjustment" && quantity > 0 && (
                    <> → New: <span className="font-semibold">
                      {moveType === "in" ? Number(selectedProduct.stock) + quantity : Number(selectedProduct.stock) - quantity}
                    </span></>
                  )}
                </p>
              )}
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason (optional)" /></SelectTrigger>
                <SelectContent>
                  {(moveType === "in"
                    ? ["Purchase", "Customer return", "Restock", "Transfer in", "Opening balance"]
                    : moveType === "out"
                    ? ["Damaged", "Lost", "Internal use", "Transfer out", "Expired"]
                    : ["Physical count", "Correction", "Recount"]
                  ).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference / Notes</Label>
              <Textarea rows={2} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number, invoice, note…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ tint, icon: Icon, label, value }: { tint: string; icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1", tint)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tracking-tight">{value}</div>
        </div>
      </div>
    </Card>
  );
}
