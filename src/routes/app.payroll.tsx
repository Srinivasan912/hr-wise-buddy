import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { BadgeIndianRupee } from "lucide-react";

export const Route = createFileRoute("/app/payroll")({ component: PayrollPage });

type Cycle = { id: string; name: string; cycle_start: string; cycle_end: string; is_locked: boolean };

function PayrollPage() {
  const { orgId } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  useEffect(() => {
    if (!orgId) return;
    supabase.from("payroll_cycles").select("id, name, cycle_start, cycle_end, is_locked").eq("organization_id", orgId).order("cycle_start", { ascending: false }).then(({ data }) => setCycles((data as Cycle[]) ?? []));
  }, [orgId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground mt-1">Cycle: previous month 26 → current month 25 (configurable in Settings)</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Payroll cycles</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {cycles.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No cycles configured</p>}
          {cycles.map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center"><BadgeIndianRupee className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(c.cycle_start)} – {fmtDate(c.cycle_end)}</div>
                </div>
              </div>
              <Badge variant={c.is_locked ? "default" : "outline"}>{c.is_locked ? "Locked" : "Draft"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        <p><b className="text-foreground">Coming next:</b> one-click payroll run with auto-calc from attendance, payslip PDF generation, and monthly auto-email. The salary engine, components, and cycles are already wired into the database.</p>
      </CardContent></Card>
    </div>
  );
}
