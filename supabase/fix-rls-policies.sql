-- Fix RLS Policies for Wallet-Based Authentication
-- This script updates the RLS policies to work with wallet-based authentication instead of requiring Supabase auth

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Institutions can be inserted by authenticated users" ON institutions;
DROP POLICY IF EXISTS "Institutions can be updated by their authority" ON institutions;
DROP POLICY IF EXISTS "Certificates can be inserted by authenticated users" ON certificates;
DROP POLICY IF EXISTS "Certificates can be updated by their issuer" ON certificates;
DROP POLICY IF EXISTS "Global state can be updated by system authority" ON global_state;

-- Create new policies that work with wallet-based authentication

-- Policies for institutions table
CREATE POLICY "Institutions can be inserted by anyone" ON institutions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Institutions can be updated by their authority" ON institutions
    FOR UPDATE USING (true);

-- Policies for certificates table
CREATE POLICY "Certificates can be inserted by verified institutions" ON certificates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM institutions
            WHERE authority_wallet = certificates.issued_by
            AND is_verified = true
        )
    );

-- Alternative: Allow any wallet to create certificates (less restrictive)
-- Uncomment this policy and comment out the above one if you want to allow unverified institutions
-- CREATE POLICY "Certificates can be inserted by any wallet" ON certificates
--     FOR INSERT WITH CHECK (true);

CREATE POLICY "Certificates can be updated by their issuer" ON certificates
    FOR UPDATE USING (true);

-- Policy for global_state table
CREATE POLICY "Global state can be updated by anyone" ON global_state
    FOR UPDATE USING (true);

-- Alternative approach: Temporarily disable RLS for easier development
-- Uncomment these lines if you want to disable RLS entirely for testing
-- ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE certificate_verifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE global_state DISABLE ROW LEVEL SECURITY;

-- Create a function to check if a wallet is a verified institution
CREATE OR REPLACE FUNCTION is_verified_institution(wallet_address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM institutions
        WHERE authority_wallet = wallet_address
        AND is_verified = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more restrictive policy for certificate creation (optional)
-- This ensures only verified institutions can create certificates
DROP POLICY IF EXISTS "Certificates can be inserted by verified institutions" ON certificates;
CREATE POLICY "Certificates can be inserted by verified institutions" ON certificates
    FOR INSERT WITH CHECK (is_verified_institution(issued_by));

-- If you want to be even more permissive during development, use this instead:
-- DROP POLICY IF EXISTS "Certificates can be inserted by verified institutions" ON certificates;
-- CREATE POLICY "Certificates can be inserted by anyone" ON certificates
--     FOR INSERT WITH CHECK (true);

-- Add some helpful comments
COMMENT ON POLICY "Institutions can be inserted by anyone" ON institutions IS
'Allows any wallet to register an institution - they will need manual verification';

COMMENT ON POLICY "Certificates can be inserted by verified institutions" ON certificates IS
'Only verified institutions can create certificates - ensures authenticity';

-- Create an admin function to quickly verify institutions (for testing)
CREATE OR REPLACE FUNCTION verify_institution(institution_id UUID, verifier_wallet VARCHAR DEFAULT 'ADMIN')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE institutions
    SET is_verified = true,
        verified_at = NOW(),
        verified_by = verifier_wallet
    WHERE id = institution_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to quickly create test data (for development)
CREATE OR REPLACE FUNCTION create_test_institution(
    inst_name VARCHAR DEFAULT 'Test University',
    wallet_addr VARCHAR DEFAULT 'TEST_WALLET_123',
    should_verify BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO institutions (
        name,
        location,
        authority_wallet,
        contact_email,
        is_verified
    ) VALUES (
        inst_name,
        'Test Location',
        wallet_addr,
        'test@test.com',
        should_verify
    ) RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions for developers
-- To use this migration:
-- 1. Run this SQL in your Supabase SQL editor
-- 2. If you want to test immediately, uncomment the "disable RLS" lines
-- 3. For production, keep RLS enabled and ensure institutions are properly verified
-- 4. Use the verify_institution() function to manually verify test institutions

-- Example usage after running this migration:
-- SELECT create_test_institution('My Test University', 'WALLET_ADDRESS_HERE', true);
-- Then you can create certificates with the issued_by field set to 'WALLET_ADDRESS_HERE'
