
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','hr','manager','employee');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','half_day','leave','holiday','week_off','wfh','on_duty','overtime');
CREATE TYPE public.leave_request_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE public.regularization_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.salary_component_type AS ENUM ('earning','deduction');
CREATE TYPE public.salary_calc_type AS ENUM ('fixed','percent_of_basic','percent_of_gross','formula');
CREATE TYPE public.employee_salary_type AS ENUM ('monthly','daily','hourly');
CREATE TYPE public.payroll_run_status AS ENUM ('draft','processing','locked','paid');
CREATE TYPE public.employee_status AS ENUM ('active','on_notice','resigned','terminated','on_leave');

-- ============ HELPER FUNCTIONS (timestamps) ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gst_number TEXT,
  pan_number TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  payroll_cycle_start_day INT NOT NULL DEFAULT 26,
  payroll_cycle_end_day INT NOT NULL DEFAULT 25,
  email_sender_name TEXT,
  email_sender_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_org_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BRANCHES / DEPTS / DESIG ============
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT, city TEXT, state TEXT, pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_branches_org ON public.branches(organization_id);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dept_org ON public.departments(organization_id);

CREATE TABLE public.designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SHIFTS / WEEK OFF ============
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:30',
  end_time TIME NOT NULL DEFAULT '18:30',
  grace_minutes INT NOT NULL DEFAULT 15,
  half_day_after_minutes INT NOT NULL DEFAULT 240,
  full_day_minimum_minutes INT NOT NULL DEFAULT 480,
  overtime_after_minutes INT NOT NULL DEFAULT 540,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.week_off_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- bit-flags Sun..Sat (0=off,1=working) for full-day off; we keep a simple jsonb {sun:true,...} where true means off
  off_days JSONB NOT NULL DEFAULT '{"sun":true,"mon":false,"tue":false,"wed":false,"thu":false,"fri":false,"sat":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ EMPLOYEES ============
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID UNIQUE, -- links to auth.users.id (nullable until invited)
  employee_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  gender TEXT,
  date_of_birth DATE,
  branch_id UUID REFERENCES public.branches(id),
  department_id UUID REFERENCES public.departments(id),
  designation_id UUID REFERENCES public.designations(id),
  reporting_manager_id UUID REFERENCES public.employees(id),
  shift_id UUID REFERENCES public.shifts(id),
  week_off_policy_id UUID REFERENCES public.week_off_policies(id),
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE,
  status public.employee_status NOT NULL DEFAULT 'active',
  bank_name TEXT, bank_account TEXT, bank_ifsc TEXT,
  pan_number TEXT, aadhaar_number TEXT,
  uan_number TEXT, esi_number TEXT,
  salary_type public.employee_salary_type NOT NULL DEFAULT 'monthly',
  ctc_annual NUMERIC(14,2) NOT NULL DEFAULT 0,
  address TEXT,
  photo_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, employee_code)
);
CREATE INDEX idx_emp_org ON public.employees(organization_id);
CREATE INDEX idx_emp_user ON public.employees(user_id);
CREATE INDEX idx_emp_dept ON public.employees(department_id);
CREATE TRIGGER trg_emp_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- ============ HOLIDAYS ============
CREATE TABLE public.holiday_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  holiday_group_id UUID REFERENCES public.holiday_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hol_date ON public.holidays(organization_id, holiday_date);

-- ============ LEAVES ============
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- e.g. CL, SL, PL, LOP
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  yearly_quota NUMERIC(6,2) NOT NULL DEFAULT 0,
  monthly_accrual NUMERIC(6,3) NOT NULL DEFAULT 0,
  carry_forward BOOLEAN NOT NULL DEFAULT false,
  max_carry_forward NUMERIC(6,2) NOT NULL DEFAULT 0,
  allow_half_day BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INT NOT NULL,
  opening NUMERIC(6,2) NOT NULL DEFAULT 0,
  accrued NUMERIC(6,2) NOT NULL DEFAULT 0,
  used NUMERIC(6,2) NOT NULL DEFAULT 0,
  balance NUMERIC(6,2) GENERATED ALWAYS AS (opening + accrued - used) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  total_days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status public.leave_request_status NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leavereq_emp ON public.leave_requests(employee_id);

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'absent',
  shift_id UUID REFERENCES public.shifts(id),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  total_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  check_in_location JSONB,
  check_out_location JSONB,
  device_meta JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);
CREATE INDEX idx_att_emp_date ON public.attendance_records(employee_id, attendance_date);
CREATE INDEX idx_att_org_date ON public.attendance_records(organization_id, attendance_date);
CREATE TRIGGER trg_att_upd BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.attendance_regularizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  requested_status public.attendance_status NOT NULL,
  requested_check_in TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status public.regularization_status NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SALARY / PAYROLL ============
CREATE TABLE public.salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- BASIC, HRA, CONV, SPL, PF, ESI, PT, TDS, ...
  name TEXT NOT NULL,
  type public.salary_component_type NOT NULL,
  calc_type public.salary_calc_type NOT NULL DEFAULT 'fixed',
  default_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_lop_applicable BOOLEAN NOT NULL DEFAULT true, -- whether prorated by attendance
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE public.employee_salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  ctc_monthly NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ess_emp ON public.employee_salary_structures(employee_id);

CREATE TABLE public.salary_component_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES public.employee_salary_structures(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.salary_components(id),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_scv_struct ON public.salary_component_values(structure_id);

CREATE TABLE public.payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Oct 2025 (26 Sep – 25 Oct)"
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  pay_date DATE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, cycle_start, cycle_end)
);

CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
  status public.payroll_run_status NOT NULL DEFAULT 'draft',
  total_employees INT NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  working_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  payable_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  present_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  paid_leave_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  lop_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  week_offs NUMERIC(5,2) NOT NULL DEFAULT 0,
  holidays NUMERIC(5,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  earnings JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{code,name,amount}]
  deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
  gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);
CREATE INDEX idx_pri_run ON public.payroll_run_items(payroll_run_id);
CREATE INDEX idx_pri_emp ON public.payroll_run_items(employee_id);

CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id),
  pdf_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_item_id)
);

CREATE TABLE public.payslip_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | failed | retried
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ MISC ============
CREATE TABLE public.loans_and_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  monthly_deduction NUMERIC(14,2) NOT NULL,
  remaining NUMERIC(14,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  bill_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  channel TEXT NOT NULL DEFAULT 'in_app', -- in_app | email
  status TEXT NOT NULL DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org ON public.audit_logs(organization_id, created_at DESC);

CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ AUTH PROFILE TRIGGER ============
-- Auto-create employee mapping when an existing employee email signs up,
-- OR insert a placeholder profile row when not.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  -- If an employee with this email exists and has no user_id, link it
  UPDATE public.employees SET user_id = NEW.id
   WHERE lower(email) = lower(NEW.email) AND user_id IS NULL
  RETURNING organization_id INTO v_org;

  IF v_org IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, organization_id, role)
    VALUES (NEW.id, v_org, 'employee')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_off_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_component_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans_and_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/update their own
CREATE POLICY "own profile read"  ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles: user can read own roles; admins manage
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));

-- Generic helper: org-scoped read for any authenticated org member; admin/hr write
-- We use a macro pattern: explicit policies per table for clarity.

-- ORG-LEVEL TABLES (authenticated members of org can read; admins manage)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','branches','departments','designations','shifts','week_off_policies',
    'holiday_groups','holidays','leave_types','salary_components','payroll_cycles','app_settings'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT TO authenticated
      USING (
        %2$s
      );
    $f$, t,
      CASE WHEN t='organizations' THEN 'id = public.current_org_id() OR public.has_role(auth.uid(),''super_admin'')'
           ELSE 'organization_id = public.current_org_id() OR public.has_role(auth.uid(),''super_admin'')' END
    );
    EXECUTE format($f$
      CREATE POLICY "admins manage %1$s" ON public.%1$I FOR ALL TO authenticated
      USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
    $f$, t);
  END LOOP;
END $$;

-- EMPLOYEES: employees see self + admins/hr/managers see all in org
CREATE POLICY "self employee" ON public.employees FOR SELECT TO authenticated
USING (user_id = auth.uid()
       OR (organization_id = public.current_org_id() AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[])));
CREATE POLICY "admins manage employees" ON public.employees FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- LEAVE BALANCES: self + hr/admin
CREATE POLICY "self balances" ON public.leave_balances FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));
CREATE POLICY "admins manage balances" ON public.leave_balances FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- LEAVE REQUESTS: self read & insert; managers/hr/admin read all in org & update
CREATE POLICY "self read leave" ON public.leave_requests FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));
CREATE POLICY "self insert leave" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "self cancel leave" ON public.leave_requests FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (true);

-- ATTENDANCE: self read+insert; admins/hr/managers read all & manage
CREATE POLICY "self read attendance" ON public.attendance_records FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));
CREATE POLICY "self upsert attendance" ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "self update own attendance" ON public.attendance_records FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (true);
CREATE POLICY "admins manage attendance" ON public.attendance_records FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- REGULARIZATIONS: self insert/read; managers/hr/admin manage
CREATE POLICY "self read reg" ON public.attendance_regularizations FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]));
CREATE POLICY "self insert reg" ON public.attendance_regularizations FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "managers update reg" ON public.attendance_regularizations FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr','manager']::public.app_role[]))
WITH CHECK (true);

-- SALARY STRUCTURES + values: self read; hr/admin manage
CREATE POLICY "self read structure" ON public.employee_salary_structures FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin manage structure" ON public.employee_salary_structures FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "self read scv" ON public.salary_component_values FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employee_salary_structures s
          WHERE s.id = structure_id
            AND (s.employee_id = public.current_employee_id()
                 OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[])))
);
CREATE POLICY "admin manage scv" ON public.salary_component_values FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- PAYROLL RUNS / ITEMS / PAYSLIPS: self read own item & payslip; hr/admin manage
CREATE POLICY "org read runs" ON public.payroll_runs FOR SELECT TO authenticated
USING (organization_id = public.current_org_id());
CREATE POLICY "admin manage runs" ON public.payroll_runs FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "self read pri" ON public.payroll_run_items FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin manage pri" ON public.payroll_run_items FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "self read payslip" ON public.payslips FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id()
       OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin manage payslip" ON public.payslips FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "admin read email logs" ON public.payslip_email_logs FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin manage email logs" ON public.payslip_email_logs FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- LOANS / REIMB: self read; admin manage
CREATE POLICY "self read loans" ON public.loans_and_advances FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin loans" ON public.loans_and_advances FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "self reimb" ON public.reimbursements FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "self insert reimb" ON public.reimbursements FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "admin reimb" ON public.reimbursements FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

-- NOTIFICATIONS / AUDIT: read own / admins
CREATE POLICY "self notif" ON public.notification_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));
CREATE POLICY "admin notif" ON public.notification_logs FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','hr']::public.app_role[]));

CREATE POLICY "admin audit" ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[]));
