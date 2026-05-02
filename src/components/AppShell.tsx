import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Clock, CalendarDays, Users, FileText, Settings, LogOut,
  Sun, Moon, Menu, X, Receipt, BadgeIndianRupee, CalendarClock, Building2, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Clock; roles?: ("admin" | "hr" | "manager" | "employee")[] };

const NAV: NavItem[] = [
  { to: "/app",                 label: "Dashboard",     icon: LayoutDashboard },
  { to: "/app/attendance",      label: "Attendance",    icon: Clock },
  { to: "/app/leaves",          label: "Leaves",        icon: CalendarDays },
  { to: "/app/payslips",        label: "Payslips",      icon: Receipt },
  { to: "/app/approvals",       label: "Approvals",     icon: ClipboardList,   roles: ["admin","hr","manager"] },
  { to: "/app/employees",       label: "Employees",     icon: Users,           roles: ["admin","hr","manager"] },
  { to: "/app/payroll",         label: "Payroll",       icon: BadgeIndianRupee, roles: ["admin","hr"] },
  { to: "/app/holidays",        label: "Holidays",      icon: CalendarClock },
  { to: "/app/reports",         label: "Reports",       icon: FileText,        roles: ["admin","hr","manager"] },
  { to: "/app/organization",    label: "Organization",  icon: Building2,       roles: ["admin","hr"] },
  { to: "/app/settings",        label: "Settings",      icon: Settings,        roles: ["admin","hr"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { employee, isAdmin, isHR, isManager, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const visible = NAV.filter((n) => {
    if (!n.roles) return true;
    if (isAdmin) return true;
    if (n.roles.includes("hr") && isHR) return true;
    if (n.roles.includes("manager") && isManager) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 lg:w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-16 px-5 flex items-center border-b border-sidebar-border">
          <Logo />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map((n) => {
            const Icon = n.icon;
            const active = loc.pathname === n.to || (n.to !== "/app" && loc.pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium truncate">{employee?.full_name ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{employee?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 px-4 flex items-center justify-between border-b border-border bg-card">
          <Logo size={24} />
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur pt-14">
            <nav className="p-4 space-y-1">
              {visible.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium hover:bg-accent">
                    <Icon className="h-5 w-5" />{n.label}
                  </Link>
                );
              })}
              <Button variant="outline" className="w-full mt-4" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur">
          {visible.slice(0, 5).map((n) => {
            const Icon = n.icon;
            const active = loc.pathname === n.to || (n.to !== "/app" && loc.pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to}
                className={cn("flex flex-col items-center gap-1 py-2 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
