import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies")({
  component: () => (
    <PlaceholderPage
      title="Companies"
      description="Multi-company SaaS workspace management."
      icon={<FileText className="h-5 w-5" />}
      features={["Multiple companies","Company isolation","Subscription plan","Trial & billing","Owner & members","Switch workspace","Branch hierarchy","Per-company branding"]}
    />
  ),
});
