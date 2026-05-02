import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Building2, Clock, CalendarDays, BadgeIndianRupee, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

type Org = { id?: string; name: string; legal_name: string | null; address: string | null; city: string | null; state: string | null; pincode: string | null; gst_number: string | null; pan_number: string | null; payroll_cycle_start_day: number; payroll_cycle_end_day: number; email_sender_name: string | null; email_sender_address: string | null };
type Shift = { id: string; name: string; start_time: string; end_time: string; grace_minutes: number; full_day_minimum_minutes: number; half_day_after_minutes: number; overtime_after_minutes: number };
type LT = { id: string; code: string; name: string; yearly_quota: number; monthly_accrual: number; carry_forward: boolean; max_carry_forward: number; allow_half_day: boolean; is_paid: boolean; color: string };
type Hol = { id: string; name: string; holiday_date: string; is_optional: boolean };

function SettingsPage() {
  const { orgId, isHR } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [lts, setLts] = useState<LT[]>([]);
  const [hols, setHols] = useState<Hol[]>([]);
  const [savingOrg, setSavingOrg] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [o, s, l, h] = await Promise.all([
      supabase.from("organizations").select("id, name, legal_name, address, city, state, pincode, gst_number, pan_number, payroll_cycle_start_day, payroll_cycle_end_day, email_sender_name, email_sender_address").eq("id", orgId).maybeSingle(),
      supabase.from("shifts").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("leave_types").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("holidays").select("id, name, holiday_date, is_optional").eq("organization_id", orgId).order("holiday_date"),
    ]);
    setOrg((o.data as Org) ?? null);
    setShifts((s.data as Shift[]) ?? []);
    setLts((l.data as LT[]) ?? []);
    setHols((h.data as Hol[]) ?? []);
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault(); if (!org || !orgId) return; setSavingOrg(true);
    try {
      const { id: _ignored, ...patch } = org; void _ignored;
      const { error } = await supabase.from("organizations").update(patch).eq("id", orgId);
      if (error) throw error; toast.success("Organization saved");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSavingOrg(false); }
  };

  const updShift = async (s: Shift) => {
    const { id: _i, ...patch } = s; void _i;
    const { error } = await supabase.from("shifts").update(patch).eq("id", s.id);
    if (error) toast.error(error.message); else toast.success("Shift saved");
  };
  const updLT = async (l: LT) => {
    const { id: _i, ...patch } = l; void _i;
    const { error } = await supabase.from("leave_types").update(patch).eq("id", l.id);
    if (error) toast.error(error.message); else toast.success("Leave type saved");
  };
  const addHoliday = async () => {
    if (!orgId) return;
    const date = prompt("Holiday date (YYYY-MM-DD)"); if (!date) return;
    const name = prompt("Holiday name"); if (!name) return;
    const { error } = await supabase.from("holidays").insert({ organization_id: orgId, name, holiday_date: date });
    if (error) toast.error(error.message); else { toast.success("Holiday added"); await load(); }
  };
  const delHoliday = async (id: string) => {
    if (!confirm("Delete holiday?")) return;
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); await load(); }
  };

  if (!isHR) return <div className="p-8 text-sm text-muted-foreground">Admin/HR only.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2"><Settings className="h-5 w-5" /><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1></div>

      <Tabs defaultValue="org">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="org"><Building2 className="h-3.5 w-3.5 mr-1.5" /> Organization</TabsTrigger>
          <TabsTrigger value="shifts"><Clock className="h-3.5 w-3.5 mr-1.5" /> Shifts</TabsTrigger>
          <TabsTrigger value="leaves"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Leave types</TabsTrigger>
          <TabsTrigger value="holidays"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Holidays</TabsTrigger>
          <TabsTrigger value="payroll"><BadgeIndianRupee className="h-3.5 w-3.5 mr-1.5" /> Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-4">
          {org && (
            <Card><CardContent className="p-6">
              <form onSubmit={saveOrg} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name"><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></Field>
                <Field label="Legal name"><Input value={org.legal_name ?? ""} onChange={(e) => setOrg({ ...org, legal_name: e.target.value })} /></Field>
                <Field label="GST"><Input value={org.gst_number ?? ""} onChange={(e) => setOrg({ ...org, gst_number: e.target.value })} /></Field>
                <Field label="PAN"><Input value={org.pan_number ?? ""} onChange={(e) => setOrg({ ...org, pan_number: e.target.value })} /></Field>
                <Field label="Address" className="sm:col-span-2"><Input value={org.address ?? ""} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></Field>
                <Field label="City"><Input value={org.city ?? ""} onChange={(e) => setOrg({ ...org, city: e.target.value })} /></Field>
                <Field label="State"><Input value={org.state ?? ""} onChange={(e) => setOrg({ ...org, state: e.target.value })} /></Field>
                <Field label="Pincode"><Input value={org.pincode ?? ""} onChange={(e) => setOrg({ ...org, pincode: e.target.value })} /></Field>
                <Field label="Email sender name"><Input value={org.email_sender_name ?? ""} onChange={(e) => setOrg({ ...org, email_sender_name: e.target.value })} placeholder="Acme HR" /></Field>
                <Field label="Email sender address" className="sm:col-span-2"><Input value={org.email_sender_address ?? ""} onChange={(e) => setOrg({ ...org, email_sender_address: e.target.value })} placeholder="payslips@yourdomain.com" /></Field>
                <div className="sm:col-span-2"><Button type="submit" disabled={savingOrg}>{savingOrg ? "Saving…" : "Save organization"}</Button></div>
              </form>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="shifts" className="mt-4 space-y-3">
          {shifts.map((s) => (
            <Card key={s.id}><CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Name"><Input value={s.name} onChange={(e) => setShifts((arr) => arr.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))} /></Field>
              <Field label="Start"><Input type="time" value={s.start_time.slice(0,5)} onChange={(e) => setShifts((arr) => arr.map((x) => x.id === s.id ? { ...x, start_time: e.target.value + ":00" } : x))} /></Field>
              <Field label="End"><Input type="time" value={s.end_time.slice(0,5)} onChange={(e) => setShifts((arr) => arr.map((x) => x.id === s.id ? { ...x, end_time: e.target.value + ":00" } : x))} /></Field>
              <Field label="Grace (min)"><Input type="number" value={s.grace_minutes} onChange={(e) => setShifts((arr) => arr.map((x) => x.id === s.id ? { ...x, grace_minutes: Number(e.target.value) } : x))} /></Field>
              <div className="col-span-full"><Button size="sm" onClick={() => updShift(s)}>Save</Button></div>
            </CardContent></Card>
          ))}
          {shifts.length === 0 && <p className="text-sm text-muted-foreground">No shifts configured.</p>}
        </TabsContent>

        <TabsContent value="leaves" className="mt-4 space-y-3">
          {lts.map((l) => (
            <Card key={l.id}><CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Code"><Input value={l.code} onChange={(e) => setLts((arr) => arr.map((x) => x.id === l.id ? { ...x, code: e.target.value } : x))} /></Field>
              <Field label="Name"><Input value={l.name} onChange={(e) => setLts((arr) => arr.map((x) => x.id === l.id ? { ...x, name: e.target.value } : x))} /></Field>
              <Field label="Yearly quota"><Input type="number" step="0.5" value={l.yearly_quota} onChange={(e) => setLts((arr) => arr.map((x) => x.id === l.id ? { ...x, yearly_quota: Number(e.target.value) } : x))} /></Field>
              <Field label="Monthly accrual"><Input type="number" step="0.5" value={l.monthly_accrual} onChange={(e) => setLts((arr) => arr.map((x) => x.id === l.id ? { ...x, monthly_accrual: Number(e.target.value) } : x))} /></Field>
              <div className="col-span-full"><Button size="sm" onClick={() => updLT(l)}>Save</Button></div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Holidays</CardTitle>
            <Button size="sm" onClick={addHoliday}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add</Button>
          </CardHeader>
            <CardContent className="p-0 divide-y divide-border max-h-[500px] overflow-y-auto">
              {hols.map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between">
                  <div><div className="font-medium text-sm">{h.name}</div><div className="text-xs text-muted-foreground">{h.holiday_date}</div></div>
                  <Button size="sm" variant="ghost" onClick={() => delHoliday(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {hols.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No holidays</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          {org && (
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cycle start day"><Input type="number" min={1} max={28} value={org.payroll_cycle_start_day} onChange={(e) => setOrg({ ...org, payroll_cycle_start_day: Number(e.target.value) })} /></Field>
                <Field label="Cycle end day"><Input type="number" min={1} max={28} value={org.payroll_cycle_end_day} onChange={(e) => setOrg({ ...org, payroll_cycle_end_day: Number(e.target.value) })} /></Field>
              </div>
              <Button onClick={saveOrg} disabled={savingOrg}>{savingOrg ? "Saving…" : "Save"}</Button>
              <div className="text-xs text-muted-foreground border-t border-border pt-4">
                <p><b className="text-foreground">Statutory rules (current build):</b></p>
                <ul className="list-disc list-inside space-y-0.5 mt-1">
                  <li>Provident Fund: 12% of Basic, capped on ₹15,000 (max ₹1,800/mo)</li>
                  <li>ESI: 0.75% of gross when monthly CTC ≤ ₹21,000</li>
                  <li>Professional Tax: ₹200 if monthly CTC ≥ ₹15,000 (Karnataka default)</li>
                  <li>LOP: pro-rated on (working_days − present − paid_leave) / working_days</li>
                  <li>Overtime: 1.5× basic-hourly rate (per attendance OT minutes)</li>
                  <li>TDS: not auto-calculated in v1 — HR can enter per cycle</li>
                </ul>
              </div>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
