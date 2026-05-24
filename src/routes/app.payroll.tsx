import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, inrPrecise } from "@/lib/format";
import { BadgeIndianRupee, Play, Lock, Unlock, Plus, Eye, Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runPayroll, lockPayroll, createNextCycle } from "@/server/payroll.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pdf } from "@react-pdf/renderer";
import { PayslipDocument, type PayslipData } from "@/components/PayslipDocument";

export const Route = createFileRoute("/app/payroll")({ component: PayrollPage });

type Cycle = { id: string; name: string; cycle_start: string; cycle_end: string; is_locked: boolean };
type Run = { id: string; status: string; total_employees: number; total_gross: number; total_deductions: number; total_net: number; processed_at: string | null };
type Item = {
  id: string; employee_id: string; gross: number; total_deductions: number; net_pay: number;
  payable_days: number; working_days: number; lop_days: number;
  earnings: { code: string; name: string; amount: number }[];
  deductions: { code: string; name: string; amount: number }[];
  employees: { full_name: string; employee_code: string; pan_number: string | null; uan_number: string | null; bank_name: string | null; bank_account: string | null; bank_ifsc: string | null; joining_date: string; departments: { name: string } | null; designations: { name: string } | null } | null;
};

function PayrollPage() {
  const { orgId, isHR, session, user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selected, setSelected] = useState<Cycle | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Item | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deductEdit, setDeductEdit] = useState<Item | null>(null);
  const [deductName, setDeductName] = useState("");
  const [deductAmt, setDeductAmt] = useState("");
  const [cycleDlg, setCycleDlg] = useState(false);
  const [cName, setCName] = useState(""); const [cStart, setCStart] = useState(""); const [cEnd, setCEnd] = useState("");

  const runFn = useServerFn(runPayroll);
  const lockFn = useServerFn(lockPayroll);
  const newCycleFn = useServerFn(createNextCycle);

  const logAudit = async (action: string, entityId: string, diff: Record<string, unknown>) => {
    if (!orgId || !user) return;
    await supabase.from("audit_logs").insert({
      organization_id: orgId, user_id: user.id,
      entity: "payroll_run_items", entity_id: entityId, action, diff: diff as never,
    });
  };


  const loadCycles = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from("payroll_cycles").select("id, name, cycle_start, cycle_end, is_locked").eq("organization_id", orgId).order("cycle_start", { ascending: false });
    const cs = (data as Cycle[]) ?? [];
    setCycles(cs);
    setSelected((prev) => prev ?? cs[0] ?? null);
  }, [orgId]);

  useEffect(() => { void loadCycles(); }, [loadCycles]);

  useEffect(() => {
    if (!selected) { setRun(null); setItems([]); return; }
    void (async () => {
      const { data: r } = await supabase.from("payroll_runs").select("id, status, total_employees, total_gross, total_deductions, total_net, processed_at").eq("payroll_cycle_id", selected.id).maybeSingle();
      setRun((r as Run) ?? null);
      if (r) {
        const { data: its } = await supabase.from("payroll_run_items").select(
          "id, employee_id, gross, total_deductions, net_pay, payable_days, working_days, lop_days, earnings, deductions, employees(full_name, employee_code, pan_number, uan_number, bank_name, bank_account, bank_ifsc, joining_date, departments(name), designations(name))"
        ).eq("payroll_run_id", r.id);
        setItems((its as unknown as Item[]) ?? []);
      } else setItems([]);
    })();
  }, [selected]);

  const onRun = async () => {
    if (!selected || !session?.access_token) return;
    setBusy(true);
    try {
      const res = await runFn({ data: { token: session.access_token, payroll_cycle_id: selected.id } });
      toast.success(`Processed ${res.employees} employees · Net ${inrPrecise(res.total_net)}`);
      // re-trigger effect by re-selecting
      setSelected({ ...selected });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const onLockToggle = async () => {
    if (!selected || !session?.access_token) return;
    setBusy(true);
    try {
      await lockFn({ data: { token: session.access_token, payroll_cycle_id: selected.id, lock: !selected.is_locked } });
      toast.success(selected.is_locked ? "Unlocked" : "Locked");
      await loadCycles();
      setSelected((c) => c ? { ...c, is_locked: !c.is_locked } : c);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const onNewCycle = async () => {
    if (!session?.access_token) return;
    setBusy(true);
    try {
      const r = await newCycleFn({ data: { token: session.access_token } });
      toast.success(r.created ? `Created: ${r.name}` : `Cycle already exists: ${r.name}`);
      await loadCycles();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const downloadPdf = async (it: Item) => {
    if (!selected) return;
    setDownloading(it.id);
    try {
      const { data: org } = await supabase.from("organizations").select("name, address, city, state, pincode, pan_number, gst_number").eq("id", orgId!).single();
      const data: PayslipData = {
        organization: org as PayslipData["organization"],
        cycle: { name: selected.name, cycle_start: selected.cycle_start, cycle_end: selected.cycle_end },
        employee: {
          full_name: it.employees?.full_name ?? "Employee",
          employee_code: it.employees?.employee_code ?? "—",
          designation: it.employees?.designations?.name ?? null,
          department: it.employees?.departments?.name ?? null,
          pan_number: it.employees?.pan_number ?? null,
          uan_number: it.employees?.uan_number ?? null,
          bank_account: it.employees?.bank_account ?? null,
          bank_ifsc: it.employees?.bank_ifsc ?? null,
          bank_name: it.employees?.bank_name ?? null,
          joining_date: it.employees?.joining_date ?? null,
        },
        totals: { working_days: it.working_days, payable_days: it.payable_days, present_days: 0, paid_leave_days: 0, lop_days: it.lop_days, week_offs: 0, holidays: 0 },
        earnings: it.earnings, deductions: it.deductions,
        gross: it.gross, total_deductions: it.total_deductions, net_pay: it.net_pay,
      };
      const blob = await pdf(<PayslipDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Payslip-${data.employee.employee_code}-${selected.name.replace(/\s+/g, "-")}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setDownloading(null); }
  };

  const openDeduct = (it: Item) => { setDeductEdit(it); setDeductName(""); setDeductAmt(""); };
  const addCustomDeduction = async () => {
    if (!deductEdit) return;
    const amt = Number(deductAmt);
    if (!deductName.trim() || !Number.isFinite(amt) || amt <= 0) { toast.error("Enter a name and positive amount"); return; }
    const code = `CUSTOM_${Date.now().toString(36).toUpperCase()}`;
    const newDeductions = [...deductEdit.deductions, { code, name: deductName.trim(), amount: amt }];
    const newTotal = newDeductions.reduce((s, d) => s + Number(d.amount), 0);
    const newNet = Number(deductEdit.gross) - newTotal;
    const { error } = await supabase.from("payroll_run_items").update({
      deductions: newDeductions, total_deductions: newTotal, net_pay: newNet,
    }).eq("id", deductEdit.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("deduction_add", deductEdit.id, { code, name: deductName.trim(), amount: amt, employee_id: deductEdit.employee_id });
    toast.success("Deduction added");
    setItems((arr) => arr.map((x) => x.id === deductEdit.id ? { ...x, deductions: newDeductions, total_deductions: newTotal, net_pay: newNet } : x));
    setDeductEdit({ ...deductEdit, deductions: newDeductions, total_deductions: newTotal, net_pay: newNet });
    setDeductName(""); setDeductAmt("");
  };
  const removeDeduction = async (it: Item, code: string) => {
    const removed = it.deductions.find((d) => d.code === code);
    const newDeductions = it.deductions.filter((d) => d.code !== code);
    const newTotal = newDeductions.reduce((s, d) => s + Number(d.amount), 0);
    const newNet = Number(it.gross) - newTotal;
    const { error } = await supabase.from("payroll_run_items").update({
      deductions: newDeductions, total_deductions: newTotal, net_pay: newNet,
    }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("deduction_remove", it.id, { code, name: removed?.name, amount: removed?.amount, employee_id: it.employee_id });
    setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, deductions: newDeductions, total_deductions: newTotal, net_pay: newNet } : x));
    if (deductEdit?.id === it.id) setDeductEdit({ ...it, deductions: newDeductions, total_deductions: newTotal, net_pay: newNet });
  };

  const createCustomCycle = async () => {
    if (!orgId) return;
    if (!cName.trim() || !cStart || !cEnd) { toast.error("Fill all fields"); return; }
    if (new Date(cStart) > new Date(cEnd)) { toast.error("Start must be before end"); return; }
    const { error } = await supabase.from("payroll_cycles").insert({
      organization_id: orgId, name: cName.trim(), cycle_start: cStart, cycle_end: cEnd, pay_date: cEnd,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cycle created");
    setCycleDlg(false); setCName(""); setCStart(""); setCEnd("");
    await loadCycles();
  };

  if (!isHR) return <div className="p-8 text-sm text-muted-foreground">Admin/HR only.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Cycle: previous month {26} → current month {25} (configurable in Settings)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCycleDlg(true)} disabled={busy}><Plus className="h-4 w-4 mr-1.5" /> Custom cycle</Button>
          <Button variant="outline" onClick={onNewCycle} disabled={busy}><Plus className="h-4 w-4 mr-1.5" /> Current month</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Cycles</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-[460px] overflow-y-auto">
            {cycles.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No cycles yet</p>}
            <div className="divide-y divide-border">
              {cycles.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 flex items-start justify-between gap-2 transition-colors ${selected?.id === c.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center"><BadgeIndianRupee className="h-4 w-4 text-primary" /></div>
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(c.cycle_start)} – {fmtDate(c.cycle_end)}</div>
                    </div>
                  </div>
                  <Badge variant={c.is_locked ? "default" : "outline"} className="text-[10px]">{c.is_locked ? "Locked" : "Open"}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">{selected?.name ?? "Select a cycle"}</CardTitle>
            {selected && (
              <div className="flex gap-2">
                <Button onClick={onRun} disabled={busy || selected.is_locked}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                  {run ? "Re-run" : "Run payroll"}
                </Button>
                {run && (
                  <Button variant="outline" onClick={onLockToggle} disabled={busy}>
                    {selected.is_locked ? <><Unlock className="h-4 w-4 mr-1.5" /> Unlock</> : <><Lock className="h-4 w-4 mr-1.5" /> Lock</>}
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected && <p className="text-sm text-muted-foreground py-8 text-center">Pick a cycle on the left</p>}
            {selected && !run && (
              <div className="py-10 text-center">
                <BadgeIndianRupee className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Payroll not run yet for this cycle.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Run payroll" to compute earnings, deductions, and generate payslips.</p>
              </div>
            )}
            {run && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Employees" value={run.total_employees.toString()} />
                  <Stat label="Gross" value={inrPrecise(run.total_gross)} />
                  <Stat label="Deductions" value={inrPrecise(run.total_deductions)} />
                  <Stat label="Net payable" value={inrPrecise(run.total_net)} highlight />
                </div>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr className="text-left">
                      <th className="px-3 py-2 font-medium">Employee</th>
                      <th className="px-3 py-2 font-medium text-right">Days</th>
                      <th className="px-3 py-2 font-medium text-right">Gross</th>
                      <th className="px-3 py-2 font-medium text-right">Deduct.</th>
                      <th className="px-3 py-2 font-medium text-right">Net</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {items.map((it) => (
                        <tr key={it.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2"><div className="font-medium">{it.employees?.full_name}</div><div className="text-xs text-muted-foreground">{it.employees?.employee_code}</div></td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(it.payable_days).toFixed(1)}/{it.working_days}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{inrPrecise(it.gross)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{inrPrecise(it.total_deductions)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{inrPrecise(it.net_pay)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <Button size="sm" variant="ghost" onClick={() => setPreview(it)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" disabled={selected?.is_locked} onClick={() => openDeduct(it)} title="Edit deductions"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" disabled={downloading === it.id} onClick={() => downloadPdf(it)} title="Download PDF">
                              {downloading === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{preview?.employees?.full_name} — {selected?.name}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Earnings</h3>
                  <table className="w-full"><tbody className="divide-y divide-border">
                    {preview.earnings.map((e) => <tr key={e.code}><td className="py-1.5">{e.name}</td><td className="text-right tabular-nums">{inrPrecise(e.amount)}</td></tr>)}
                    <tr className="font-semibold"><td className="py-2">Gross</td><td className="text-right tabular-nums">{inrPrecise(preview.gross)}</td></tr>
                  </tbody></table>
                </div>
                <div><h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Deductions</h3>
                  <table className="w-full"><tbody className="divide-y divide-border">
                    {preview.deductions.map((e) => <tr key={e.code}><td className="py-1.5">{e.name}</td><td className="text-right tabular-nums">{inrPrecise(e.amount)}</td></tr>)}
                    <tr className="font-semibold"><td className="py-2">Total</td><td className="text-right tabular-nums">{inrPrecise(preview.total_deductions)}</td></tr>
                  </tbody></table>
                </div>
              </div>
              <div className="rounded-lg bg-accent p-4 flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">Net pay</div><div className="text-2xl font-bold">{inrPrecise(preview.net_pay)}</div></div>
                <Button onClick={() => downloadPdf(preview)} disabled={downloading === preview.id}>
                  {downloading === preview.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />} PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deductEdit} onOpenChange={(o) => !o && setDeductEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Custom deductions — {deductEdit?.employees?.full_name}</DialogTitle></DialogHeader>
          {deductEdit && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">Add ad-hoc deductions like advances, fines, or asset recovery. Statutory rows (PF, ESI, PT, LOP) cannot be removed here — adjust CTC or attendance instead.</div>
              <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
                {deductEdit.deductions.map((d) => {
                  const isCustom = d.code.startsWith("CUSTOM_");
                  return (
                    <div key={d.code} className="flex items-center justify-between p-2.5 text-sm">
                      <div><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.code}</div></div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{inrPrecise(d.amount)}</span>
                        {isCustom && <Button size="sm" variant="ghost" onClick={() => removeDeduction(deductEdit, d.code)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Description</Label><Input value={deductName} onChange={(e) => setDeductName(e.target.value)} placeholder="e.g. Salary advance recovery" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Amount (₹)</Label><Input type="number" min={0} step="1" value={deductAmt} onChange={(e) => setDeductAmt(e.target.value)} /></div>
              </div>
              <div className="flex items-center justify-between bg-accent rounded-lg p-3">
                <div className="text-sm">Net after deductions</div>
                <div className="font-bold tabular-nums">{inrPrecise(deductEdit.net_pay)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeductEdit(null)}>Close</Button>
            <Button onClick={addCustomDeduction}>Add deduction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cycleDlg} onOpenChange={setCycleDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New payroll cycle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle name</Label><Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. June 2026 payroll" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cycle start</Label><Input type="date" value={cStart} onChange={(e) => setCStart(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Cycle end</Label><Input type="date" value={cEnd} onChange={(e) => setCEnd(e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Defaults follow the org payroll cycle (26th → 25th). Override here for off-cycle or arrears runs.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCycleDlg(false)}>Cancel</Button>
            <Button onClick={createCustomCycle}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "border-primary bg-accent" : "border-border"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${highlight ? "text-lg" : "text-base"}`}>{value}</div>
    </div>
  );
}
