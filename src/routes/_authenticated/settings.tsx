import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon, Building2, Languages, Coins, Ruler, Save, Plus, X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  language: "en" | "bn";
  currency_code: string;
  currency_symbol: string;
  default_unit: string;
  enabled_units: string[];
  tax_rate: number;
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

const T = {
  en: {
    title: "Settings", subtitle: "Configure your workspace, language, units, and currency.",
    general: "General", language: "Language", units: "Units", currency: "Currency",
    company: "Company Name", taxRate: "Default Tax Rate (%)",
    save: "Save changes", saving: "Saving…",
    chooseLang: "Choose the interface language",
    chooseUnits: "Enable units used across products and POS",
    defaultUnit: "Default unit for new products",
    addCustomUnit: "Add custom unit",
    chooseCurrency: "Choose currency used across invoices, POS and reports",
    customSymbol: "Currency symbol",
    customCode: "Currency code",
    preview: "Preview",
  },
  bn: {
    title: "সেটিংস", subtitle: "আপনার ওয়ার্কস্পেস, ভাষা, একক ও মুদ্রা কনফিগার করুন।",
    general: "সাধারণ", language: "ভাষা", units: "একক", currency: "মুদ্রা",
    company: "কোম্পানির নাম", taxRate: "ডিফল্ট ট্যাক্স রেট (%)",
    save: "পরিবর্তন সংরক্ষণ", saving: "সংরক্ষণ হচ্ছে…",
    chooseLang: "ইন্টারফেস ভাষা নির্বাচন করুন",
    chooseUnits: "প্রোডাক্ট ও POS-এ ব্যবহৃত একক সক্রিয় করুন",
    defaultUnit: "নতুন প্রোডাক্টের জন্য ডিফল্ট একক",
    addCustomUnit: "কাস্টম একক যোগ করুন",
    chooseCurrency: "ইনভয়েস, POS ও রিপোর্টে ব্যবহৃত মুদ্রা",
    customSymbol: "মুদ্রার চিহ্ন",
    customCode: "মুদ্রা কোড",
    preview: "প্রিভিউ",
  },
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [newUnit, setNewUnit] = useState("");

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
        language: "en",
        currency_code: "USD",
        currency_symbol: "$",
        default_unit: "pcs",
        enabled_units: ["pcs", "pkt", "ream", "sheet", "tin", "ctn", "bag"],
        tax_rate: 0,
      };
      const { error: ierr } = await supabase.from("user_settings").insert(defaults);
      if (ierr) throw ierr;
      return defaults;
    },
  });

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const save = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase
        .from("user_settings")
        .update({
          company_name: s.company_name,
          language: s.language,
          currency_code: s.currency_code,
          currency_symbol: s.currency_symbol,
          default_unit: s.default_unit,
          enabled_units: s.enabled_units,
          tax_rate: s.tax_rate,
        })
        .eq("user_id", s.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <>
        <PageHeader title="Settings" description="Loading…" icon={<SettingsIcon className="h-5 w-5" />} />
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

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><Building2 className="mr-1.5 h-3.5 w-3.5" />{t.general}</TabsTrigger>
          <TabsTrigger value="language"><Languages className="mr-1.5 h-3.5 w-3.5" />{t.language}</TabsTrigger>
          <TabsTrigger value="units"><Ruler className="mr-1.5 h-3.5 w-3.5" />{t.units}</TabsTrigger>
          <TabsTrigger value="currency"><Coins className="mr-1.5 h-3.5 w-3.5" />{t.currency}</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-3">
          <Card className="max-w-2xl space-y-4 p-6">
            <div>
              <Label>{t.company}</Label>
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
            </div>
            <div>
              <Label>{t.taxRate}</Label>
              <Input type="number" min={0} step="0.01" value={form.tax_rate}
                onChange={(e) => update("tax_rate", Number(e.target.value) || 0)} />
            </div>
          </Card>
        </TabsContent>

        {/* Language */}
        <TabsContent value="language" className="mt-3">
          <Card className="max-w-2xl space-y-4 p-6">
            <p className="text-sm text-muted-foreground">{t.chooseLang}</p>
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

        {/* Units */}
        <TabsContent value="units" className="mt-3">
          <Card className="max-w-3xl space-y-5 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{t.chooseUnits}</p>
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
              <Input placeholder={t.addCustomUnit} value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUnit())} />
              <Button variant="outline" onClick={addUnit}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="border-t border-border pt-4">
              <Label>{t.defaultUnit}</Label>
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

        {/* Currency */}
        <TabsContent value="currency" className="mt-3">
          <Card className="max-w-3xl space-y-5 p-6">
            <p className="text-sm text-muted-foreground">{t.chooseCurrency}</p>
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

            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <Label>{t.customCode}</Label>
                <Input value={form.currency_code} onChange={(e) => update("currency_code", e.target.value.toUpperCase().slice(0, 5))} />
              </div>
              <div>
                <Label>{t.customSymbol}</Label>
                <Input value={form.currency_symbol} onChange={(e) => update("currency_symbol", e.target.value.slice(0, 4))} />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.preview}</div>
              <div className="mt-1 text-2xl font-semibold">
                {form.currency_symbol} 1,234.56 <span className="text-sm font-normal text-muted-foreground">{form.currency_code}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
