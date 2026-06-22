import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/_protected/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [name, setName] = useState("Infotech ERP");
  const [supportEmail, setSupportEmail] = useState("support@infotech.example");
  const [trialDays, setTrialDays] = useState("14");
  const [currency, setCurrency] = useState("BDT");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Global Settings</h1>
        <p className="text-sm text-muted-foreground">Platform-wide configuration.</p>
      </div>
      <Card className="p-4 space-y-3 max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Platform name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Support email</Label><Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
          <div><Label>Default trial days</Label><Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} /></div>
          <div><Label>Default currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
        </div>
        <div className="pt-2">
          <Button size="sm" onClick={() => toast.success("Settings saved")}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
