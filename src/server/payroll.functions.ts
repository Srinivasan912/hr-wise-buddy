/**
 * Server functions for payroll: run a cycle, compute every employee's pay,
 * and persist payroll_runs + payroll_run_items + payslips rows.
 *
 * Auth: caller must be admin/HR. We re-check via a service-role client OR
 * use the user's JWT (we use service role to bypass RLS in batch).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { computeAttendanceTotals, computePayslip } from "./payroll.server";

function adminClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function userClient(token: string): Promise<SupabaseClient> {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(token: string): Promise<{ orgId: string; userId: string }> {
  const c = await userClient(token);
  const { data: u } = await c.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");
  const { data: roles } = await c.from("user_roles").select("role, organization_id").eq("user_id", u.user.id);
  const allowed = (roles ?? []).find((r) => ["admin", "super_admin", "hr"].includes(r.role as string));
  if (!allowed) throw new Error("Forbidden — admin/HR role required");
  return { orgId: (allowed.organization_id ?? "") as string, userId: u.user.id };
}

export const runPayroll = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), payroll_cycle_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { orgId } = await requireAdmin(data.token);
    const admin = adminClient();

    const { data: cycle, error: ce } = await admin
      .from("payroll_cycles")
      .select("id, organization_id, cycle_start, cycle_end, name, is_locked")
      .eq("id", data.payroll_cycle_id).maybeSingle();
    if (ce || !cycle) throw new Error("Cycle not found");
    if (cycle.organization_id !== orgId) throw new Error("Cross-org access denied");
    if (cycle.is_locked) throw new Error("Cycle is locked. Unlock it first to re-run.");

    const { data: emps, error: ee } = await admin
      .from("employees")
      .select("id, full_name, ctc_annual, status")
      .eq("organization_id", orgId)
      .eq("status", "active");
    if (ee) throw ee;

    // Insert/replace payroll_run
    const { data: existing } = await admin.from("payroll_runs").select("id").eq("payroll_cycle_id", cycle.id).maybeSingle();
    if (existing) {
      await admin.from("payroll_run_items").delete().eq("payroll_run_id", existing.id);
      await admin.from("payslips").delete().eq("payroll_cycle_id", cycle.id);
      await admin.from("payroll_runs").delete().eq("id", existing.id);
    }
    const { data: run, error: re } = await admin
      .from("payroll_runs")
      .insert({ organization_id: orgId, payroll_cycle_id: cycle.id, status: "processing" })
      .select("id").single();
    if (re) throw re;

    let totalGross = 0, totalDed = 0, totalNet = 0;
    const items: Array<Record<string, unknown>> = [];
    const payslipRows: Array<Record<string, unknown>> = [];

    for (const e of emps ?? []) {
      const monthly = (Number(e.ctc_annual) || 0) / 12;
      const att = await computeAttendanceTotals({
        supabase: admin, organization_id: orgId,
        employee_id: e.id as string,
        cycle_start: cycle.cycle_start as string, cycle_end: cycle.cycle_end as string,
      });
      const slip = computePayslip({ employee_id: e.id as string, full_name: e.full_name as string, ctc_monthly: monthly }, att);
      totalGross += slip.gross; totalDed += slip.total_deductions; totalNet += slip.net_pay;
      items.push({
        payroll_run_id: run.id, employee_id: e.id,
        gross: slip.gross, net_pay: slip.net_pay, total_deductions: slip.total_deductions,
        working_days: slip.working_days, payable_days: slip.payable_days, present_days: slip.present_days,
        paid_leave_days: slip.paid_leave_days, lop_days: slip.lop_days, week_offs: slip.week_offs,
        holidays: slip.holidays, overtime_hours: slip.overtime_hours, late_minutes: slip.late_minutes,
        earnings: slip.earnings, deductions: slip.deductions,
      });
    }

    if (items.length) {
      const { data: insItems, error: ie } = await admin.from("payroll_run_items").insert(items).select("id, employee_id");
      if (ie) throw ie;
      for (const it of insItems ?? []) {
        payslipRows.push({
          organization_id: orgId, payroll_cycle_id: cycle.id,
          payroll_run_item_id: it.id, employee_id: it.employee_id,
        });
      }
      if (payslipRows.length) await admin.from("payslips").insert(payslipRows);
    }

    await admin.from("payroll_runs").update({
      status: "processed",
      total_employees: items.length,
      total_gross: Math.round(totalGross * 100) / 100,
      total_deductions: Math.round(totalDed * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      processed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return { run_id: run.id, employees: items.length, total_net: totalNet };
  });

export const lockPayroll = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), payroll_cycle_id: z.string().uuid(), lock: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { orgId } = await requireAdmin(data.token);
    const admin = adminClient();
    const { data: cycle } = await admin.from("payroll_cycles").select("organization_id").eq("id", data.payroll_cycle_id).maybeSingle();
    if (!cycle || cycle.organization_id !== orgId) throw new Error("Forbidden");
    await admin.from("payroll_cycles").update({ is_locked: data.lock }).eq("id", data.payroll_cycle_id);
    if (data.lock) await admin.from("payroll_runs").update({ locked_at: new Date().toISOString(), status: "locked" }).eq("payroll_cycle_id", data.payroll_cycle_id);
    return { ok: true };
  });

export const createNextCycle = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { orgId } = await requireAdmin(data.token);
    const admin = adminClient();
    const { data: org } = await admin.from("organizations").select("payroll_cycle_start_day, payroll_cycle_end_day").eq("id", orgId).single();
    const startDay = Number(org?.payroll_cycle_start_day ?? 26);
    const endDay = Number(org?.payroll_cycle_end_day ?? 25);
    const today = new Date();
    // The "current" cycle that contains today: starts on the most recent <startDay>
    const y = today.getUTCFullYear(), m = today.getUTCMonth();
    let startMonth = m, startYear = y;
    if (today.getUTCDate() < startDay) {
      startMonth -= 1;
      if (startMonth < 0) { startMonth = 11; startYear -= 1; }
    }
    const start = new Date(Date.UTC(startYear, startMonth, startDay));
    const end = new Date(Date.UTC(startYear, startMonth + 1, endDay));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const monthName = new Date(Date.UTC(startYear, startMonth + 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric" });
    const name = `${monthName} payroll`;
    const { data: existing } = await admin.from("payroll_cycles").select("id").eq("organization_id", orgId).eq("cycle_start", fmt(start)).maybeSingle();
    if (existing) return { id: existing.id, name, created: false };
    const { data: ins, error } = await admin.from("payroll_cycles").insert({
      organization_id: orgId, name, cycle_start: fmt(start), cycle_end: fmt(end), pay_date: fmt(end),
    }).select("id").single();
    if (error) throw error;
    return { id: ins.id, name, created: true };
  });

export const previewPayslip = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), payroll_run_item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const c = await userClient(data.token);
    const { data: item, error } = await c.from("payroll_run_items").select(
      "id, gross, net_pay, total_deductions, payable_days, working_days, present_days, paid_leave_days, lop_days, week_offs, holidays, overtime_hours, earnings, deductions, employee_id, payroll_runs(payroll_cycles(name, cycle_start, cycle_end), organization_id)"
    ).eq("id", data.payroll_run_item_id).single();
    if (error || !item) throw new Error("Not found");
    return item;
  });
