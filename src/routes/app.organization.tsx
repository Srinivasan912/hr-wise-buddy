import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/organization")({ component: OrgPage });

type Org = { name: string; legal_name: string | null; address: string | null; city: string | null; state: string | null; pincode: string | null; gst_number: string | null; pan_number: string | null; payroll_cycle_start_day: number; payroll_cycle_end_day: number };

function OrgPage() {
  const { orgId } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  useEffect(() => {
    if (!orgId) return;
    supabase.from("organizations").select("name, legal_name, address, city, state, pincode, gst_number, pan_number, payroll_cycle_start_day, payroll_cycle_end_day").eq("id", orgId).maybeSingle().then(({ data }) => setOrg(data));
  }, [orgId]);
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization</h1>
      {org && (
        <Card><CardHeader><CardTitle className="text-base">{org.name}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Legal name" value={org.legal_name} />
            <Field label="GST" value={org.gst_number} />
            <Field label="PAN" value={org.pan_number} />
            <Field label="Address" value={[org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ")} />
            <Field label="Payroll cycle" value={`${org.payroll_cycle_start_day} → ${org.payroll_cycle_end_day} of next month`} />
            <Field label="Currency / TZ" value="INR · Asia/Kolkata" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string | null }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-0.5">{value || "—"}</div></div>;
}
