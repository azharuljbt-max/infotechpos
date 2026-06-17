import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";
import type { ReactNode } from "react";

export function PlaceholderPage({
  title, description, features, icon: Icon,
}: {
  title: string;
  description: string;
  features: string[];
  icon?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New</Button>}
      />
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            {Icon ?? <Sparkles className="h-5 w-5" />}
          </div>
          <h2 className="text-lg font-semibold">{title} module</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This module is scaffolded and ready to be built out. Planned capabilities:
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
