import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Languages, Coins, Ruler, Save, Plus, X,
  Upload, Trash2, FileText, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Settings = {
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  company_tax_id: string | null;
  language: "en" | "bn";
  currency_code: string;
  currency_symbol: string;
  currency_position: "before" | "after";
  decimal_places: number;
  default_unit: string;
  enabled_units: string[];
  tax_rate: number;
  invoice_prefix: string;
  invoice_footer: string | null;
  date_format: string;
};

const DEFAULT_UNITS = ["pcs", "pkt", "ream", "sheet", "tin", "ctn", "bag", "kg", "g", "ltr", "ml", "box", "dozen"];

const UNIT_LABELS: Record<string, { en: string; bn: string }> = {
  pcs: { en: "Pieces (pcs)", bn: "পিস" },
  pkt: { en: "Packet (Pkt)", bn: "প্যাকেট" },
  ream: { en: "Ream", bn: "রিম" },
  sheet: { en: "Sheet", bn: "শিট" },
  tin: { en: "Tin", bn: "টিন" },
  ctn: { en: "Carton (Ctn)", bn: "কার্টন" },
  bag: { en: "Bag", bn: "ব্যাগ" },
  kg: { en: "Kilogram (kg)", bn: "কেজি" },
  g: { en: "Gram (g)", bn: "গ্রাম" },
  ltr: { en: "Liter (L)", bn: "লিটার" },
  ml: { en: "Milliliter (ml)", bn: "মিলি" },
  box: { en: "Box", bn: "বক্স" },
  dozen: { en: "Dozen", bn: "ডজন" },
};

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD MMM YYYY"];

