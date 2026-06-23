import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tags, Search } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/categories")({
  component: CategoriesPage,
});

type Row = { category: string; subcategories: number; products: number };

function CategoriesPage() {
  const [query, setQuery] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category, subcategory");
      if (error) throw error;
      const map = new Map<string, { subs: Set<string>; count: number }>();
      for (const p of data ?? []) {
        const cat = (p.category ?? "").trim();
        if (!cat) continue;
        if (!map.has(cat)) map.set(cat, { subs: new Set(), count: 0 });
        const entry = map.get(cat)!;
        entry.count += 1;
        if (p.subcategory) entry.subs.add(p.subcategory);
      }
      return Array.from(map.entries())
        .map<Row>(([category, v]) => ({ category, subcategories: v.subs.size, products: v.count }))
        .sort((a, b) => a.category.localeCompare(b.category));
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.category.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Product categories derived from your catalog."
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories"
              className="pl-8 h-9"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Tags className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">No categories yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign categories to products to see them here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Sub-categories</TableHead>
                <TableHead className="text-right">Products</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.category}>
                  <TableCell className="font-medium">{r.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.subcategories}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.products}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
