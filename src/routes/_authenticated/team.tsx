import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, UserPlus, Mail, Copy, Trash2, Search, Users, ShieldAlert, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type AppRole = "owner" | "admin" | "manager" | "staff" | "viewer";

interface TeamMember {
  id: string;
  user_id: string;
  owner_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  branch: string | null;
  is_active: boolean;
  two_factor_required: boolean;
  last_active_at: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  branch: string | null;
  token: string;
  status: string;
  expires_at: string;
  invited_at: string;
}

const ROLES: AppRole[] = ["owner", "admin", "manager", "staff", "viewer"];

const PERMISSIONS: Record<AppRole, string[]> = {
  owner: ["Full access", "Billing", "Delete workspace", "Manage all"],
  admin: ["Manage team", "All modules", "Settings", "Reports"],
  manager: ["Sales", "Purchases", "Inventory", "Reports"],
  staff: ["POS", "View inventory", "Create sales"],
  viewer: ["Read-only access"],
};

const roleColor = (r: AppRole) => ({
  owner: "bg-purple-500",
  admin: "bg-red-500",
  manager: "bg-blue-500",
  staff: "bg-emerald-500",
  viewer: "bg-slate-500",
}[r]);

function TeamPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({
    email: "", full_name: "", role: "staff" as AppRole, branch: "",
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_roles" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["team_invites"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("team_invitations" as any) as any)
        .select("*")
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });

  const invite = useMutation({
    mutationFn: async (f: typeof form) => {
      if (!me) throw new Error("Not signed in");
      const { error } = await (supabase.from("team_invitations" as any) as any).insert({
        owner_id: me.id,
        email: f.email,
        full_name: f.full_name || null,
        role: f.role,
        branch: f.branch || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setForm({ email: "", full_name: "", role: "staff", branch: "" });
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMember = useMutation({
    mutationFn: async (m: Partial<TeamMember> & { id: string }) => {
      const { id, ...rest } = m;
      const { error } = await (supabase.from("user_roles" as any) as any)
        .update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("user_roles" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["team_members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("team_invitations" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["team_invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.email, m.full_name, m.role, m.branch].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [members, search]);

  const stats = {
    total: members.length,
    active: members.filter((m) => m.is_active).length,
    admins: members.filter((m) => m.role === "owner" || m.role === "admin").length,
    pending: invites.filter((i) => i.status === "pending").length,
  };

  const copyInvite = (token: string) => {
    const url = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Team & Roles
          </h1>
          <p className="text-sm text-muted-foreground">
            Invite members, assign roles, and control permissions.
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="person@company.com" />
              </div>
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r !== "owner").map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    placeholder="Optional" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={() => invite.mutate(form)} disabled={!form.email || invite.isPending}>
                <Mail className="h-4 w-4 mr-2" /> Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Members" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <Stat label="Active" value={stats.active} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <Stat label="Admins" value={stats.admins} icon={<ShieldAlert className="h-4 w-4 text-red-500" />} />
        <Stat label="Pending Invites" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-500" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search members..." className="pl-8"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No members yet. Invite your first teammate.
                  </TableCell></TableRow>
                ) : filteredMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColor(m.role)} capitalize text-white`}>{m.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.branch ?? "—"}</TableCell>
                    <TableCell>
                      {m.two_factor_required
                        ? <Badge variant="secondary">Required</Badge>
                        : <span className="text-xs text-muted-foreground">Optional</span>}
                    </TableCell>
                    <TableCell>
                      {m.is_active
                        ? <Badge className="bg-emerald-500">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.last_active_at ? format(new Date(m.last_active_at), "MMM d, HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {m.email ?? "member"}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This revokes their access. They can be re-invited later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMember.mutate(m.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No invitations sent.
                  </TableCell></TableRow>
                ) : invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColor(i.role)} capitalize text-white`}>{i.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{i.branch ?? "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(i.invited_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-xs">{format(new Date(i.expires_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={i.status === "pending" ? "secondary" : "default"} className="capitalize">
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => copyInvite(i.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => revokeInvite.mutate(i.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <div key={r} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={`${roleColor(r)} capitalize text-white`}>{r}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {members.filter((m) => m.role === r).length} member(s)
                  </span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {PERMISSIONS[r].map((p) => (
                    <li key={p} className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={editing.full_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select value={editing.role}
                    onValueChange={(v) => setEditing({ ...editing, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input value={editing.branch ?? ""}
                    onChange={(e) => setEditing({ ...editing, branch: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive members cannot sign in.</p>
                </div>
                <Switch checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">Require 2FA</p>
                  <p className="text-xs text-muted-foreground">Enforce two-factor authentication.</p>
                </div>
                <Switch checked={editing.two_factor_required}
                  onCheckedChange={(v) => setEditing({ ...editing, two_factor_required: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && updateMember.mutate({
              id: editing.id,
              full_name: editing.full_name,
              role: editing.role,
              branch: editing.branch,
              is_active: editing.is_active,
              two_factor_required: editing.two_factor_required,
            })} disabled={updateMember.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});
