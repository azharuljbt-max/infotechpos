import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { FileSignature } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/quotations")({
  component: () => (
    <PlaceholderPage
      title="Quotations"
      description="Create and convert quotations to sales."
      icon={<FileSignature className="h-5 w-5" />}
      features={["Create quotation","Convert to sale","PDF & print","Expiry date","Customer approval","Status tracking","Email quotation","Revision history"]}
    />
  ),
});
