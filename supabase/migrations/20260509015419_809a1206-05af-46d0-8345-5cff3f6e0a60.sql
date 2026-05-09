-- Auto-promote the first user to super_admin of the existing (or a fresh) organization.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID;
  v_is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  -- Link to existing employee row by email (if HR pre-created one)
  UPDATE public.employees SET user_id = NEW.id
   WHERE lower(email) = lower(NEW.email) AND user_id IS NULL
  RETURNING organization_id INTO v_org;

  IF v_org IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, organization_id, role)
    VALUES (NEW.id, v_org, 'employee')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Bootstrap: if no admin/super_admin exists anywhere, this user becomes super_admin
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role IN ('super_admin','admin')
  ) INTO v_is_first;

  IF v_is_first THEN
    -- Pick the first organization, or create a default one
    SELECT id INTO v_org FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    IF v_org IS NULL THEN
      INSERT INTO public.organizations(name, legal_name)
      VALUES ('My Company', 'My Company')
      RETURNING id INTO v_org;
    END IF;

    INSERT INTO public.user_roles(user_id, organization_id, role)
    VALUES (NEW.id, v_org, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles(user_id, organization_id, role)
    VALUES (NEW.id, v_org, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();