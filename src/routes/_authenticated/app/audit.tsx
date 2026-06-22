import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList, Download, Eye, Search, Trash2, ShieldAlert, Activity, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  before_data: any;
  after_data: any;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  severity: string;
  created_at: string;
}

function AuditPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [rangeDays, setRangeDays] = useState("30");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs", rangeDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(rangeDays));
      const { data, error } = await (supabase.from("audit_logs" as any) as any)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const modules = useMemo(
    () => Array.from(new Set(logs.map((l) => l.module))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
      if (severityFilter !== "all" && l.severity !== severityFilter) return false;
      if (!q) return true;
      return [l.action, l.module, l.description, l.entity_id, l.user_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [logs, search, moduleFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: logs.length,
    critical: logs.filter((l) => l.severity === "critical").length,
    warning: logs.filter((l) => l.severity === "warning").length,
    today: logs.filter((l) => {
      const d = new Date(l.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  }), [logs]);

  const purgeOld = useMutation({
    mutationFn: async (days: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const { error } = await (supabase.from("audit_logs" as any) as any)
        .delete()
        .lt("created_at", cutoff.toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Old logs purged");
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function exportCSV() {
    const headers = ["Time", "User", "Module", "Action", "Entity", "Severity", "Device", "Description"];
    const rows = filtered.map((l) => [
      l.created_at,
      l.user_email ?? "",
      l.module,
      l.action,
      `${l.entity_type ?? ""}:${l.entity_id ?? ""}`,
      l.severity,
      l.device ?? "",
      (l.description ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v)}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const severityBadge = (s: string) => {
    if (s === "critical") return <Badge variant="destructive">Critical</Badge>;
    if (s === "warning") return <Badge className="bg-amber-500">Warning</Badge>;
    return <Badge variant="secondary">Info</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Complete trail of every change in your workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" /> Retention
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Purge logs older than 90 days?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes audit log entries older than 90 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => purgeOld.mutate(90)}>
                  Purge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={stats.total} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Today" value={stats.today} icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Warnings" value={stats.warning} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Critical" value={stats.critical} icon={<ShieldAlert className="h-4 w-4 text-destructive" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search action, user, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No audit events found.</TableCell></TableRow>
                ) : filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(l.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-xs">{l.user_email ?? l.user_id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{l.module}</Badge></TableCell>
                    <TableCell className="font-medium">{l.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.entity_type ? `${l.entity_type}${l.entity_id ? `:${l.entity_id.slice(0, 8)}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{l.device ?? "—"}</TableCell>
                    <TableCell>{severityBadge(l.severity)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(l)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row k="Time" v={format(new Date(selected.created_at), "PPpp")} />
              <Row k="User" v={selected.user_email ?? selected.user_id} />
              <Row k="Module" v={selected.module} />
              <Row k="Action" v={selected.action} />
              <Row k="Entity" v={`${selected.entity_type ?? "—"} ${selected.entity_id ?? ""}`} />
              <Row k="Severity" v={selected.severity} />
              <Row k="Device" v={selected.device ?? "—"} />
              <Row k="User Agent" v={selected.user_agent ?? "—"} />
              {selected.description && <Row k="Description" v={selected.description} />}
              {(selected.before_data || selected.after_data) && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="font-semibold mb-1">Before</p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(selected.before_data, null, 2) || "—"}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">After</p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(selected.after_data, null, 2) || "—"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 border-b pb-1">
      <span className="w-28 text-muted-foreground">{k}</span>
      <span className="flex-1 break-all">{v}</span>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/app/audit")({
  component: AuditPage,
});
