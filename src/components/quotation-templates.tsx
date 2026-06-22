// A4 quotation templates rendered as self-contained HTML strings for iframe printing.

export type QuotationTemplateData = {
  companyName: string;
  companyLogoUrl?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyTaxId?: string | null;
  quotationNo: string;
  issueDate: string;
  validUntil?: string | null;
  status?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: Array<{
    product_name: string;
    sku?: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currencySymbol: string;
  decimals: number;
  currencyPosition: "before" | "after";
  notes?: string | null;
  footer?: string | null;
};

export type QuoteTemplateId = "classic" | "modern" | "minimal";

export const QUOTE_TEMPLATES: { id: QuoteTemplateId; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Traditional bordered layout with header bar" },
  { id: "modern", label: "Modern", description: "Bold accent stripe with two-column header" },
  { id: "minimal", label: "Minimal", description: "Clean, lots of whitespace, monochrome" },
];

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");

function money(n: number, d: QuotationTemplateData) {
  const v = Number(n || 0).toFixed(d.decimals);
  return d.currencyPosition === "before" ? `${d.currencySymbol}${v}` : `${v}${d.currencySymbol}`;
}

const BASE_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff;
    padding: 16mm 14mm; display: flex; flex-direction: column; }
  table { width: 100%; border-collapse: collapse; }
  .logo { max-height: 64px; max-width: 200px; object-fit: contain; }
  .muted { color: #6b7280; }
  .small { font-size: 10px; }
  .num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
  @media print { body { background: #fff; } .page { box-shadow: none; } }
`;

function wrap(css: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Quotation</title>
<style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`;
}

/* ---------------- CLASSIC ---------------- */
function classic(d: QuotationTemplateData) {
  const css = `
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 10mm; }
    .co-name { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
    .title { font-size: 32px; font-weight: 700; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase; }
    .meta { margin-top: 4px; font-size: 11px; color: #6b7280; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin: 8mm 0; font-size: 12px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; }
    .box { border: 1px solid #e5e7eb; padding: 4mm 5mm; border-radius: 2px; }
    table.items thead th { background: #0f766e; color: #fff; text-align: left; font-weight: 600; font-size: 11px;
      padding: 7px 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    table.items thead th.num { text-align: right; }
    table.items tbody td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
    .totals { margin-top: 6mm; margin-left: auto; width: 75mm; font-size: 12px; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #0f766e; margin-top: 4px; padding-top: 8px; font-size: 14px; font-weight: 700; color:#0f766e; }
    .footer { margin-top: auto; padding-top: 8mm; border-top: 1px solid #e5e7eb; font-size: 11px; color: #4b5563; }
    .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; background:#ccfbf1; color:#0f766e; }
  `;
  const body = `
    <div class="page">
      <div class="head">
        <div>
          ${d.companyLogoUrl ? `<img class="logo" src="${esc(d.companyLogoUrl)}" alt="logo"/><br/>` : ""}
          <div class="co-name">${esc(d.companyName)}</div>
          <div class="meta">
            ${d.companyAddress ? esc(d.companyAddress) + "<br/>" : ""}
            ${d.companyPhone ? "Tel: " + esc(d.companyPhone) + " &middot; " : ""}
            ${d.companyEmail ? esc(d.companyEmail) : ""}
            ${d.companyWebsite ? "<br/>" + esc(d.companyWebsite) : ""}
            ${d.companyTaxId ? "<br/>Tax ID: " + esc(d.companyTaxId) : ""}
          </div>
        </div>
        <div style="text-align:right">
          <div class="title">Quotation</div>
          <div class="meta"># ${esc(d.quotationNo)}</div>
          <div class="meta">Issued ${esc(d.issueDate)}${d.validUntil ? ` &middot; Valid until ${esc(d.validUntil)}` : ""}</div>
          ${d.status ? `<div style="margin-top:6px"><span class="status">${esc(d.status)}</span></div>` : ""}
        </div>
      </div>

      <div class="parties">
        <div class="box">
          <div class="label">Quote For</div>
          <div style="font-weight:600">${esc(d.customerName || "—")}</div>
          ${d.customerAddress ? `<div class="muted small" style="margin-top:4px">${esc(d.customerAddress)}</div>` : ""}
          ${d.customerEmail ? `<div class="small" style="margin-top:4px">${esc(d.customerEmail)}</div>` : ""}
          ${d.customerPhone ? `<div class="small">${esc(d.customerPhone)}</div>` : ""}
        </div>
        <div class="box">
          <div class="label">Quote Details</div>
          <div class="small"><b>Quote #</b> ${esc(d.quotationNo)}</div>
          <div class="small"><b>Issue date</b> ${esc(d.issueDate)}</div>
          ${d.validUntil ? `<div class="small"><b>Valid until</b> ${esc(d.validUntil)}</div>` : ""}
          <div class="small" style="margin-top:4px"><b>Estimated total</b> ${esc(money(d.total, d))}</div>
        </div>
      </div>

      <table class="items">
        <thead><tr>
          <th style="width:50%">Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit</th>
          <th class="num">Amount</th>
        </tr></thead>
        <tbody>
          ${d.items.map(it => `
            <tr>
              <td>
                <div style="font-weight:600">${esc(it.product_name)}</div>
                ${it.sku ? `<div class="small muted">SKU: ${esc(it.sku)}</div>` : ""}
              </td>
              <td class="num">${esc(it.quantity)}</td>
              <td class="num">${esc(money(it.unit_price, d))}</td>
              <td class="num">${esc(money(it.total, d))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="row"><span class="muted">Subtotal</span><span>${esc(money(d.subtotal, d))}</span></div>
        ${d.discount > 0 ? `<div class="row"><span class="muted">Discount</span><span>-${esc(money(d.discount, d))}</span></div>` : ""}
        ${d.tax > 0 ? `<div class="row"><span class="muted">Tax</span><span>${esc(money(d.tax, d))}</span></div>` : ""}
        <div class="row grand"><span>Total</span><span>${esc(money(d.total, d))}</span></div>
      </div>

      <div class="footer">
        ${d.notes ? `<div><b>Notes / Terms:</b> ${esc(d.notes)}</div>` : ""}
        ${d.footer ? `<div style="margin-top:6px">${esc(d.footer)}</div>` : `<div class="muted" style="margin-top:6px">This quotation is valid until the date noted above. Prices subject to change thereafter.</div>`}
      </div>
    </div>
  `;
  return wrap(css, body);
}

/* ---------------- MODERN ---------------- */
function modern(d: QuotationTemplateData) {
  const css = `
    .page { padding: 0 0 16mm 0; }
    .stripe { background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); color:#fff; padding: 14mm 14mm 10mm; }
    .stripe .row { display: flex; justify-content: space-between; align-items: flex-start; }
    .co-name { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .meta { font-size: 11px; color:#ccfbf1; margin-top:4px; line-height:1.5; }
    .stripe .title { font-size: 28px; letter-spacing: 0.12em; font-weight: 300; text-transform: uppercase; }
    .stripe .num-big { font-size: 32px; font-weight: 700; margin-top: 8px; }
    .inner { padding: 8mm 14mm 0; }
    .parties { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8mm; margin-bottom: 8mm; }
    .pcard { font-size: 12px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color:#64748b; margin-bottom: 4px; }
    table.items thead th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #0f766e; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.08em; color:#0f766e; }
    table.items thead th.num { text-align: right; }
    table.items tbody td { padding: 10px 6px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
    .totals-wrap { display: flex; justify-content: space-between; gap: 10mm; margin-top: 6mm; }
    .pay { flex: 1; font-size: 11px; color: #475569; }
    .pay .label { color:#0f766e; }
    .totals { width: 70mm; font-size: 12px; }
    .totals .row { display:flex; justify-content:space-between; padding: 5px 0; }
    .totals .grand { background:#0f766e; color:#fff; padding: 10px 12px; border-radius: 4px; margin-top: 6px; font-weight:700; font-size: 14px; }
    .footer { margin-top: 10mm; padding: 6mm 14mm 0; border-top: 1px solid #e2e8f0; font-size: 11px; color:#475569; }
  `;
  const body = `
    <div class="page">
      <div class="stripe">
        <div class="row">
          <div>
            ${d.companyLogoUrl ? `<img class="logo" src="${esc(d.companyLogoUrl)}" alt="logo" style="filter:brightness(0) invert(1)"/><br/>` : ""}
            <div class="co-name">${esc(d.companyName)}</div>
            <div class="meta">
              ${d.companyAddress ? esc(d.companyAddress) + "<br/>" : ""}
              ${d.companyPhone ? esc(d.companyPhone) + " &middot; " : ""}
              ${d.companyEmail ? esc(d.companyEmail) : ""}
              ${d.companyWebsite ? "<br/>" + esc(d.companyWebsite) : ""}
            </div>
          </div>
          <div style="text-align:right">
            <div class="title">Quotation</div>
            <div class="meta"># ${esc(d.quotationNo)}</div>
            <div class="num-big">${esc(money(d.total, d))}</div>
            <div class="meta">Issued ${esc(d.issueDate)}${d.validUntil ? ` &middot; Valid until ${esc(d.validUntil)}` : ""}</div>
          </div>
        </div>
      </div>

      <div class="inner">
        <div class="parties">
          <div class="pcard">
            <div class="label">Quote for</div>
            <div style="font-weight:600">${esc(d.customerName || "—")}</div>
            ${d.customerAddress ? `<div class="muted small" style="margin-top:4px;color:#64748b">${esc(d.customerAddress)}</div>` : ""}
            ${d.customerEmail ? `<div class="small" style="margin-top:4px">${esc(d.customerEmail)}</div>` : ""}
            ${d.customerPhone ? `<div class="small">${esc(d.customerPhone)}</div>` : ""}
          </div>
          <div class="pcard">
            <div class="label">From</div>
            <div style="font-weight:600">${esc(d.companyName)}</div>
            ${d.companyTaxId ? `<div class="small" style="color:#64748b;margin-top:4px">Tax ID: ${esc(d.companyTaxId)}</div>` : ""}
          </div>
          <div class="pcard">
            <div class="label">Estimated total</div>
            <div style="font-weight:700;font-size:18px">${esc(money(d.total, d))}</div>
            ${d.validUntil ? `<div class="small" style="color:#64748b">Valid until ${esc(d.validUntil)}</div>` : ""}
          </div>
        </div>

        <table class="items">
          <thead><tr>
            <th style="width:55%">Item</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Total</th>
          </tr></thead>
          <tbody>
            ${d.items.map(it => `
              <tr>
                <td>
                  <div style="font-weight:600">${esc(it.product_name)}</div>
                  ${it.sku ? `<div class="small muted">SKU: ${esc(it.sku)}</div>` : ""}
                </td>
                <td class="num">${esc(it.quantity)}</td>
                <td class="num">${esc(money(it.unit_price, d))}</td>
                <td class="num">${esc(money(it.total, d))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals-wrap">
          <div class="pay">
            ${d.notes ? `<div class="label">Notes / Terms</div><div>${esc(d.notes)}</div>` : ""}
          </div>
          <div class="totals">
            <div class="row"><span class="muted">Subtotal</span><span>${esc(money(d.subtotal, d))}</span></div>
            ${d.discount > 0 ? `<div class="row"><span class="muted">Discount</span><span>-${esc(money(d.discount, d))}</span></div>` : ""}
            ${d.tax > 0 ? `<div class="row"><span class="muted">Tax</span><span>${esc(money(d.tax, d))}</span></div>` : ""}
            <div class="grand row"><span>Total</span><span>${esc(money(d.total, d))}</span></div>
          </div>
        </div>
      </div>

      <div class="footer">
        ${d.footer ? esc(d.footer) : "Thank you for the opportunity to quote. We look forward to working with you."}
      </div>
    </div>
  `;
  return wrap(css, body);
}

/* ---------------- MINIMAL ---------------- */
function minimal(d: QuotationTemplateData) {
  const css = `
    .page { padding: 22mm 18mm; font-size: 12px; line-height: 1.6; color:#1f2937; }
    .top { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 14mm; }
    .co-name { font-size: 14px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
    .quote-word { font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color:#9ca3af; }
    .quote-no { font-size: 22px; font-weight: 300; letter-spacing: -0.01em; margin-top: 2px; }
    .row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10mm; margin-bottom: 12mm; }
    .label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    table.items { margin-top: 6mm; }
    table.items thead th { text-align:left; padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 500; }
    table.items thead th.num { text-align:right; }
    table.items tbody td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .totals { margin-top: 8mm; margin-left:auto; width: 70mm; }
    .totals .row { display:flex; justify-content:space-between; padding: 5px 0; }
    .totals .grand { border-top: 1px solid #1f2937; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 500; letter-spacing: -0.01em; }
    .footer { margin-top:auto; padding-top: 14mm; font-size: 10px; color:#9ca3af; letter-spacing: 0.04em; text-align:center; }
    .divider { height: 1px; background: #e5e7eb; margin: 2mm 0 8mm; }
  `;
  const body = `
    <div class="page">
      <div class="top">
        <div>
          ${d.companyLogoUrl ? `<img class="logo" src="${esc(d.companyLogoUrl)}" alt="logo" style="max-height:42px"/><br/>` : ""}
          <div class="co-name">${esc(d.companyName)}</div>
        </div>
        <div style="text-align:right">
          <div class="quote-word">Quotation</div>
          <div class="quote-no">${esc(d.quotationNo)}</div>
        </div>
      </div>

      <div class="row3">
        <div>
          <div class="label">From</div>
          <div>${esc(d.companyName)}</div>
          ${d.companyAddress ? `<div style="color:#6b7280">${esc(d.companyAddress)}</div>` : ""}
          ${d.companyEmail ? `<div style="color:#6b7280">${esc(d.companyEmail)}</div>` : ""}
          ${d.companyPhone ? `<div style="color:#6b7280">${esc(d.companyPhone)}</div>` : ""}
          ${d.companyTaxId ? `<div style="color:#6b7280">Tax ID ${esc(d.companyTaxId)}</div>` : ""}
        </div>
        <div>
          <div class="label">Quote for</div>
          <div>${esc(d.customerName || "—")}</div>
          ${d.customerAddress ? `<div style="color:#6b7280">${esc(d.customerAddress)}</div>` : ""}
          ${d.customerEmail ? `<div style="color:#6b7280">${esc(d.customerEmail)}</div>` : ""}
          ${d.customerPhone ? `<div style="color:#6b7280">${esc(d.customerPhone)}</div>` : ""}
        </div>
        <div>
          <div class="label">Details</div>
          <div>Issue · ${esc(d.issueDate)}</div>
          ${d.validUntil ? `<div>Valid until · ${esc(d.validUntil)}</div>` : ""}
          <div class="divider"></div>
          <div class="label">Estimated total</div>
          <div style="font-size:18px;font-weight:500">${esc(money(d.total, d))}</div>
        </div>
      </div>

      <table class="items">
        <thead><tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr></thead>
        <tbody>
          ${d.items.map(it => `
            <tr>
              <td>
                <div>${esc(it.product_name)}</div>
                ${it.sku ? `<div class="small" style="color:#9ca3af">SKU ${esc(it.sku)}</div>` : ""}
              </td>
              <td class="num">${esc(it.quantity)}</td>
              <td class="num">${esc(money(it.unit_price, d))}</td>
              <td class="num">${esc(money(it.total, d))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="row"><span style="color:#6b7280">Subtotal</span><span>${esc(money(d.subtotal, d))}</span></div>
        ${d.discount > 0 ? `<div class="row"><span style="color:#6b7280">Discount</span><span>-${esc(money(d.discount, d))}</span></div>` : ""}
        ${d.tax > 0 ? `<div class="row"><span style="color:#6b7280">Tax</span><span>${esc(money(d.tax, d))}</span></div>` : ""}
        <div class="row grand"><span>Total</span><span>${esc(money(d.total, d))}</span></div>
      </div>

      ${d.notes ? `<div style="margin-top:10mm;font-size:11px;color:#4b5563"><div class="label">Notes / Terms</div>${esc(d.notes)}</div>` : ""}

      <div class="footer">
        ${d.footer ? esc(d.footer) : "Thank you for considering us. This quotation is valid until the date shown above."}
      </div>
    </div>
  `;
  return wrap(css, body);
}

export function renderQuotationHTML(template: QuoteTemplateId, data: QuotationTemplateData): string {
  if (template === "modern") return modern(data);
  if (template === "minimal") return minimal(data);
  return classic(data);
}
