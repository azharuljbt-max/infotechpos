import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/products")({
  component: () => (
    <PlaceholderPage
      title="Products"
      description="Manage your full product catalog with variants, pricing, and stock."
      icon={<Package className="h-5 w-5" />}
      features={["Categories, brands, units","Variants: color, size","Barcode & SKU generation","Purchase, sale, wholesale price","Min/max stock, reorder level","Image gallery","Warranty & serial tracking","Bulk import / export"]}
    />
  ),
});
