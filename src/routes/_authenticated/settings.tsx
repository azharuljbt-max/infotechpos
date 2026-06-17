import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <PlaceholderPage
      title="Settings"
      description="Company, tax, invoice, POS, currency and language settings."
      icon={<Settings className="h-5 w-5" />}
      features={["Company profile","Branch settings","Tax settings","Invoice & POS","Currency (BDT, USD, custom)","Language (EN / BN)","Backup & restore","Branding"]}
    />
  ),
});
