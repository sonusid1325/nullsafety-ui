-- Quick Development Fix: Disable RLS Temporarily
-- This script disables RLS policies to allow immediate testing
-- WARNING: Only use this for development/testing purposes

-- Disable RLS on all tables
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_state DISABLE ROW LEVEL SECURITY;

-- Add some comments
COMMENT ON TABLE institutions IS 'RLS DISABLED FOR DEVELOPMENT - Remember to re-enable for production';
COMMENT ON TABLE certificates IS 'RLS DISABLED FOR DEVELOPMENT - Remember to re-enable for production';
COMMENT ON TABLE certificate_verifications IS 'RLS DISABLED FOR DEVELOPMENT - Remember to re-enable for production';
COMMENT ON TABLE global_state IS 'RLS DISABLED FOR DEVELOPMENT - Remember to re-enable for production';

-- Create a function to re-enable RLS when ready for production
CREATE OR REPLACE FUNCTION enable_rls_for_production()
RETURNS TEXT AS $$
BEGIN
    -- Re-enable RLS
    ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE global_state ENABLE ROW LEVEL SECURITY;

    -- Clear the development comments
    COMMENT ON TABLE institutions IS NULL;
    COMMENT ON TABLE certificates IS NULL;
    COMMENT ON TABLE certificate_verifications IS NULL;
    COMMENT ON TABLE global_state IS NULL;

    RETURN 'RLS has been re-enabled for all tables. Make sure proper policies are in place.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Print instructions
SELECT 'RLS has been disabled for development. Certificate creation should now work.' AS status;
SELECT 'To re-enable RLS later, run: SELECT enable_rls_for_production();' AS instructions;

-- Optional: Create a test institution if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM institutions LIMIT 1) THEN
        INSERT INTO institutions (
            name,
            location,
            authority_wallet,
            contact_email,
            is_verified,
            type
        ) VALUES (
            'Test University',
            'Test City, Test State',
            'TEST_WALLET_ADDRESS_REPLACE_WITH_REAL',
            'admin@testuniversity.edu',
            true,
            'University'
        );

        RAISE NOTICE 'Created test institution. Update the authority_wallet with your actual wallet address.';
    END IF;
END
$$;

-- Show current table status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled - DEV MODE'
    END as status
FROM pg_tables
WHERE tablename IN ('institutions', 'certificates', 'certificate_verifications', 'global_state')
    AND schemaname = 'public'
ORDER BY tablename;
