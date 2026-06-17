import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/invoices")({
  component: () => (
    <PlaceholderPage
      title="Invoices"
      description="Professional invoice generation with QR, barcode, PDF, and email."
      icon={<Receipt className="h-5 w-5" />}
      features={["PDF & print","Email to customer","QR & barcode","Tax, discount, shipping","Partial & due payment","Payment history","Credit sales","Status tracking"]}
    />
  ),
});
