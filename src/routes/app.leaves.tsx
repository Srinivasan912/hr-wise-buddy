import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/leaves")({ component: LeavesPage });

type LT = { id: string; code: string; name: string; color: string };
type LB = { id: string; year: number; opening: number; accrued: number; used: number; balance: number; leave_types: { code: string; name: string; color: string } | null };
type LR = { id: string; from_date: string; to_date: string; total_days: number; reason: string | null; status: string; leave_types: { name: string } | null };

type TeamBal = { employee_id: string; balance: number; used: number; opening: number; accrued: number; employees: { full_name: string; employee_code: string } | null; leave_types: { code: string; name: string } | null };

function LeavesPage() {
  const { employee, isHR, orgId } = useAuth();
  const [types, setTypes] = useState<LT[]>([]);
  const [balances, setBalances] = useState<LB[]>([]);
  const [requests, setRequests] = useState<LR[]>([]);
  const [teamBal, setTeamBal] = useState<TeamBal[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [typeId, setTypeId] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!employee) return;
    const [t, b, r] = await Promise.all([
      supabase.from("leave_types").select("id, code, name, color").eq("organization_id", employee.organization_id),
      supabase.from("leave_balances").select("id, year, opening, accrued, used, balance, leave_types(code, name, color)").eq("employee_id", employee.id),
      supabase.from("leave_requests").select("id, from_date, to_date, total_days, reason, status, leave_types(name)").eq("employee_id", employee.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setTypes((t.data as LT[]) ?? []);
    setBalances((b.data as unknown as LB[]) ?? []);
    setRequests((r.data as unknown as LR[]) ?? []);
    if (isHR && orgId) {
      const { data: tb } = await supabase.from("leave_balances")
        .select("employee_id, balance, used, opening, accrued, employees!inner(full_name, employee_code, organization_id), leave_types(code, name)")
        .eq("employees.organization_id", orgId);
      setTeamBal((tb as unknown as TeamBal[]) ?? []);
    }
  };
  useEffect(() => { void load(); }, [employee, isHR, orgId]);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault(); if (!employee) return; setBusy(true);
    try {
      const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1;
      if (days <= 0) throw new Error("Invalid date range");
      const { error } = await supabase.from("leave_requests").insert({
        organization_id: employee.organization_id, employee_id: employee.id,
        leave_type_id: typeId, from_date: from, to_date: to, total_days: days, reason,
      });
      if (error) throw error;
      toast.success("Leave applied");
      setFrom(""); setTo(""); setReason(""); setTypeId("");
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leaves</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {balances.map((b) => (
          <Card key={b.id}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{b.leave_types?.name ?? "—"}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{Number(b.balance).toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1">{Number(b.used).toFixed(1)} used of {(Number(b.opening)+Number(b.accrued)).toFixed(1)}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Apply for leave</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={apply} className="space-y-3">
              <div className="space-y-1.5"><Label>Leave type</Label>
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></div>
              </div>
              <div className="space-y-1.5"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required /></div>
              <Button type="submit" disabled={busy || !typeId} className="w-full">Submit request</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">My requests</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border max-h-[460px] overflow-y-auto">
            {requests.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No requests yet</p>}
            {requests.map((r) => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{r.leave_types?.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(r.from_date)} → {fmtDate(r.to_date)} · {r.total_days}d</div>
                  {r.reason && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reason}</div>}
                </div>
                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"} className="capitalize">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isHR && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team leave balances</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {teamBal.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No balances yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium text-right">Opening</th>
                  <th className="px-3 py-2 font-medium text-right">Accrued</th>
                  <th className="px-3 py-2 font-medium text-right">Used</th>
                  <th className="px-3 py-2 font-medium text-right">Balance</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {teamBal.map((b, i) => (
                    <tr key={i} className="hover:bg-accent/30">
                      <td className="px-3 py-2"><div className="font-medium">{b.employees?.full_name}</div><div className="text-xs text-muted-foreground">{b.employees?.employee_code}</div></td>
                      <td className="px-3 py-2">{b.leave_types?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(b.opening).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(b.accrued).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(b.used).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{Number(b.balance).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
