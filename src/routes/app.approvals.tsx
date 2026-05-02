import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtDate } from "@/lib/format";
import { Check, X, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/approvals")({ component: ApprovalsPage });

type LR = { id: string; from_date: string; to_date: string; total_days: number; reason: string | null; status: string; employees: { full_name: string; employee_code: string } | null; leave_types: { name: string; color: string } | null };
type RR = { id: string; attendance_date: string; reason: string; status: string; requested_status: string; requested_check_in: string | null; requested_check_out: string | null; employees: { full_name: string; employee_code: string } | null };

function ApprovalsPage() {
  const { isManager, employee, orgId } = useAuth();
  const [leaves, setLeaves] = useState<LR[]>([]);
  const [regs, setRegs] = useState<RR[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [l, r] = await Promise.all([
      supabase.from("leave_requests").select("id, from_date, to_date, total_days, reason, status, employees(full_name, employee_code), leave_types(name, color)").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("attendance_regularizations").select("id, attendance_date, reason, status, requested_status, requested_check_in, requested_check_out, employees(full_name, employee_code)").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setLeaves((l.data as unknown as LR[]) ?? []);
    setRegs((r.data as unknown as RR[]) ?? []);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const decideLeave = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase.from("leave_requests").update({
        status,
        approved_by: employee?.id ?? null,
        approved_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? "Rejected by manager" : null,
      }).eq("id", id);
      if (error) throw error;

      // If approved, increment used balance and (optionally) mark days as 'leave'
      if (status === "approved") {
        const lr = leaves.find((x) => x.id === id);
        if (lr) {
          const { data: leaveReq } = await supabase.from("leave_requests").select("employee_id, leave_type_id, total_days, organization_id, from_date, to_date").eq("id", id).single();
          if (leaveReq) {
            const year = new Date(leaveReq.from_date).getFullYear();
            const { data: bal } = await supabase.from("leave_balances").select("id, used").eq("employee_id", leaveReq.employee_id).eq("leave_type_id", leaveReq.leave_type_id).eq("year", year).maybeSingle();
            if (bal) await supabase.from("leave_balances").update({ used: Number(bal.used) + Number(leaveReq.total_days) }).eq("id", bal.id);

            // Mark attendance as 'leave' for each day
            const start = new Date(leaveReq.from_date), end = new Date(leaveReq.to_date);
            const upserts: Array<{ organization_id: string; employee_id: string; attendance_date: string; status: "leave" }> = [];
            for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              upserts.push({
                organization_id: leaveReq.organization_id as string, employee_id: leaveReq.employee_id as string,
                attendance_date: d.toISOString().slice(0, 10), status: "leave",
              });
            }
            if (upserts.length) await supabase.from("attendance_records").upsert(upserts, { onConflict: "employee_id,attendance_date" });
          }
        }
      }
      toast.success(`Leave ${status}`);
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  };

  const decideReg = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const reg = regs.find((x) => x.id === id);
      const { error } = await supabase.from("attendance_regularizations").update({
        status,
        approved_by: employee?.id ?? null,
        approved_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? "Rejected by manager" : null,
      }).eq("id", id);
      if (error) throw error;

      if (status === "approved" && reg) {
        const { data: full } = await supabase.from("attendance_regularizations").select("employee_id, attendance_date, requested_status, requested_check_in, requested_check_out, organization_id").eq("id", id).single();
        if (full) {
          await supabase.from("attendance_records").upsert({
            organization_id: full.organization_id as string,
            employee_id: full.employee_id as string,
            attendance_date: full.attendance_date as string,
            status: full.requested_status as "present" | "absent" | "late" | "half_day" | "leave" | "wfh" | "holiday" | "week_off",
            check_in: full.requested_check_in,
            check_out: full.requested_check_out,
          }, { onConflict: "employee_id,attendance_date" });
        }
      }
      toast.success(`Regularization ${status}`);
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  };

  if (!isManager) return <div className="p-8 text-sm text-muted-foreground">Manager/HR only.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Approvals</h1></div>
      <Tabs defaultValue="leaves">
        <TabsList><TabsTrigger value="leaves">Leaves ({leaves.length})</TabsTrigger><TabsTrigger value="regs">Regularizations ({regs.length})</TabsTrigger></TabsList>
        <TabsContent value="leaves" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Pending leave requests</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {leaves.length === 0 && <p className="text-sm text-muted-foreground p-8 text-center">No pending leaves 🎉</p>}
              {leaves.map((l) => (
                <div key={l.id} className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{l.employees?.full_name}</span>
                      <Badge variant="outline" className="text-[10px]">{l.employees?.employee_code}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{l.leave_types?.name}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{fmtDate(l.from_date)} → {fmtDate(l.to_date)} · {l.total_days}d</div>
                    {l.reason && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{l.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decideLeave(l.id, "rejected")} disabled={busy === l.id}>
                      {busy === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />} Reject
                    </Button>
                    <Button size="sm" onClick={() => decideLeave(l.id, "approved")} disabled={busy === l.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="regs" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Pending regularization requests</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {regs.length === 0 && <p className="text-sm text-muted-foreground p-8 text-center">No pending regularizations 🎉</p>}
              {regs.map((r) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{r.employees?.full_name}</span>
                      <Badge variant="outline" className="text-[10px]">{r.employees?.employee_code}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.requested_status.replace("_"," ")}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{fmtDate(r.attendance_date)}</div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decideReg(r.id, "rejected")} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />} Reject
                    </Button>
                    <Button size="sm" onClick={() => decideReg(r.id, "approved")} disabled={busy === r.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
