import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { inr, fmtDate, fmtTime, todayIST } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, CalendarDays, BadgeIndianRupee, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  // If on /app exactly, render the dashboard. Otherwise render <Outlet />.
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
        <DashboardIfRoot />
      </AppShell>
    </ProtectedRoute>
  );
}

function DashboardIfRoot() {
  // The dashboard renders only when the current path is exactly /app (no child route).
  if (typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "") !== "/app") return null;
  return <Dashboard />;
}

function Dashboard() {
  const { employee, isHR, orgId } = useAuth();
  const today = todayIST();
  const [today_att, setTodayAtt] = useState<{ status: string; check_in: string | null; check_out: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ total: 0, present: 0, leaves: 0, late: 0 });
  const [recent, setRecent] = useState<Array<{ attendance_date: string; status: string; check_in: string | null; check_out: string | null }>>([]);

  useEffect(() => {
    if (!employee) return;
    void (async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("status, check_in, check_out")
        .eq("employee_id", employee.id).eq("attendance_date", today).maybeSingle();
      setTodayAtt(data ?? null);
      const { data: rec } = await supabase
        .from("attendance_records")
        .select("attendance_date, status, check_in, check_out")
        .eq("employee_id", employee.id)
        .order("attendance_date", { ascending: false }).limit(7);
      setRecent(rec ?? []);
    })();
  }, [employee, today]);

  useEffect(() => {
    if (!isHR || !orgId) return;
    void (async () => {
      const [{ count: total }, { data: att }] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
        supabase.from("attendance_records").select("status").eq("organization_id", orgId).eq("attendance_date", today),
      ]);
      const present = (att ?? []).filter((a) => ["present", "late", "wfh", "half_day"].includes(a.status)).length;
      const leaves = (att ?? []).filter((a) => a.status === "leave").length;
      const late = (att ?? []).filter((a) => a.status === "late").length;
      setStats({ total: total ?? 0, present, leaves, late });
    })();
  }, [isHR, orgId, today]);

  const checkIn = async () => {
    if (!employee) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("attendance_records").upsert({
        organization_id: employee.organization_id, employee_id: employee.id,
        attendance_date: today, status: "present", check_in: now,
      }, { onConflict: "employee_id,attendance_date" });
      if (error) throw error;
      setTodayAtt({ status: "present", check_in: now, check_out: null });
      toast.success("Checked in!");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const checkOut = async () => {
    if (!employee || !today_att) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("attendance_records")
        .update({ check_out: now })
        .eq("employee_id", employee.id).eq("attendance_date", today);
      if (error) throw error;
      setTodayAtt({ ...today_att, check_out: now });
      toast.success("Checked out!");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, {employee?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground">{fmtDate(new Date(), { weekday: "long" })}</p>
      </div>

      {employee && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Today's attendance</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="capitalize">{today_att?.status ?? "Not marked"}</Badge>
              <span className="text-sm text-muted-foreground">In: <b className="text-foreground">{fmtTime(today_att?.check_in)}</b></span>
              <span className="text-sm text-muted-foreground">Out: <b className="text-foreground">{fmtTime(today_att?.check_out)}</b></span>
            </div>
            <div className="flex gap-2">
              {!today_att?.check_in && <Button onClick={checkIn} disabled={busy}><LogIn className="h-4 w-4 mr-1.5" /> Check in</Button>}
              {today_att?.check_in && !today_att?.check_out && <Button onClick={checkOut} disabled={busy} variant="secondary"><LogOut className="h-4 w-4 mr-1.5" /> Check out</Button>}
              {today_att?.check_in && today_att?.check_out && <Badge>Done for today</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {isHR && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={Users} label="Active employees" value={stats.total.toString()} />
          <KPI icon={Clock} label="Present today" value={stats.present.toString()} />
          <KPI icon={CalendarDays} label="On leave" value={stats.leaves.toString()} />
          <KPI icon={TrendingUp} label="Late today" value={stats.late.toString()} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent attendance</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {recent.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No records yet</p>}
            {recent.map((r) => (
              <div key={r.attendance_date} className="py-2.5 flex items-center justify-between">
                <span className="text-sm">{fmtDate(r.attendance_date)}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{fmtTime(r.check_in)} – {fmtTime(r.check_out)}</span>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick links</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <QL to="/app/leaves" icon={CalendarDays} label="Apply leave" />
            <QL to="/app/payslips" icon={BadgeIndianRupee} label="My payslips" />
            <QL to="/app/attendance" icon={Clock} label="Attendance" />
            <QL to="/app/holidays" icon={CalendarDays} label="Holidays" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
function QL({ to, icon: Icon, label }: { to: string; icon: typeof Clock; label: string }) {
  return <Link to={to} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{label}</Link>;
}

// Suppress unused-import warning for inr in dev (used by other routes)
void inr;
