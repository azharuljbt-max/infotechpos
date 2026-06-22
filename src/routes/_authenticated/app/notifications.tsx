import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Search, Check, CheckCheck, Trash2, Archive, ArchiveRestore,
  AlertTriangle, Info, AlertCircle, Plus, RefreshCw, Package, Wallet,
  ShoppingCart, FileText, Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: NotificationsPage,
});

type Notification = {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string | null;
  severity: "info" | "warning" | "critical" | "success";
  entity_type: string | null;
  entity_id: string | null;
  link: string | null;
  metadata: any;
  is_read: boolean;
  is_archived: boolean;
  read_at: string | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "low_stock", label: "Low Stock", icon: Package },
  { value: "due", label: "Dues", icon: Wallet },
  { value: "payment", label: "Payment", icon: Wallet },
  { value: "order", label: "Order", icon: ShoppingCart },
  { value: "invoice", label: "Invoice", icon: FileText },
  { value: "customer", label: "Customer", icon: Users },
  { value: "general", label: "General", icon: Bell },
];

const SEVERITIES = ["info", "success", "warning", "critical"] as const;

function severityMeta(s: string) {
  switch (s) {
    case "critical": return { icon: AlertCircle, cls: "text-destructive", badge: "destructive" as const };
    case "warning": return { icon: AlertTriangle, cls: "text-yellow-600", badge: "secondary" as const };
    case "success": return { icon: Check, cls: "text-green-600", badge: "default" as const };
    default: return { icon: Info, cls: "text-blue-600", badge: "outline" as const };
  }
}

