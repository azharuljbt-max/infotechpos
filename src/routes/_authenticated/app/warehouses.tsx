import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Warehouse, Plus, Search, Edit, Trash2, MapPin, Phone, User as UserIcon, Star } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/app/warehouses")({
  component: WarehousesPage,
});

type Warehouse = {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
};

type FormState = {
  id?: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager: string;
  is_default: boolean;
  status: string;
};

const EMPTY: FormState = {
  name: "", code: "", address: "", phone: "", manager: "", is_default: false, status: "active",
};

function WarehousesPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) =>
      [w.name, w.code, w.address, w.manager].some((x) => x?.toLowerCase().includes(q)),
    );
  }, [warehouses, query]);

  const stats = useMemo(() => ({
    total: warehouses.length,
    active: warehouses.filter((w) => w.status === "active").length,
    inactive: warehouses.filter((w) => w.status !== "active").length,
  }), [warehouses]);

  const save = useMutation({
    mutationFn: async (s: FormState) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (s.is_default) {
        await supabase.from("warehouses").update({ is_default: false }).eq("user_id", u.user.id);
      }
      const payload = {
        user_id: u.user.id,
        name: s.name.trim(),
        code: s.code.trim() || null,
        address: s.address.trim() || null,
        phone: s.phone.trim() || null,
        manager: s.manager.trim() || null,
        is_default: s.is_default,
        status: s.status,
      };
      if (s.id) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Warehouse updated" : "Warehouse added");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Warehouse deleted");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (w: Warehouse) => {
    setForm({
      id: w.id, name: w.name, code: w.code ?? "", address: w.address ?? "",
      phone: w.phone ?? "", manager: w.manager ?? "", is_default: w.is_default, status: w.status,
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Manage stock locations, branches and storage points."
        actions={<Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-3.5 w-3.5" />New warehouse</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} icon={<Warehouse className="h-4 w-4" />} />
        <StatCard label="Active" value={stats.active} icon={<Warehouse className="h-4 w-4 text-green-500" />} />
        <StatCard label="Inactive" value={stats.inactive} icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Card className="p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search warehouses…" className="pl-8" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No warehouses yet</TableCell></TableRow>
            ) : filtered.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {w.name}
                    {w.is_default && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{w.code || "—"}</TableCell>
                <TableCell className="text-xs">{w.address || "—"}</TableCell>
                <TableCell className="text-xs">{w.manager || "—"}</TableCell>
                <TableCell className="text-xs">{w.phone || "—"}</TableCell>
                <TableCell>
                  <Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(w)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete ${w.name}?`)) del.mutate(w.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit warehouse" : "New warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WH-01" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Manager</Label>
                <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Set as default warehouse
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.name.trim() || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </Card>
  );
}
