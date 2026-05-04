$env:SUPABASE_DB_PASSWORD = 'avs7396581364$A'
Write-Host "SUPABASE_DB_PASSWORD set to: $env:SUPABASE_DB_PASSWORD"
npx supabase db query --linked "SELECT id, email, created_at, confirmed_at, raw_user_meta_data FROM auth.users WHERE email LIKE '%@%';"

echo "---"
npx supabase db query --linked "SELECT id, user_id, full_name, register_number, department FROM profiles LIMIT 5;"

echo "---"
npx supabase db query --linked "SELECT id, user_id, role FROM user_roles LIMIT 5;"