function categoryIcon(c: string) {
  return CATEGORIES.find(x => x.value === c)?.icon ?? Bell;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("notifications-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const stats = useMemo(() => ({
    total: rows.length,
    unread: rows.filter(r => !r.is_read && !r.is_archived).length,
    critical: rows.filter(r => r.severity === "critical" && !r.is_archived).length,
    today: rows.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
  }), [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (tab === "unread" && (r.is_read || r.is_archived)) return false;
      if (tab === "archived" && !r.is_archived) return false;
      if (tab === "all" && r.is_archived) return false;
      if (category !== "all" && r.category !== category) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !(r.message ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, tab, category, severity, query]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markUnread = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: false, read_at: null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const archive = useMutation({
    mutationFn: async ({ ids, archived }: { ids: string[]; archived: boolean }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_archived: archived })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification removed");
    },
  });

  const markAllRead = async () => {
    const ids = filtered.filter(r => !r.is_read).map(r => r.id);
    if (!ids.length) return toast.info("Nothing to mark");
    await markRead.mutateAsync(ids);
    toast.success(`Marked ${ids.length} as read`);
  };

  const clearArchived = async () => {
    const ids = rows.filter(r => r.is_archived).map(r => r.id);
    if (!ids.length) return toast.info("No archived items");
    await remove.mutateAsync(ids);
  };

  // Scan: generate notifications from real data (low stock + overdue invoices)
  const runScan = async () => {
    setScanning(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const inserts: any[] = [];

      // Low stock
      const { data: prods } = await supabase
        .from("products")
        .select("id,name,stock,low_stock_threshold");
      (prods ?? []).forEach((p: any) => {
        const threshold = Number(p.low_stock_threshold ?? 0);
        if (threshold > 0 && Number(p.stock ?? 0) <= threshold) {
          inserts.push({
            user_id: uid,
            type: "low_stock",
            category: "low_stock",
            severity: Number(p.stock) <= 0 ? "critical" : "warning",
            title: Number(p.stock) <= 0 ? `Out of stock: ${p.name}` : `Low stock: ${p.name}`,
            message: `Current stock ${p.stock} (threshold ${threshold})`,
            entity_type: "product",
            entity_id: p.id,
            link: "/stock",
          });
        }
      });

      // Overdue invoices
      const today = new Date().toISOString().slice(0, 10);
      const { data: invs } = await supabase
        .from("invoices")
        .select("id,invoice_number,total,due_amount,due_date,status,customer_name")
        .lt("due_date", today);
      (invs ?? []).forEach((i: any) => {
        if (Number(i.due_amount ?? 0) > 0 && i.status !== "paid") {
          inserts.push({
            user_id: uid,
            type: "invoice_overdue",
            category: "due",
            severity: "warning",
            title: `Overdue: ${i.invoice_number}`,
            message: `${i.customer_name ?? "Customer"} owes ${i.due_amount} (due ${i.due_date})`,
            entity_type: "invoice",
            entity_id: i.id,
            link: "/invoices",
          });
        }
      });

      if (!inserts.length) {
        toast.info("All clear — no new alerts");
        return;
      }

      // De-dupe against existing unread for the same entity
      const { data: existing } = await supabase
        .from("notifications")
        .select("entity_type,entity_id,type")
        .eq("is_read", false)
        .eq("is_archived", false);
      const seen = new Set((existing ?? []).map((e: any) => `${e.type}:${e.entity_type}:${e.entity_id}`));
      const fresh = inserts.filter(n => !seen.has(`${n.type}:${n.entity_type}:${n.entity_id}`));

      if (!fresh.length) {
        toast.info("Existing alerts already cover this");
        return;
      }

      const { error } = await supabase.from("notifications").insert(fresh);
      if (error) throw error;
      toast.success(`Generated ${fresh.length} notification(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Alerts for low stock, dues, payments, and orders."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={runScan} disabled={scanning}>
              <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> Scan now
            </Button>
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<Bell className="h-4 w-4" />} />
        <StatCard label="Unread" value={stats.unread} icon={<AlertCircle className="h-4 w-4 text-blue-600" />} />
        <StatCard label="Critical" value={stats.critical} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        <StatCard label="Today" value={stats.today} icon={<Info className="h-4 w-4 text-green-600" />} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Inbox</TabsTrigger>
              <TabsTrigger value="unread">Unread{stats.unread ? ` (${stats.unread})` : ""}</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="pl-8 w-56"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {tab === "archived" && (
              <Button variant="outline" onClick={clearArchived}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear archived
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No notifications
                </TableCell></TableRow>
              ) : filtered.map(n => {
                const meta = severityMeta(n.severity);
                const CatIcon = categoryIcon(n.category);
                const SevIcon = meta.icon;
                return (
                  <TableRow key={n.id} className={!n.is_read ? "bg-muted/40" : ""}>
                    <TableCell><SevIcon className={`h-4 w-4 ${meta.cls}`} /></TableCell>
                    <TableCell>
                      <div className={`font-medium ${!n.is_read ? "" : "text-muted-foreground"}`}>{n.title}</div>
                      {n.message && <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>}
                      {n.link && (
                        <Link to={n.link as any} className="text-xs text-primary hover:underline">Open →</Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <CatIcon className="h-3 w-3" />
                        {CATEGORIES.find(c => c.value === n.category)?.label ?? n.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.badge} className="capitalize">{n.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {n.is_read ? (
                          <Button size="icon" variant="ghost" title="Mark unread" onClick={() => markUnread.mutate([n.id])}>
                            <Bell className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Mark read" onClick={() => markRead.mutate([n.id])}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title={n.is_archived ? "Restore" : "Archive"}
                          onClick={() => archive.mutate({ ids: [n.id], archived: !n.is_archived })}
                        >
                          {n.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete" onClick={() => remove.mutate([n.id])}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    message: "",
    category: "general",
    severity: "info",
    link: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) throw new Error("Not authenticated");
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("notifications").insert({
        user_id: uid,
        type: "manual",
        category: form.category,
        severity: form.severity,
        title: form.title,
        message: form.message || null,
        link: form.link || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification created");
      onOpenChange(false);
      setForm({ title: "", message: "", category: "general", severity: "info", link: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New notification</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Link (optional)</Label>
            <Input placeholder="/invoices" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </Card>
  );
}
