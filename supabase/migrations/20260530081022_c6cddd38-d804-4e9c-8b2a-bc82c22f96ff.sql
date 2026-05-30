
-- 1) New helper: role check scoped to a specific organization
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = ANY(_roles)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, app_role[]) TO authenticated, service_role;

-- 2) employees: org-scoped manager/hr/admin access
DROP POLICY IF EXISTS "self employee" ON public.employees;
CREATE POLICY "self employee" ON public.employees
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

-- 3) attendance_records
DROP POLICY IF EXISTS "self read attendance" ON public.attendance_records;
CREATE POLICY "self read attendance" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

DROP POLICY IF EXISTS "self update own attendance" ON public.attendance_records;
CREATE POLICY "self update own attendance" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
)
WITH CHECK (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

-- 4) attendance_regularizations: org-scoped + allow admin/hr delete
DROP POLICY IF EXISTS "self read reg" ON public.attendance_regularizations;
CREATE POLICY "self read reg" ON public.attendance_regularizations
FOR SELECT TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

DROP POLICY IF EXISTS "managers update reg" ON public.attendance_regularizations;
CREATE POLICY "managers update reg" ON public.attendance_regularizations
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

CREATE POLICY "admins delete reg" ON public.attendance_regularizations
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr']::app_role[])
);

-- 5) leave_requests
DROP POLICY IF EXISTS "self read leave" ON public.leave_requests;
CREATE POLICY "self read leave" ON public.leave_requests
FOR SELECT TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

DROP POLICY IF EXISTS "self cancel leave" ON public.leave_requests;
CREATE POLICY "self cancel leave" ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
)
WITH CHECK (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

-- 6) leave_balances
DROP POLICY IF EXISTS "self balances" ON public.leave_balances;
CREATE POLICY "self balances" ON public.leave_balances
FOR SELECT TO authenticated
USING (
  employee_id = current_employee_id()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr','manager']::app_role[])
);

-- 7) payroll_cycles: restrict reads to admin/hr
DROP POLICY IF EXISTS "org members read payroll_cycles" ON public.payroll_cycles;
CREATE POLICY "admins read payroll_cycles" ON public.payroll_cycles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr']::app_role[])
);

-- 8) payroll_runs: restrict reads to admin/hr/super_admin
DROP POLICY IF EXISTS "org read runs" ON public.payroll_runs;
CREATE POLICY "admins read runs" ON public.payroll_runs
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role_in_org(auth.uid(), organization_id, ARRAY['admin','hr']::app_role[])
);

-- 9) Lock down trigger-only SECURITY DEFINER functions (not meant to be callable by clients)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 10) Helper SECURITY DEFINER role-check functions: revoke from anon (RLS evaluates as authenticated)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, service_role;
