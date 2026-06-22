import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Truck, Phone, Mail } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/app/suppliers")({
  component: SuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  opening_balance: number;
  status: string;
  notes: string | null;
};

const TERMS = ["Cash", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
const empty = {
  id: "", name: "", phone: "", email: "", address: "",
  contact_person: "", payment_terms: "Cash", opening_balance: 0,
  status: "active", notes: "",
};

function SuppliersPage() {
  const qc = useQueryClient();
  const { fmt } = useCurrency();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const editing = !!form.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q && ![s.name, s.phone, s.email, s.contact_person].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((s) => s.status === "active").length,
    due: items.reduce((a, s) => a + Number(s.opening_balance || 0), 0),
  }), [items]);

  const save = useMutation({
    mutationFn: async (f: typeof empty) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.name) throw new Error("Name required");
      const payload = {
        user_id: u.user.id,
        name: f.name,
        phone: f.phone || null,
        email: f.email || null,
        address: f.address || null,
        contact_person: f.contact_person || null,
        payment_terms: f.payment_terms || null,
        opening_balance: Number(f.opening_balance) || 0,
        status: f.status,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Supplier updated" : "Supplier added");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier deleted");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Supplier directory with contacts, dues and payment terms."
        actions={
          <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />New supplier
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
        <Stat label="Total Suppliers" value={String(stats.total)} />
        <Stat label="Active" value={String(stats.active)} />
        <Stat label="Opening Payables" value={fmt(stats.due)} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search name, contact, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
            <Truck className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No suppliers</p>
            <p className="text-xs text-muted-foreground">Add your first supplier.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {s.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</div>}
                        {s.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.contact_person ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{s.payment_terms ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(s.opening_balance)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setForm({
                            id: s.id, name: s.name, phone: s.phone ?? "", email: s.email ?? "",
                            address: s.address ?? "", contact_person: s.contact_person ?? "",
                            payment_terms: s.payment_terms ?? "Cash",
                            opening_balance: Number(s.opening_balance), status: s.status,
                            notes: s.notes ?? "",
                          });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm(`Delete ${s.name}?`)) del.mutate(s.id); }}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Company name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Contact person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div>
              <Label>Payment terms</Label>
              <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Opening balance</Label>
              <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </Card>
  );
}
