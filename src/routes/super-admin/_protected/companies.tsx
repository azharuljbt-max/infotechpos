import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCompanyAsSuperAdmin } from "@/lib/super-admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/_protected/companies")({
  component: CompaniesPage,
});

const PLANS = ["trial", "basic", "pro", "enterprise"] as const;
const STATUSES = ["active", "suspended", "trial"] as const;
const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "INR", "SAR", "AED"];
const INDUSTRIES = ["Retail", "Wholesale", "Manufacturing", "Services", "Restaurant", "Pharmacy", "Electronics", "Other"];

const emptyForm = {
  name: "",
  legal_name: "",
  industry: "Retail",
  email: "",
  phone: "",
  address: "",
  tax_id: "",
  website: "",
  currency: "USD",
  plan: "trial" as (typeof PLANS)[number],
  status: "active" as (typeof STATUSES)[number],
  trial_ends_at: "",
  notes: "",
  owner_email: "",
  owner_password: "",
  owner_full_name: "",
};

function CompaniesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const createFn = useServerFn(createCompanyAsSuperAdmin);

  const { data: companies = [] } = useQuery({
    queryKey: ["sa-all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, user_id, currency, status, plan, created_at, email, phone")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("companies") as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["sa-all-companies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Company created");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["sa-all-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">All Companies</h1>
          <p className="text-sm text-muted-foreground">Global overview of every tenant. Create, suspend, or activate.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Company
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.user_id?.slice(0, 8)}…</TableCell>
                <TableCell className="capitalize">{c.plan}</TableCell>
                <TableCell>{c.currency}</TableCell>
                <TableCell className="text-xs">{c.email ?? "—"}</TableCell>
                <TableCell>
                  {c.status === "active"
                    ? <Badge>Active</Badge>
                    : c.status === "trial"
                      ? <Badge variant="outline">Trial</Badge>
                      : <Badge variant="secondary">Suspended</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggle.mutate({ id: c.id, status: c.status === "active" ? "suspended" : "active" })}
                  >
                    {c.status === "active" ? "Suspend" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No companies yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>Provision a new tenant and assign an owner login.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Legal Name</Label>
              <Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div>
              <Label>Tax ID</Label>
              <Input value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trial Ends At</Label>
              <Input type="date" value={form.trial_ends_at} onChange={(e) => set("trial_ends_at", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>

            <div className="sm:col-span-2 mt-2 pt-3 border-t">
              <div className="text-sm font-medium mb-2">Owner Login</div>
            </div>
            <div>
              <Label>Owner Full Name</Label>
              <Input value={form.owner_full_name} onChange={(e) => set("owner_full_name", e.target.value)} />
            </div>
            <div>
              <Label>Owner Email *</Label>
              <Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Owner Password *</Label>
              <Input
                type="password"
                value={form.owner_password}
                onChange={(e) => set("owner_password", e.target.value)}
                placeholder="Min 10 chars, upper/lower/number/symbol"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.owner_email || !form.owner_password}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
