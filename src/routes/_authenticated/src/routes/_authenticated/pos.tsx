import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/pos")({
  component: () => (
    <PlaceholderPage
      title="POS"
      description="Professional point of sale with barcode scanner, multiple payments, hold/resume sales."
      icon={<ShoppingCart className="h-5 w-5" />}
      features={["Barcode scanner & SKU search","Category & brand filters","Cash, card, mobile banking, split payment","Hold & resume sales","Returns and exchanges","Thermal printer support","Customer selection & loyalty","Discounts, coupons & tax"]}
    />
  ),
});
