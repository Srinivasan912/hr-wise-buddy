/**
 * Monthly cron endpoint to dispatch payslip emails.
 *
 * Status: SCAFFOLD ONLY. No email domain is verified yet, so this endpoint
 * marks queued payslips and records a "skipped (no domain)" log row instead
 * of actually sending. Once a verified domain + transactional sender is
 * wired in, swap the `sendEmail` stub for the real call.
 *
 * Cron setup (run once in DB after deploy):
 *
 *   select cron.schedule(
 *     'dispatch-payslips-monthly',
 *     '0 9 1 * *', -- 1st of every month at 09:00 UTC
 *     $$
 *     select net.http_post(
 *       url:='https://project--53075410-a894-47ed-b3d0-a9b4a04285fd.lovable.app/api/public/hooks/dispatch-payslip-emails',
 *       headers:='{"Content-Type":"application/json"}'::jsonb,
 *       body:='{}'::jsonb
 *     );
 *     $$
 *   );
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/dispatch-payslip-emails")({
  server: {
    handlers: {
      POST: async () => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Find latest processed (unlocked or just-locked) payroll run per org
        const { data: runs } = await supabase
          .from("payroll_runs")
          .select("id, organization_id, payroll_cycle_id, status")
          .in("status", ["processed", "locked"])
          .order("processed_at", { ascending: false })
          .limit(50);

        let queued = 0;
        for (const run of runs ?? []) {
          const { data: payslips } = await supabase
            .from("payslips")
            .select("id, organization_id, employee_id, employees(email, full_name)")
            .eq("payroll_cycle_id", run.payroll_cycle_id);

          for (const ps of (payslips ?? []) as unknown as Array<{ id: string; organization_id: string; employees: { email: string; full_name: string } | { email: string; full_name: string }[] | null }>) {
            const emp = Array.isArray(ps.employees) ? ps.employees[0] : ps.employees;
            const email = emp?.email;
            if (!email) continue;

            // Skip if already logged for this payslip
            const { data: existing } = await supabase
              .from("payslip_email_logs")
              .select("id")
              .eq("payslip_id", ps.id)
              .maybeSingle();
            if (existing) continue;

            // No verified domain yet — mark as failed/skipped so HR can see status
            await supabase.from("payslip_email_logs").insert({
              organization_id: ps.organization_id,
              payslip_id: ps.id,
              to_email: email,
              status: "failed",
              error: "Email domain not configured. Set up a verified sender domain to enable delivery.",
            });
            queued++;
          }
        }

        return Response.json({ ok: true, queued, note: "No email domain configured. Logs created for visibility." });
      },
    },
  },
});
