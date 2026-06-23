import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag, Search } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/subcategories")({
  component: SubCategoriesPage,
});

type Row = { subcategory: string; category: string; products: number };

function SubCategoriesPage() {
  const [query, setQuery] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["product-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category, subcategory");
      if (error) throw error;
      const map = new Map<string, { category: string; count: number }>();
      for (const p of data ?? []) {
        const sub = (p.subcategory ?? "").trim();
        if (!sub) continue;
        const key = `${p.category ?? ""}|${sub}`;
        if (!map.has(key)) map.set(key, { category: p.category ?? "—", count: 0 });
        map.get(key)!.count += 1;
      }
      return Array.from(map.entries())
        .map<Row>(([key, v]) => ({
          subcategory: key.split("|")[1],
          category: v.category,
          products: v.count,
        }))
        .sort((a, b) =>
          a.category.localeCompare(b.category) || a.subcategory.localeCompare(b.subcategory),
        );
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter(
          (r) =>
            r.subcategory.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q),
        )
      : rows;
  }, [rows, query]);

  return (
    <>
      <PageHeader
        title="Sub-Categories"
        description="Product sub-categories grouped under their parent category."
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sub-categories or categories"
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
              <Tag className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">No sub-categories yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign sub-categories to products to see them here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-category</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Products</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={`${r.category}-${r.subcategory}`}>
                  <TableCell className="font-medium">{r.subcategory}</TableCell>
                  <TableCell className="text-muted-foreground">{r.category}</TableCell>
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
