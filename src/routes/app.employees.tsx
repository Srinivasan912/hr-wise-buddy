import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { inr, fmtDate } from "@/lib/format";
import { Search } from "lucide-react";

export const Route = createFileRoute("/app/employees")({ component: EmployeesPage });

type Emp = { id: string; employee_code: string; full_name: string; email: string; mobile: string | null; ctc_annual: number; joining_date: string; status: string; departments: { name: string } | null; designations: { name: string } | null };

function EmployeesPage() {
  const { orgId, isHR } = useAuth();
  const [list, setList] = useState<Emp[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!orgId) return;
    supabase.from("employees").select("id, employee_code, full_name, email, mobile, ctc_annual, joining_date, status, departments(name), designations(name)").eq("organization_id", orgId).order("employee_code").then(({ data }) => setList((data as unknown as Emp[]) ?? []));
  }, [orgId]);
  const filtered = list.filter((e) => !q || e.full_name.toLowerCase().includes(q.toLowerCase()) || e.employee_code.toLowerCase().includes(q.toLowerCase()) || e.email.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Employees <span className="text-muted-foreground text-base font-normal">· {list.length}</span></h1>
        <div className="relative max-w-xs w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Directory</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Designation</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                {isHR && <th className="px-4 py-2 font-medium text-right">CTC (annual)</th>}
                <th className="px-4 py-2 font-medium">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-accent/30">
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{e.employee_code}</td>
                    <td className="px-4 py-2.5"><div className="font-medium">{e.full_name}</div><div className="text-xs text-muted-foreground">{e.email}</div></td>
                    <td className="px-4 py-2.5">{e.departments?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">{e.designations?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(e.joining_date)}</td>
                    {isHR && <td className="px-4 py-2.5 text-right tabular-nums">{inr(e.ctc_annual, { compact: true })}</td>}
                    <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{e.status.replace("_"," ")}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={isHR ? 7 : 6} className="text-center py-8 text-muted-foreground">No employees match</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
