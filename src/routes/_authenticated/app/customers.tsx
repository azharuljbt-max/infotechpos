import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Users, Phone, Mail, MapPin } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/app/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_group: string | null;
  opening_balance: number;
  loyalty_points: number;
  status: string;
  notes: string | null;
};

const GROUPS = ["Retail", "Wholesale", "VIP", "Online"];
const empty = {
  id: "", name: "", phone: "", email: "", address: "",
  customer_group: "Retail", opening_balance: 0, loyalty_points: 0,
  status: "active", notes: "",
};

function CustomersPage() {
  const qc = useQueryClient();
  const { fmt } = useCurrency();
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const editing = !!form.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (groupFilter !== "all" && c.customer_group !== groupFilter) return false;
      if (q && ![c.name, c.phone, c.email, c.address].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, query, groupFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((c) => c.status === "active").length,
    due: items.reduce((a, c) => a + Number(c.opening_balance || 0), 0),
    loyalty: items.reduce((a, c) => a + Number(c.loyalty_points || 0), 0),
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
        customer_group: f.customer_group || null,
        opening_balance: Number(f.opening_balance) || 0,
        loyalty_points: Number(f.loyalty_points) || 0,
        status: f.status,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("customers").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer added");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer directory, contacts, dues and loyalty."
        actions={
          <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />New customer
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Active" value={String(stats.active)} />
        <Stat label="Opening Dues" value={fmt(stats.due)} />
        <Stat label="Loyalty Pts" value={String(stats.loyalty)} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search name, phone, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-12 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed p-12 text-center">
            <Users className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No customers</p>
            <p className="text-xs text-muted-foreground">Add your first customer.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Loyalty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{c.customer_group ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.opening_balance)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.loyalty_points}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setForm({
                            id: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "",
                            address: c.address ?? "", customer_group: c.customer_group ?? "Retail",
                            opening_balance: Number(c.opening_balance), loyalty_points: c.loyalty_points,
                            status: c.status, notes: c.notes ?? "",
                          });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
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
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Group</Label>
              <Select value={form.customer_group} onValueChange={(v) => setForm({ ...form, customer_group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
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
            <div>
              <Label>Opening balance</Label>
              <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Loyalty points</Label>
              <Input type="number" value={form.loyalty_points} onChange={(e) => setForm({ ...form, loyalty_points: Number(e.target.value) || 0 })} />
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