const T = {
  en: {
    title: "Settings", subtitle: "Configure your company, language, units, currency, and invoices.",
    company: "Company", language: "Language", units: "Units", currency: "Currency", invoice: "Invoice",
    save: "Save changes", saving: "Saving…",
  },
  bn: {
    title: "সেটিংস", subtitle: "কোম্পানি, ভাষা, একক, মুদ্রা ও ইনভয়েস কনফিগার করুন।",
    company: "কোম্পানি", language: "ভাষা", units: "একক", currency: "মুদ্রা", invoice: "ইনভয়েস",
    save: "সংরক্ষণ", saving: "সংরক্ষণ হচ্ছে…",
  },
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [newUnit, setNewUnit] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async (): Promise<Settings> => {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr || !userData.user) throw new Error("Not signed in");
      const user_id = userData.user.id;
      const { data: row, error } = await supabase
        .from("user_settings").select("*").eq("user_id", user_id).maybeSingle();
      if (error) throw error;
      if (row) return row as Settings;
      const defaults: Settings = {
        user_id,
        company_name: "My Company",
        company_logo_url: null,
        company_address: null,
        company_phone: null,
        company_email: null,
        company_website: null,
        company_tax_id: null,
        language: "en",
        currency_code: "USD",
        currency_symbol: "$",
        currency_position: "before",
        decimal_places: 2,
        default_unit: "pcs",
        enabled_units: ["pcs", "pkt", "ream", "sheet", "tin", "ctn", "bag"],
        tax_rate: 0,
        invoice_prefix: "INV-",
        invoice_footer: null,
        date_format: "DD/MM/YYYY",
      };
      const { error: ierr } = await supabase.from("user_settings").insert(defaults);
      if (ierr) throw ierr;
      return defaults;
    },
  });

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  // Resolve signed URL for logo preview
  useEffect(() => {
    let active = true;
    (async () => {
      if (!form?.company_logo_url) { setLogoPreview(null); return; }
      const { data, error } = await supabase.storage
        .from("company-logos")
        .createSignedUrl(form.company_logo_url, 3600);
      if (active && !error) setLogoPreview(data?.signedUrl ?? null);
    })();
    return () => { active = false; };
  }, [form?.company_logo_url]);

  const save = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase
        .from("user_settings")
        .update({
          company_name: s.company_name,
          company_logo_url: s.company_logo_url,
          company_address: s.company_address,
          company_phone: s.company_phone,
          company_email: s.company_email,
          company_website: s.company_website,
          company_tax_id: s.company_tax_id,
          language: s.language,
          currency_code: s.currency_code,
          currency_symbol: s.currency_symbol,
          currency_position: s.currency_position,
          decimal_places: s.decimal_places,
          default_unit: s.default_unit,
          enabled_units: s.enabled_units,
          tax_rate: s.tax_rate,
          invoice_prefix: s.invoice_prefix,
          invoice_footer: s.invoice_footer,
          date_format: s.date_format,
        })
        .eq("user_id", s.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["user-settings"] });
      qc.invalidateQueries({ queryKey: ["currency-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogoUpload = async (file: File) => {
    if (!form) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${form.user_id}/logo-${Date.now()}.${ext}`;
      // delete previous logo if any
      if (form.company_logo_url) {
        await supabase.storage.from("company-logos").remove([form.company_logo_url]);
      }
      const { error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const next = { ...form, company_logo_url: path };
      setForm(next);
      // Persist immediately so other pages pick it up
      await supabase.from("user_settings").update({ company_logo_url: path }).eq("user_id", form.user_id);
      qc.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Logo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!form?.company_logo_url) return;
    await supabase.storage.from("company-logos").remove([form.company_logo_url]);
    await supabase.from("user_settings").update({ company_logo_url: null }).eq("user_id", form.user_id);
    setForm({ ...form, company_logo_url: null });
    qc.invalidateQueries({ queryKey: ["user-settings"] });
    toast.success("Logo removed");
  };

  if (isLoading || !form) {
    return (
      <>
        <PageHeader title="Settings" description="Loading…" />
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading your settings…</Card>
      </>
    );
  }

  const t = T[form.language];
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({ ...form, [k]: v });

  const toggleUnit = (u: string) => {
    const has = form.enabled_units.includes(u);
    const next = has ? form.enabled_units.filter((x) => x !== u) : [...form.enabled_units, u];
    let def = form.default_unit;
    if (!next.includes(def)) def = next[0] ?? "pcs";
    setForm({ ...form, enabled_units: next, default_unit: def });
  };

  const addUnit = () => {
    const u = newUnit.trim().toLowerCase();
    if (!u) return;
    if (form.enabled_units.includes(u)) { toast.info("Unit already added"); return; }
    setForm({ ...form, enabled_units: [...form.enabled_units, u] });
    setNewUnit("");
  };

  const pickCurrency = (code: string) => {
    const c = CURRENCIES.find((x) => x.code === code);
    if (c) setForm({ ...form, currency_code: c.code, currency_symbol: c.symbol });
  };

  const previewAmount = () => {
    const n = (1234.56).toFixed(form.decimal_places);
    return form.currency_position === "before"
      ? `${form.currency_symbol}${n}`
      : `${n}${form.currency_symbol}`;
  };

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        actions={
          <Button size="sm" onClick={() => save.mutate(form)} disabled={save.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {save.isPending ? t.saving : t.save}
          </Button>
        }
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="mr-1.5 h-3.5 w-3.5" />{t.company}</TabsTrigger>
          <TabsTrigger value="currency"><Coins className="mr-1.5 h-3.5 w-3.5" />{t.currency}</TabsTrigger>
          <TabsTrigger value="invoice"><FileText className="mr-1.5 h-3.5 w-3.5" />{t.invoice}</TabsTrigger>
          <TabsTrigger value="units"><Ruler className="mr-1.5 h-3.5 w-3.5" />{t.units}</TabsTrigger>
          <TabsTrigger value="language"><Languages className="mr-1.5 h-3.5 w-3.5" />{t.language}</TabsTrigger>
        </TabsList>

        {/* Company */}
        <TabsContent value="company" className="mt-3">
          <Card className="max-w-3xl space-y-6 p-6">
            {/* Logo */}
            <div>
              <Label className="mb-2 block">Company logo</Label>
              <div className="flex items-start gap-4">
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-lg border bg-muted">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {uploading ? "Uploading…" : form.company_logo_url ? "Replace" : "Upload logo"}
                    </Button>
                    {form.company_logo_url && (
                      <Button variant="ghost" size="sm" onClick={removeLogo}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2 MB. Used on invoices and printable receipts.</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Company name</Label>
                <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.company_phone ?? ""} onChange={(e) => update("company_phone", e.target.value)} placeholder="+880 1XXX-XXXXXX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.company_email ?? ""} onChange={(e) => update("company_email", e.target.value)} placeholder="hello@company.com" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.company_website ?? ""} onChange={(e) => update("company_website", e.target.value)} placeholder="https://" />
              </div>
              <div>
                <Label>Tax / VAT ID</Label>
                <Input value={form.company_tax_id ?? ""} onChange={(e) => update("company_tax_id", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Textarea rows={3} value={form.company_address ?? ""} onChange={(e) => update("company_address", e.target.value)} placeholder="Street, City, Country" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Currency */}
        <TabsContent value="currency" className="mt-3">
          <Card className="max-w-3xl space-y-5 p-6">
            <p className="text-sm text-muted-foreground">Used across invoices, POS, and reports.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => pickCurrency(c.code)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-left transition",
                    form.currency_code === c.code ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-base font-semibold">
                    {c.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{c.code}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.name}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-3 border-t pt-4 sm:grid-cols-4">
              <div>
                <Label>Code</Label>
                <Input value={form.currency_code} onChange={(e) => update("currency_code", e.target.value.toUpperCase().slice(0, 5))} />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input value={form.currency_symbol} onChange={(e) => update("currency_symbol", e.target.value.slice(0, 4))} />
              </div>
              <div>
                <Label>Position</Label>
                <Select value={form.currency_position} onValueChange={(v) => update("currency_position", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before ($100)</SelectItem>
                    <SelectItem value="after">After (100$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Decimal places</Label>
                <Select value={String(form.decimal_places)} onValueChange={(v) => update("decimal_places", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Preview</div>
              <div className="mt-1 text-2xl font-semibold">
                {previewAmount()} <span className="text-sm font-normal text-muted-foreground">{form.currency_code}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Invoice */}
        <TabsContent value="invoice" className="mt-3">
          <Card className="max-w-3xl space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice number prefix</Label>
                <Input value={form.invoice_prefix} onChange={(e) => update("invoice_prefix", e.target.value)} placeholder="INV-" />
              </div>
              <div>
                <Label>Default tax rate (%)</Label>
                <Input type="number" min={0} step="0.01" value={form.tax_rate}
                  onChange={(e) => update("tax_rate", Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Date format</Label>
                <Select value={form.date_format} onValueChange={(v) => update("date_format", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Invoice footer / terms</Label>
              <Textarea rows={4} value={form.invoice_footer ?? ""} onChange={(e) => update("invoice_footer", e.target.value)}
                placeholder="Thank you for your business. Payment due within 30 days." />
            </div>
          </Card>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units" className="mt-3">
          <Card className="max-w-3xl space-y-5 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Enable units used across products and POS.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {Array.from(new Set([...DEFAULT_UNITS, ...form.enabled_units])).map((u) => {
                  const checked = form.enabled_units.includes(u);
                  const label = UNIT_LABELS[u]?.[form.language] ?? u;
                  const isCustom = !DEFAULT_UNITS.includes(u);
                  return (
                    <label
                      key={u}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition",
                        checked ? "border-primary/50 bg-primary/5" : "border-border hover:bg-accent",
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleUnit(u)} />
                      <span className="flex-1 truncate">{label}</span>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); toggleUnit(u); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Add custom unit" value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUnit())} />
              <Button variant="outline" onClick={addUnit}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="border-t pt-4">
              <Label>Default unit for new products</Label>
              <Select value={form.default_unit} onValueChange={(v) => update("default_unit", v)}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {form.enabled_units.map((u) => (
                    <SelectItem key={u} value={u}>{UNIT_LABELS[u]?.[form.language] ?? u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>

        {/* Language */}
        <TabsContent value="language" className="mt-3">
          <Card className="max-w-2xl space-y-4 p-6">
            <p className="text-sm text-muted-foreground">Choose the interface language.</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: "en", label: "English", sub: "English (US)" },
                { v: "bn", label: "বাংলা", sub: "Bangla" },
              ] as const).map((l) => (
                <button
                  key={l.v}
                  onClick={() => update("language", l.v)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 text-left transition",
                    form.language === l.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <div>
                    <div className="text-base font-semibold">{l.label}</div>
                    <div className="text-xs text-muted-foreground">{l.sub}</div>
                  </div>
                  {form.language === l.v && <Badge>Active</Badge>}
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
