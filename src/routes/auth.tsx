import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/app" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "signin") {
        // Clear any stale session so a failed attempt doesn't fall back to the previous user
        await supabase.auth.signOut();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: "/app" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Reset link sent (if account exists).");
        setMode("signin");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
      if (r.error) throw r.error;
      if (!r.redirected) nav({ to: "/app" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <Logo />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Run payroll in minutes,<br /> not days.</h2>
          <p className="mt-3 text-muted-foreground max-w-md">Attendance, leaves, and salary all linked. Built for the 26th-to-25th Indian payroll cycle.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            <Stat n="20+" l="Employees" />
            <Stat n="100%" l="INR" />
            <Stat n="IST" l="Timezone" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Demo data preloaded. Sign in with one of the demo accounts after they sign up via email/password.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6"><Logo /></div>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" && "Sign in to your dashboard."}
            {mode === "signup" && "Get started with your free workspace."}
            {mode === "forgot" && "We'll email you a reset link."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>Forgot?</button>}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" />OR<div className="flex-1 h-px bg-border" /></div>
              <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
                <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                Continue with Google
              </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? (
              <>No account? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Sign up</button></>
            ) : (
              <>Already have one? <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-lg font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </div>
  );
}
