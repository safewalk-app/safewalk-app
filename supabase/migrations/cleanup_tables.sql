-- Cleanup script: Drop all SafeWalk tables
-- Execute this FIRST before running the migration scripts

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS otp_logs CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles CASCADE;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts CASCADE;
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips CASCADE;

-- Confirm cleanup
SELECT 'Cleanup complete - all SafeWalk tables dropped' as status;
