import { type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children, require }: { children: ReactNode; require?: ("admin" | "hr" | "manager")[] }) {
  const { user, loading, isAdmin, isHR, isManager } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (require) {
    const ok =
      (require.includes("admin") && isAdmin) ||
      (require.includes("hr") && isHR) ||
      (require.includes("manager") && isManager);
    if (!ok) return <Navigate to="/app" />;
  }
  return <>{children}</>;
}
