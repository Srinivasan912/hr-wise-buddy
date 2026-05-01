import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, todayIST } from "@/lib/format";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/attendance")({ component: AttendancePage });

type Row = { attendance_date: string; status: string; check_in: string | null; check_out: string | null; total_minutes: number; late_minutes: number };

function AttendancePage() {
  const { employee } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const todayDate = todayIST();

  const load = async () => {
    if (!employee) return;
    const { data } = await supabase.from("attendance_records")
      .select("attendance_date, status, check_in, check_out, total_minutes, late_minutes")
      .eq("employee_id", employee.id).order("attendance_date", { ascending: false }).limit(60);
    setRows(data ?? []);
    setToday((data ?? []).find((r) => r.attendance_date === todayDate) ?? null);
  };
  useEffect(() => { void load(); }, [employee]);

  const checkIn = async () => {
    if (!employee) return; setBusy(true);
    try {
      const { error } = await supabase.from("attendance_records").upsert({
        organization_id: employee.organization_id, employee_id: employee.id,
        attendance_date: todayDate, status: "present", check_in: new Date().toISOString(),
      }, { onConflict: "employee_id,attendance_date" });
      if (error) throw error; toast.success("Checked in"); await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  const checkOut = async () => {
    if (!employee) return; setBusy(true);
    try {
      const { error } = await supabase.from("attendance_records")
        .update({ check_out: new Date().toISOString() })
        .eq("employee_id", employee.id).eq("attendance_date", todayDate);
      if (error) throw error; toast.success("Checked out"); await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance</h1>
        <div className="flex gap-2">
          {!today?.check_in && <Button onClick={checkIn} disabled={busy}><LogIn className="h-4 w-4 mr-1.5" /> Check in</Button>}
          {today?.check_in && !today?.check_out && <Button onClick={checkOut} disabled={busy} variant="secondary"><LogOut className="h-4 w-4 mr-1.5" /> Check out</Button>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Last 60 days</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">In</th>
                <th className="px-4 py-2 font-medium">Out</th>
                <th className="px-4 py-2 font-medium text-right">Hours</th>
                <th className="px-4 py-2 font-medium text-right">Late</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.attendance_date}>
                    <td className="px-4 py-2.5">{fmtDate(r.attendance_date)}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{r.status.replace("_"," ")}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(r.check_in)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(r.check_out)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{(r.total_minutes/60).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-warning-foreground">{r.late_minutes}m</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No records yet</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
