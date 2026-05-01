import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Mail, Lock, Building2, BadgeIndianRupee, Calendar } from "lucide-react";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const SECTIONS = [
  { icon: Building2, title: "General", desc: "Company branding, logo, address" },
  { icon: BadgeIndianRupee, title: "Payroll", desc: "Cycle (default 26→25), components, formulas" },
  { icon: Calendar, title: "Attendance & shifts", desc: "Shift timings, grace, half-day rules" },
  { icon: Calendar, title: "Leave policy", desc: "Quotas, accrual, carry-forward" },
  { icon: Calendar, title: "Holidays", desc: "Custom Indian holiday calendar" },
  { icon: Mail, title: "Email / SMTP", desc: "Sender name, sender address" },
  { icon: Bell, title: "Notifications", desc: "When to notify and via which channel" },
  { icon: Lock, title: "Roles & permissions", desc: "Super Admin · Admin · HR · Manager · Employee" },
];

function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2"><Settings className="h-5 w-5" /><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <Card key={s.title}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" />{s.title}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">{s.desc}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
