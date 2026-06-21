import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorder_level: number;
  description: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  barcode: z.string().trim().max(64).optional().or(z.literal("")),
  category: z.string().trim().max(64).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(16),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});
type ProductForm = z.infer<typeof productSchema>;

const emptyForm: ProductForm = {
  name: "", sku: "", barcode: "", category: "", unit: "pcs",
  price: 0, cost: 0, stock: 0, reorder_level: 0,
  description: "", status: "active",
};

function ProductsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter((p) => p.stock <= p.reorder_level).length;
    const value = products.reduce((s, p) => s + Number(p.cost) * Number(p.stock), 0);
    return { total, active, lowStock, value };
  }, [products]);

  const upsert = useMutation({
    mutationFn: async (values: ProductForm) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Not authenticated");
      const payload = {
        ...values,
        sku: values.sku || null,
        barcode: values.barcode || null,
        category: values.category || null,
        description: values.description || null,
        user_id,
      };
      if (editing) {
        const { error } = await supabase
          .from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Product updated" : "Product created");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      category: p.category ?? "",
      unit: p.unit,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: Number(p.stock),
      reorder_level: Number(p.reorder_level),
      description: p.description ?? "",
      status: p.status === "inactive" ? "inactive" : "active",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof ProductForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ProductForm;
        if (k && !errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    upsert.mutate(parsed.data);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing, and stock levels."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New product
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <StatCard label="Total products" value={String(stats.total)} />
        <StatCard label="Active" value={String(stats.active)} />
        <StatCard label="Low stock" value={String(stats.lowStock)} accent={stats.lowStock > 0} />
        <StatCard label="Stock value" value={fmt(stats.value)} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU, category, barcode"
              className="pl-8 h-9"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {products.length}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={openCreate} hasQuery={!!query} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const low = Number(p.stock) <= Number(p.reorder_level);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(Number(p.price))}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(Number(p.cost))}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={low ? "text-destructive font-medium" : ""}>
                        {Number(p.stock)} {p.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update product details below." : "Add a product to your catalog."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <Field label="Name" error={errors.name} className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU" error={errors.sku}>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Barcode" error={errors.barcode}>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </Field>
            <Field label="Category" error={errors.category}>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Unit" error={errors.unit}>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <Field label="Sale price" error={errors.price}>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value as unknown as number })} />
            </Field>
            <Field label="Cost price" error={errors.cost}>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value as unknown as number })} />
            </Field>
            <Field label="Stock" error={errors.stock}>
              <Input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value as unknown as number })} />
            </Field>
            <Field label="Reorder level" error={errors.reorder_level}>
              <Input type="number" step="0.01" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value as unknown as number })} />
            </Field>
            <Field label="Status" error={errors.status} className="col-span-2">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" error={errors.description} className="col-span-2">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <DialogFooter className="col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${accent ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Field({
  label, error, children, className,
}: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EmptyState({ onCreate, hasQuery }: { onCreate: () => void; hasQuery: boolean }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        {hasQuery ? <AlertCircle className="h-5 w-5" /> : <Package className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-semibold">{hasQuery ? "No matching products" : "No products yet"}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasQuery ? "Try a different search term." : "Create your first product to get started."}
      </p>
      {!hasQuery && (
        <Button size="sm" className="mt-4" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />New product
        </Button>
      )}
    </div>
  );
}
