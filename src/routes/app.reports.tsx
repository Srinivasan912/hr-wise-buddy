import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, inrPrecise } from "@/lib/format";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

type AttRow = { attendance_date: string; status: string; total_minutes: number; late_minutes: number; overtime_minutes: number; employees: { full_name: string; employee_code: string; departments: { name: string } | null } | null };
type PayRow = { net_pay: number; gross: number; total_deductions: number; payable_days: number; lop_days: number; employees: { full_name: string; employee_code: string; departments: { name: string } | null } | null; payroll_runs: { payroll_cycles: { name: string } | null } | null };

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { orgId, isManager } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [att, setAtt] = useState<AttRow[]>([]);
  const [pay, setPay] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        supabase.from("attendance_records").select("attendance_date, status, total_minutes, late_minutes, overtime_minutes, employees(full_name, employee_code, departments(name))").eq("organization_id", orgId).gte("attendance_date", from).lte("attendance_date", to).order("attendance_date", { ascending: false }).limit(2000),
        supabase.from("payroll_run_items").select("net_pay, gross, total_deductions, payable_days, lop_days, employees(full_name, employee_code, departments(name)), payroll_runs(payroll_cycles(name))").limit(2000),
      ]);
      setAtt((a.data as unknown as AttRow[]) ?? []);
      setPay((p.data as unknown as PayRow[]) ?? []);
    } finally { setLoading(false); }
  }, [orgId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const exportAttendance = () => {
    const rows = att.map((r) => ({
      Date: r.attendance_date, Code: r.employees?.employee_code ?? "", Name: r.employees?.full_name ?? "",
      Department: r.employees?.departments?.name ?? "", Status: r.status,
      "Hours": (r.total_minutes / 60).toFixed(2), Late_min: r.late_minutes, OT_min: r.overtime_minutes,
    }));
    downloadCsv(`attendance_${from}_to_${to}.csv`, toCsv(rows));
    toast.success(`Exported ${rows.length} rows`);
  };

  const exportSalary = () => {
    const rows = pay.map((r) => ({
      Cycle: r.payroll_runs?.payroll_cycles?.name ?? "", Code: r.employees?.employee_code ?? "",
      Name: r.employees?.full_name ?? "", Department: r.employees?.departments?.name ?? "",
      "Payable_days": r.payable_days, "LOP_days": r.lop_days, Gross: r.gross, Deductions: r.total_deductions, Net: r.net_pay,
    }));
    downloadCsv(`salary_register.csv`, toCsv(rows));
    toast.success(`Exported ${rows.length} rows`);
  };

  if (!isManager) return <div className="p-8 text-sm text-muted-foreground">Manager/HR only.</div>;

  const totalNet = pay.reduce((s, r) => s + Number(r.net_pay), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={load} disabled={loading} className="w-full">{loading ? "Loading…" : "Refresh"}</Button></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Attendance report</CardTitle>
            <Button size="sm" variant="outline" onClick={exportAttendance} disabled={!att.length}><Download className="h-3.5 w-3.5 mr-1.5" /> CSV</Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <Stat label="Records" v={att.length.toString()} />
            <Stat label="Present" v={att.filter((a) => ["present","late","wfh"].includes(a.status)).length.toString()} />
            <Stat label="Leave" v={att.filter((a) => a.status === "leave").length.toString()} />
            <Stat label="Late" v={att.filter((a) => a.status === "late").length.toString()} />
            <Stat label="Absent" v={att.filter((a) => a.status === "absent").length.toString()} />
            <p className="text-xs text-muted-foreground pt-2">Range: {fmtDate(from)} – {fmtDate(to)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Salary register</CardTitle>
            <Button size="sm" variant="outline" onClick={exportSalary} disabled={!pay.length}><Download className="h-3.5 w-3.5 mr-1.5" /> CSV</Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <Stat label="Payslips" v={pay.length.toString()} />
            <Stat label="Total net paid" v={inrPrecise(totalNet)} />
            <p className="text-xs text-muted-foreground pt-2">Across all payroll cycles you have access to.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">More reports</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {["Monthly muster", "Late coming", "Overtime", "Leave balance", "Holiday report", "Bank transfer", "Payslip dispatch log"].map((r) => (
            <div key={r} className="p-3 rounded-lg border border-border text-sm">
              <div className="font-medium">{r}</div>
              <div className="text-xs text-muted-foreground mt-1">Available data is in the database — export coming next iteration.</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return <div className="flex items-center justify-between py-1 border-b border-border last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{v}</span></div>;
}
