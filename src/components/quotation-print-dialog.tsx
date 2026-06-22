import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  renderQuotationHTML, QUOTE_TEMPLATES, type QuotationTemplateData, type QuoteTemplateId,
} from "./quotation-templates";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  quotation: {
    quotation_no: string;
    issue_date: string;
    valid_until: string | null;
    status: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes: string | null;
  } | null;
  items: Array<{
    product_name: string;
    sku?: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
};

export function QuotationPrintDialog({ open, onOpenChange, quotation, items }: Props) {
  const [template, setTemplate] = useState<QuoteTemplateId>("classic");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("user_settings").select("*").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const path = (settings as any)?.company_logo_url as string | null | undefined;
      if (!path) { setLogoUrl(null); return; }
      const { data, error } = await supabase.storage
        .from("company-logos").createSignedUrl(path, 3600);
      if (active && !error) setLogoUrl(data?.signedUrl ?? null);
    })();
    return () => { active = false; };
  }, [settings]);

  const html = useMemo(() => {
    if (!quotation || !settings) return "";
    const data: QuotationTemplateData = {
      companyName: (settings as any).company_name ?? "My Company",
      companyLogoUrl: logoUrl,
      companyAddress: (settings as any).company_address,
      companyPhone: (settings as any).company_phone,
      companyEmail: (settings as any).company_email,
      companyWebsite: (settings as any).company_website,
      companyTaxId: (settings as any).company_tax_id,
      quotationNo: quotation.quotation_no,
      issueDate: quotation.issue_date,
      validUntil: quotation.valid_until,
      status: quotation.status,
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email,
      customerPhone: quotation.customer_phone,
      customerAddress: quotation.customer_address,
      items,
      subtotal: Number(quotation.subtotal),
      discount: Number(quotation.discount),
      tax: Number(quotation.tax),
      total: Number(quotation.total),
      currencySymbol: (settings as any).currency_symbol ?? "$",
      decimals: Number((settings as any).decimal_places ?? 2),
      currencyPosition: ((settings as any).currency_position ?? "before") as "before" | "after",
      notes: quotation.notes,
      footer: (settings as any).invoice_footer,
    };
    return renderQuotationHTML(template, data);
  }, [quotation, items, settings, logoUrl, template]);

  const print = () => {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    const trigger = () => { win.focus(); win.print(); };
    if (win.document.readyState === "complete") setTimeout(trigger, 200);
    else win.onload = () => setTimeout(trigger, 200);
  };

  const download = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quotation?.quotation_no ?? "quotation"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 gap-0 h-[90vh] flex flex-col">
        <DialogHeader className="border-b px-5 py-3 flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Print quotation {quotation?.quotation_no}</DialogTitle>
          <div className="flex items-center gap-2 mr-8">
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> HTML
            </Button>
            <Button size="sm" onClick={print}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <aside className="w-56 border-r p-3 space-y-2 overflow-y-auto bg-muted/20">
            <div className="text-xs font-medium text-muted-foreground px-1 mb-1">Templates</div>
            {QUOTE_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={cn(
                  "w-full text-left rounded-md border p-3 transition text-sm",
                  template === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                )}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
              </button>
            ))}
          </aside>

          <div className="flex-1 bg-muted/40 overflow-auto p-4 flex justify-center">
            <iframe
              title="Quotation preview"
              srcDoc={html}
              className="bg-white shadow-lg"
              style={{ width: "210mm", height: "297mm", border: 0 }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
