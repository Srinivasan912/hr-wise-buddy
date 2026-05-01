import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

const REPORTS = [
  "Attendance report", "Monthly muster", "Late coming", "Overtime", "Leave balance",
  "Holiday report", "Payroll report", "Salary register", "Deduction report",
  "Employee master", "Bank transfer", "Payslip dispatch log",
];

function ReportsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <Card key={r}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{r}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">Filter by branch, department, employee, payroll cycle, date range. Export CSV/PDF — coming soon.</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
