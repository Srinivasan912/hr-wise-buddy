import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, BadgeIndianRupee, Users, FileText, Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && user) nav({ to: "/app" }); }, [user, loading, nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between border-b border-border">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Get started</Button></Link>
        </div>
      </header>

      <section className="px-4 sm:px-8 py-12 md:py-20">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
            <Shield className="h-3 w-3" /> Built for Indian businesses · INR · IST
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            Attendance & payroll,<br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">on autopilot.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Self check-in, leave management, and automated salary calculation with the 26th–25th payroll cycle.
            One place for HR, managers, and employees.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth"><Button size="lg">Get started <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
            <a href="#features"><Button size="lg" variant="outline">Explore features</Button></a>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 sm:px-8 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Clock, title: "Smart attendance", body: "Self check-in/out, shift tracking, late marks, regularization, and approval workflow." },
            { icon: CalendarDays, title: "Leave management", body: "CL/SL/PL with carry-forward, half-day, and Indian holiday calendar built in." },
            { icon: BadgeIndianRupee, title: "Auto payroll", body: "Configurable 26th–25th cycle, LOP, overtime, PF, ESI, PT, TDS – all calculated for you." },
            { icon: FileText, title: "Indian payslips", body: "Professional payslip with amount in words, downloadable PDF, monthly auto-email." },
            { icon: Users, title: "Roles & access", body: "Super Admin, HR, Manager and Employee — with row-level access control everywhere." },
            { icon: Shield, title: "Cloud secure", body: "RLS-protected database, audit trail, and encrypted secrets. Production-ready." },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-3"><f.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 sm:px-8 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Attendance.io · Made for India
      </footer>
    </div>
  );
}
