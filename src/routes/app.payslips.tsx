import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, inrPrecise, numberToWordsIndian } from "@/lib/format";
import { Receipt, Search } from "lucide-react";

export const Route = createFileRoute("/app/payslips")({ component: PayslipsPage });

type Item = {
  id: string; payable_days: number; gross: number; total_deductions: number; net_pay: number;
  earnings: { code: string; name: string; amount: number }[];
  deductions: { code: string; name: string; amount: number }[];
  payroll_runs: { payroll_cycles: { name: string; cycle_start: string; cycle_end: string } | null } | null;
};

function PayslipsPage() {
  const { employee } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!employee) return;
    supabase.from("payroll_run_items").select(
      "id, payable_days, gross, total_deductions, net_pay, earnings, deductions, payroll_runs(payroll_cycles(name, cycle_start, cycle_end))"
    ).eq("employee_id", employee.id).order("created_at", { ascending: false }).limit(24).then(({ data }) => {
      setItems((data as unknown as Item[]) ?? []);
    });
  }, [employee]);

  const filtered = items.filter((i) => !q || i.payroll_runs?.payroll_cycles?.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My payslips</h1>
        <div className="relative max-w-xs w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cycle…" className="pl-9" /></div>
      </div>

      {items.length === 0 && (
        <Card><CardContent className="py-12 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No payslips yet. They'll appear here once HR processes payroll.</p>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          {filtered.map((i) => (
            <button key={i.id} onClick={() => setSelected(i)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === i.id ? "border-primary bg-accent" : "border-border hover:bg-accent/50"}`}>
              <div className="text-sm font-medium">{i.payroll_runs?.payroll_cycles?.name ?? "Payslip"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Net: {inrPrecise(i.net_pay)}</div>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Payslip — {selected.payroll_runs?.payroll_cycles?.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Cycle</div><div>{fmtDate(selected.payroll_runs?.payroll_cycles?.cycle_start)} – {fmtDate(selected.payroll_runs?.payroll_cycles?.cycle_end)}</div></div>
                <div><div className="text-xs text-muted-foreground">Payable days</div><div>{Number(selected.payable_days).toFixed(2)}</div></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Earnings</h3>
                  <table className="w-full text-sm"><tbody className="divide-y divide-border">
                    {selected.earnings.map((e) => (<tr key={e.code}><td className="py-1.5">{e.name}</td><td className="text-right tabular-nums">{inrPrecise(e.amount)}</td></tr>))}
                    <tr className="font-semibold"><td className="py-2">Gross</td><td className="text-right tabular-nums">{inrPrecise(selected.gross)}</td></tr>
                  </tbody></table>
                </div>
                <div><h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Deductions</h3>
                  <table className="w-full text-sm"><tbody className="divide-y divide-border">
                    {selected.deductions.map((e) => (<tr key={e.code}><td className="py-1.5">{e.name}</td><td className="text-right tabular-nums">{inrPrecise(e.amount)}</td></tr>))}
                    <tr className="font-semibold"><td className="py-2">Total deductions</td><td className="text-right tabular-nums">{inrPrecise(selected.total_deductions)}</td></tr>
                  </tbody></table>
                </div>
              </div>
              <div className="rounded-lg bg-accent p-4 flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">Net payable</div><div className="text-2xl font-bold">{inrPrecise(selected.net_pay)}</div></div>
                <Button variant="outline" disabled>Download PDF</Button>
              </div>
              <p className="text-xs text-muted-foreground italic">{numberToWordsIndian(selected.net_pay)}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
