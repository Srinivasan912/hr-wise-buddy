import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/app/holidays")({ component: HolidaysPage });

type H = { id: string; name: string; holiday_date: string; is_optional: boolean };

function HolidaysPage() {
  const { orgId } = useAuth();
  const [hs, setHs] = useState<H[]>([]);
  useEffect(() => {
    if (!orgId) return;
    supabase.from("holidays").select("id, name, holiday_date, is_optional").eq("organization_id", orgId).order("holiday_date").then(({ data }) => setHs((data as H[]) ?? []));
  }, [orgId]);
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Holiday calendar</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Declared holidays</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {hs.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No holidays</p>}
          {hs.map((h) => (
            <div key={h.id} className="py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center"><CalendarClock className="h-4 w-4 text-primary" /></div>
              <div className="flex-1"><div className="text-sm font-medium">{h.name}</div><div className="text-xs text-muted-foreground">{fmtDate(h.holiday_date, { weekday: "long" })}</div></div>
              {h.is_optional && <span className="text-xs text-muted-foreground">Optional</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
