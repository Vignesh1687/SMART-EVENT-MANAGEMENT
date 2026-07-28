-- Backfill missing register_number and department values for existing profiles
-- Uses auth.users metadata where available.

BEGIN;

-- Update existing profile rows from auth.users.raw_user_meta_data
UPDATE public.profiles p
SET
  register_number = COALESCE(NULLIF(u.raw_user_meta_data->>'register_number', ''), p.register_number),
  department = COALESCE(NULLIF(u.raw_user_meta_data->>'department', ''), p.department)
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.register_number IS NULL OR p.register_number = '' OR p.department IS NULL OR p.department = '')
  AND (
    u.raw_user_meta_data->>'register_number' IS NOT NULL
    OR u.raw_user_meta_data->>'department' IS NOT NULL
  );

-- Insert any missing profiles for auth users that have raw_user_meta_data but no profile row yet
INSERT INTO public.profiles (user_id, full_name, register_number, department)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), ''),
  NULLIF(u.raw_user_meta_data->>'register_number', ''),
  NULLIF(u.raw_user_meta_data->>'department', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
  AND (
    u.raw_user_meta_data->>'register_number' IS NOT NULL
    OR u.raw_user_meta_data->>'department' IS NOT NULL
  );

COMMIT;
