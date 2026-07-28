-- Ensure new user profile creation stores register number and department from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, register_number, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'register_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'department', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
END$$;

DO $$ BEGIN
  UPDATE public.profiles p
  SET
    register_number = COALESCE(NULLIF(u.raw_user_meta_data->>'register_number', ''), p.register_number),
    department = COALESCE(NULLIF(u.raw_user_meta_data->>'department', ''), p.department)
  FROM auth.users u
  WHERE p.user_id = u.id
    AND (p.register_number IS NULL OR p.register_number = '' OR p.department IS NULL OR p.department = '');
END$$;
