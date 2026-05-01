import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: Reset });

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places the recovery token in URL hash; getSession picks it up.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated. Please sign in again.");
      await supabase.auth.signOut();
      nav({ to: "/auth" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reset");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">{ready ? "Choose a strong password (min 8 characters)." : "Validating reset link…"}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required disabled={!ready} /></div>
          <Button type="submit" className="w-full" disabled={busy || !ready}>Update password</Button>
        </form>
      </div>
    </div>
  );
}
