-- Migration: Add student_wallet column to certificates table
-- This script safely adds the student_wallet column to existing certificates table

BEGIN;

-- Add the student_wallet column to certificates table
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS student_wallet VARCHAR(44);

-- Create index for better performance on student_wallet queries
CREATE INDEX IF NOT EXISTS idx_certificates_student_wallet
ON certificates(student_wallet);

-- Update existing certificates to have a placeholder student wallet
-- In production, you should update these with actual student wallet addresses
UPDATE certificates
SET student_wallet = 'PLACEHOLDER_STUDENT_WALLET_' || id::text
WHERE student_wallet IS NULL;

-- After updating existing records, make the column NOT NULL
-- Comment out the next line if you want to keep it nullable for now
-- ALTER TABLE certificates ALTER COLUMN student_wallet SET NOT NULL;

-- Update the RLS policy to allow students to view their own certificates
DROP POLICY IF EXISTS "Students can view their own certificates" ON certificates;

CREATE POLICY "Students can view their own certificates" ON certificates
    FOR SELECT USING (student_wallet = auth.jwt() ->> 'wallet_address');

-- Update the get_certificate_by_id function to include student_wallet
CREATE OR REPLACE FUNCTION get_certificate_by_id(cert_id UUID)
RETURNS TABLE(
    id UUID,
    student_name VARCHAR,
    roll_no VARCHAR,
    course_name VARCHAR,
    grade VARCHAR,
    certificate_id VARCHAR,
    institution_name VARCHAR,
    issued_by VARCHAR,
    student_wallet VARCHAR,
    issued_date DATE,
    certificate_hash VARCHAR,
    is_revoked BOOLEAN,
    verification_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.student_name, c.roll_no, c.course_name, c.grade,
           c.certificate_id, c.institution_name, c.issued_by, c.student_wallet, c.issued_date,
           c.certificate_hash, c.is_revoked, c.verification_count, c.created_at
    FROM certificates c
    WHERE c.id = cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Verification queries to check the migration
-- Uncomment to run these checks:

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'certificates' AND column_name = 'student_wallet';

-- SELECT COUNT(*) as total_certificates,
--        COUNT(student_wallet) as certificates_with_student_wallet,
--        COUNT(*) - COUNT(student_wallet) as certificates_missing_student_wallet
-- FROM certificates;
