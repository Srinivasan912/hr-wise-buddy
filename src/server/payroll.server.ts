/**
 * Indian payroll engine — server-only helpers.
 *
 * Salary structure assumed (auto-derived from monthly CTC if components
 * not configured): Basic 50%, HRA 20%, Special allowance = remainder.
 *
 * Statutory:
 * - PF (employee): 12% of Basic, capped on Basic of ₹15,000 (₹1,800/mo max).
 * - ESI (employee): 0.75% of gross IF gross ≤ ₹21,000.
 * - PT (Karnataka slab as default): ₹0 / ₹200 by gross (>= ₹15k => ₹200).
 * - LOP: pro-rated by (working_days - present_days - paid_leave_days) / working_days.
 * - OT: hourly rate = (Basic + DA) / (working_days * 8); OT pay = hours * rate * 1.5.
 * - TDS: skipped in v1 per product decision (HR can override per-cycle later).
 */

import { createClient } from "@supabase/supabase-js";

export type ComputedComponent = { code: string; name: string; amount: number };

export type EmployeePayrollInput = {
  employee_id: string;
  full_name: string;
  ctc_monthly: number;
  basic_pct?: number;
  hra_pct?: number;
};

export type AttendanceTotals = {
  working_days: number;
  present_days: number;
  paid_leave_days: number;
  lop_days: number;
  week_offs: number;
  holidays: number;
  overtime_hours: number;
  late_minutes: number;
};

export type ComputedPayslip = {
  earnings: ComputedComponent[];
  deductions: ComputedComponent[];
  gross: number;
  total_deductions: number;
  net_pay: number;
  payable_days: number;
} & AttendanceTotals;

const PF_BASIC_CAP = 15000;
const PF_RATE = 0.12;
const ESI_GROSS_LIMIT = 21000;
const ESI_RATE = 0.0075;

const round2 = (n: number) => Math.round(n * 100) / 100;

function ptForGross(gross: number): number {
  // Default: simple 2-bracket Karnataka-like slab. Editable later in Settings.
  if (gross >= 15000) return 200;
  return 0;
}

export function computePayslip(
  emp: EmployeePayrollInput,
  att: AttendanceTotals
): ComputedPayslip {
  const ctc = Number(emp.ctc_monthly) || 0;
  const basicPct = emp.basic_pct ?? 0.5;
  const hraPct = emp.hra_pct ?? 0.2;

  const fullBasic = round2(ctc * basicPct);
  const fullHra = round2(ctc * hraPct);
  const fullSpecial = round2(ctc - fullBasic - fullHra);

  const wd = Math.max(att.working_days, 1);
  const payableDays = Math.max(0, att.present_days + att.paid_leave_days);
  const lopFactor = payableDays / wd;

  const basic = round2(fullBasic * lopFactor);
  const hra = round2(fullHra * lopFactor);
  const special = round2(fullSpecial * lopFactor);

  // OT pay
  const hourly = (fullBasic + 0) / (wd * 8);
  const otPay = round2(att.overtime_hours * hourly * 1.5);

  const earnings: ComputedComponent[] = [
    { code: "BASIC", name: "Basic", amount: basic },
    { code: "HRA", name: "House Rent Allowance", amount: hra },
    { code: "SPECIAL", name: "Special Allowance", amount: special },
  ];
  if (otPay > 0) earnings.push({ code: "OT", name: "Overtime", amount: otPay });

  const gross = round2(earnings.reduce((s, e) => s + e.amount, 0));

  // PF on capped basic
  const pfBasis = Math.min(basic, PF_BASIC_CAP * lopFactor);
  const pf = round2(pfBasis * PF_RATE);

  // ESI only if FULL gross is within limit
  const esi = ctc <= ESI_GROSS_LIMIT ? round2(gross * ESI_RATE) : 0;

  // PT on full gross slab
  const pt = ptForGross(ctc);

  // LOP recovery line item (transparency: shows what LOP cost was)
  const lopAmount = round2((fullBasic + fullHra + fullSpecial) - (basic + hra + special));

  const deductions: ComputedComponent[] = [
    { code: "PF", name: "Provident Fund (12%)", amount: pf },
  ];
  if (esi > 0) deductions.push({ code: "ESI", name: "ESI (0.75%)", amount: esi });
  if (pt > 0) deductions.push({ code: "PT", name: "Professional Tax", amount: pt });
  if (lopAmount > 0) deductions.push({ code: "LOP", name: `Loss of Pay (${att.lop_days.toFixed(1)}d)`, amount: lopAmount });
  // Note: LOP is shown for transparency but already excluded from earnings,
  // so we MUST NOT subtract it again. We'll skip adding LOP to total_deductions.

  const total_deductions = round2(pf + esi + pt);
  const net_pay = round2(gross - total_deductions);

  return {
    earnings,
    deductions,
    gross,
    total_deductions,
    net_pay,
    payable_days: round2(payableDays),
    ...att,
  };
}

/**
 * Compute attendance totals for an employee in a payroll cycle by reading
 * the attendance_records, holidays, and leave_requests tables.
 */
export async function computeAttendanceTotals(args: {
  supabase: ReturnType<typeof createClient>;
  organization_id: string;
  employee_id: string;
  cycle_start: string; // YYYY-MM-DD
  cycle_end: string;
}): Promise<AttendanceTotals> {
  const { supabase, organization_id, employee_id, cycle_start, cycle_end } = args;

  // Day count in cycle
  const start = new Date(cycle_start + "T00:00:00Z");
  const end = new Date(cycle_end + "T00:00:00Z");
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  // Count Sundays as week-offs (default policy)
  let weekOffs = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weekOffs++;
  }

  const [attRes, holRes] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("status, total_minutes, overtime_minutes, late_minutes")
      .eq("employee_id", employee_id)
      .gte("attendance_date", cycle_start)
      .lte("attendance_date", cycle_end),
    supabase
      .from("holidays")
      .select("holiday_date")
      .eq("organization_id", organization_id)
      .gte("holiday_date", cycle_start)
      .lte("holiday_date", cycle_end),
  ]);

  const attRows = (attRes.data ?? []) as Array<{ status: string; total_minutes: number; overtime_minutes: number; late_minutes: number }>;
  const holidays = (holRes.data ?? []).length;
  const working_days = Math.max(1, totalDays - weekOffs - holidays);

  let present = 0, paidLeave = 0, lop = 0, otMin = 0, lateMin = 0;
  for (const r of attRows) {
    if (["present", "late", "wfh"].includes(r.status)) present += 1;
    else if (r.status === "half_day") present += 0.5;
    else if (r.status === "leave") paidLeave += 1;
    else if (r.status === "absent") lop += 1;
    otMin += r.overtime_minutes ?? 0;
    lateMin += r.late_minutes ?? 0;
  }

  // Days with no record at all in the cycle that aren't weekoff/holiday: treat as LOP
  const recordedDates = attRows.length;
  const expected = working_days;
  const accountedFor = present + paidLeave + lop;
  if (accountedFor < expected) lop += expected - accountedFor;
  void recordedDates;

  return {
    working_days,
    present_days: round2(present),
    paid_leave_days: round2(paidLeave),
    lop_days: round2(lop),
    week_offs: weekOffs,
    holidays,
    overtime_hours: round2(otMin / 60),
    late_minutes: lateMin,
  };
}
