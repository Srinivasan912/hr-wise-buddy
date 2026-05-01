
-- Pin search_path on helper functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Restrict EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;

-- Tighten "with check (true)" permissive policies
DROP POLICY IF EXISTS "self cancel leave" ON public.leave_requests;
CREATE POLICY "self cancel leave" ON public.leave_requests FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));

DROP POLICY IF EXISTS "self update own attendance" ON public.attendance_records;
CREATE POLICY "self update own attendance" ON public.attendance_records FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));

DROP POLICY IF EXISTS "managers update reg" ON public.attendance_regularizations;
CREATE POLICY "managers update reg" ON public.attendance_regularizations FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));
