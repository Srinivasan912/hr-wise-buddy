import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type RoleRow = { role: "super_admin" | "admin" | "hr" | "manager" | "employee"; organization_id: string };
type EmployeeLite = { id: string; full_name: string; email: string; employee_code: string; organization_id: string };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleRow[];
  employee: EmployeeLite | null;
  orgId: string | null;
  isAdmin: boolean;
  isHR: boolean;
  isManager: boolean;
  hasRole: (r: RoleRow["role"]) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [employee, setEmployee] = useState<EmployeeLite | null>(null);

  const loadProfile = async (uid: string) => {
    const [r, e] = await Promise.all([
      supabase.from("user_roles").select("role, organization_id").eq("user_id", uid),
      supabase.from("employees").select("id, full_name, email, employee_code, organization_id").eq("user_id", uid).maybeSingle(),
    ]);
    setRoles((r.data ?? []) as RoleRow[]);
    setEmployee((e.data ?? null) as EmployeeLite | null);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid blocking the auth callback
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setRoles([]); setEmployee(null);
      }
    });
    // Then check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const orgId = roles[0]?.organization_id ?? employee?.organization_id ?? null;
  const hasRole = (r: RoleRow["role"]) => roles.some((x) => x.role === r);
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const isHR = isAdmin || hasRole("hr");
  const isManager = isHR || hasRole("manager");

  const value: AuthCtx = {
    user, session, loading, roles, employee, orgId,
    isAdmin, isHR, isManager, hasRole,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (user) await loadProfile(user.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};
