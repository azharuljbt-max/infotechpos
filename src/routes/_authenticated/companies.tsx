import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Pencil, Trash2, Building2, Star, Globe, Phone, Mail, KeyRound, Eye, EyeOff, Check, X, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { evaluatePassword, PASSWORD_RULES } from "@/lib/password-strength";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { setTeamUserPassword } from "@/lib/team-admin.functions";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
});

type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  website: string | null;
  currency: string;
  logo_url: string | null;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  is_default: boolean;
  notes: string | null;
};

const INDUSTRIES = ["Retail", "Wholesale", "Manufacturing", "Services", "Restaurant", "Pharmacy", "Electronics", "Other"];
const PLANS = ["trial", "basic", "pro", "enterprise"];
const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "INR", "SAR", "AED"];

const empty = {
  id: "", name: "", legal_name: "", industry: "Retail",
  email: "", phone: "", address: "", tax_id: "", website: "",
  currency: "USD", logo_url: "",
  plan: "trial", status: "active",
  trial_ends_at: "", is_default: false, notes: "",
};

function CompaniesPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [pwOpen, setPwOpen] = useState(false);
  const editing = !!form.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && ![c.name, c.legal_name, c.email, c.tax_id, c.industry].some((x) => x?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((c) => c.status === "active").length,
    trial: items.filter((c) => c.plan === "trial").length,
    paid: items.filter((c) => c.plan !== "trial").length,
  }), [items]);

  const save = useMutation({
    mutationFn: async (f: typeof empty) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!f.name) throw new Error("Company name required");

      // If marking default, clear other defaults first
      if (f.is_default) {
        await supabase.from("companies").update({ is_default: false }).eq("user_id", u.user.id);
      }

      const payload = {
        user_id: u.user.id,
        name: f.name,
        legal_name: f.legal_name || null,
        industry: f.industry || null,
        email: f.email || null,
        phone: f.phone || null,
        address: f.address || null,
        tax_id: f.tax_id || null,
        website: f.website || null,
        currency: f.currency,
        logo_url: f.logo_url || null,
        plan: f.plan,
        status: f.status,
        trial_ends_at: f.trial_ends_at || null,
        is_default: f.is_default,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("companies").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Company updated" : "Company added");
      qc.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      await supabase.from("companies").update({ is_default: false }).eq("user_id", u.user.id);
      const { error } = await supabase.from("companies").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default company set");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company deleted");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Companies"
        description="Manage multi-company workspaces, branding and plans."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPwOpen(true)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />Passwords
            </Button>
            <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />New company
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Active" value={String(stats.active)} />
        <Stat label="On Trial" value={String(stats.trial)} />
        <Stat label="Paid Plans" value={String(stats.paid)} />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search company, email, tax id…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No companies</p>
            <p className="text-xs text-muted-foreground">Add your first company workspace.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-muted">
                          {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-full w-full rounded-md object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            {c.name}
                            {c.is_default && <Star className="h-3 w-3 fill-warning text-warning" />}
                          </div>
                          {c.legal_name && <div className="text-xs text-muted-foreground">{c.legal_name}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                        {c.website && <div className="flex items-center gap-1"><Globe className="h-3 w-3" />{c.website}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.industry ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{c.currency}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{c.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!c.is_default && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Set default" onClick={() => setDefault.mutate(c.id)}>
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          setForm({
                            id: c.id, name: c.name, legal_name: c.legal_name ?? "",
                            industry: c.industry ?? "Retail", email: c.email ?? "",
                            phone: c.phone ?? "", address: c.address ?? "",
                            tax_id: c.tax_id ?? "", website: c.website ?? "",
                            currency: c.currency, logo_url: c.logo_url ?? "",
                            plan: c.plan, status: c.status,
                            trial_ends_at: c.trial_ends_at ?? "",
                            is_default: c.is_default, notes: c.notes ?? "",
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Display name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Legal name</Label>
              <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax ID / VAT</Label>
              <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trial ends</Label>
              <Input type="date" value={form.trial_ends_at} onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value })} />
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
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="is_default"
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="is_default" className="cursor-pointer">Set as default workspace</Label>
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

      <PasswordsDialog open={pwOpen} onOpenChange={setPwOpen} />
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

function PasswordsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [targetId, setTargetId] = useState<string>("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const setPassword = useServerFn(setTeamUserPassword);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members-for-pw"],
    enabled: open,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, email, full_name, role, is_active")
        .eq("owner_id", u.user.id)
        .not("user_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ user_id: string; email: string; full_name: string | null; role: string; is_active: boolean }>;
    },
  });

  const mutate = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error("Select a team member");
      if (pw.length < 8) throw new Error("Password must be at least 8 characters");
      await setPassword({ data: { targetUserId: targetId, newPassword: pw } });
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPw(""); setTargetId(""); setShow(false);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPw(""); setTargetId(""); setShow(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set user password</DialogTitle>
          <DialogDescription>Reset the login password for a team member in your workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Team member</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder={isLoading ? "Loading…" : "Select a user"} /></SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No active team members</div>
                ) : members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email} <span className="text-xs text-muted-foreground">· {m.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">The user can sign in with this new password immediately.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutate.mutate()} disabled={mutate.isPending || !targetId || pw.length < 8}>
            {mutate.isPending ? "Updating…" : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
