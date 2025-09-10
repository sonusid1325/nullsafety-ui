# RLS Certificate Creation Fix Guide

## Problem
Getting error: `new row violates row-level security policy for table "certificates"` when trying to create certificates.

## Root Cause
The application uses wallet-based authentication, but Supabase RLS policies expect traditional Supabase authentication (`auth.role() = 'authenticated'`).

## Quick Fix (Development Only)

### Option 1: Disable RLS Temporarily
Run this SQL in your Supabase SQL Editor:

```sql
-- Quick development fix - DISABLE RLS
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_state DISABLE ROW LEVEL SECURITY;
```

Or use the prepared script:
```bash
# In Supabase SQL Editor, run:
supabase/quick-dev-fix.sql
```

### Option 2: Update RLS Policies for Wallets
Run this SQL to create wallet-compatible policies:

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Certificates can be inserted by authenticated users" ON certificates;

-- Create new wallet-based policy
CREATE POLICY "Certificates can be inserted by anyone" ON certificates
    FOR INSERT WITH CHECK (true);
```

## Production Fix

### Step 1: Implement Proper RLS Policies
Run the comprehensive fix:

```bash
# In Supabase SQL Editor, run:
supabase/fix-rls-policies.sql
```

This creates policies that:
- Allow institution registration by any wallet
- Only allow certificate creation by verified institutions
- Maintain security while supporting wallet authentication

### Step 2: Verify Institution Status
Ensure your institution is verified before creating certificates:

```sql
-- Check institution verification status
SELECT name, is_verified, authority_wallet 
FROM institutions 
WHERE authority_wallet = 'YOUR_WALLET_ADDRESS';

-- Manually verify an institution (for testing)
SELECT verify_institution('INSTITUTION_ID', 'ADMIN_WALLET');
```

### Step 3: Test Certificate Creation
After fixing policies, test with a simple certificate:

```javascript
const certificateData = {
  student_name: "Test Student",
  roll_no: "TEST001",
  course_name: "Test Course",
  grade: "A",
  certificate_id: `CERT-${Date.now()}`,
  institution_name: "Your Institution",
  issued_by: "YOUR_WALLET_ADDRESS", // Must match verified institution
  issued_date: new Date().toISOString().split('T')[0],
  certificate_hash: `hash-${Date.now()}`,
  is_revoked: false,
};
```

## Troubleshooting Steps

### 1. Check Current RLS Status
```sql
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename IN ('institutions', 'certificates') 
AND schemaname = 'public';
```

### 2. List Current Policies
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('institutions', 'certificates');
```

### 3. Check Institution Registration
```sql
-- Find your institution
SELECT * FROM institutions WHERE authority_wallet = 'YOUR_WALLET_ADDRESS';

-- If not found, register first through the UI or:
INSERT INTO institutions (
  name, location, authority_wallet, contact_email, is_verified
) VALUES (
  'Your Institution', 'Your Location', 'YOUR_WALLET_ADDRESS', 
  'your@email.com', true
);
```

### 4. Test Database Connection
Use the debug page at `/debug` to:
- Test database connectivity
- Verify table structure
- Check RLS policies
- Test certificate creation

## Common Issues & Solutions

### Issue: "Institution not verified"
**Solution:** 
```sql
UPDATE institutions 
SET is_verified = true, verified_at = NOW() 
WHERE authority_wallet = 'YOUR_WALLET_ADDRESS';
```

### Issue: "Certificate ID already exists"
**Solution:** Ensure unique certificate IDs:
```javascript
certificate_id: `CERT-${publicKey.toString().slice(0,8)}-${Date.now()}`
```

### Issue: "Hash collision"
**Solution:** Generate proper unique hashes:
```javascript
certificate_hash: crypto.createHash('sha256')
  .update(`${student_name}-${roll_no}-${Date.now()}`)
  .digest('hex')
```

## Re-enabling RLS (Production)

When ready for production, re-enable RLS with proper policies:

```sql
-- Re-enable RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_state ENABLE ROW LEVEL SECURITY;

-- Ensure proper policies are in place (run fix-rls-policies.sql)
```

## Verification Commands

After implementing fixes, verify everything works:

```sql
-- Test institution access
SELECT COUNT(*) FROM institutions;

-- Test certificate creation (should work without errors)
INSERT INTO certificates (
  student_name, roll_no, course_name, grade, certificate_id,
  institution_name, issued_by, issued_date, certificate_hash
) VALUES (
  'Test Student', 'TEST001', 'Test Course', 'A+', 'CERT-TEST-123',
  'Test Institution', 'YOUR_WALLET_ADDRESS', CURRENT_DATE, 'test-hash-123'
);

-- Clean up test data
DELETE FROM certificates WHERE certificate_id = 'CERT-TEST-123';
```

## Next Steps

1. ✅ Apply quick fix (disable RLS or update policies)
2. ✅ Test certificate creation in the application
3. ✅ Verify institution registration works
4. ✅ Test the debug page functionality
5. ✅ Plan proper wallet authentication for production
6. ✅ Document the authentication flow for your team

## Files Created
- `supabase/quick-dev-fix.sql` - Disables RLS for immediate testing
- `supabase/fix-rls-policies.sql` - Comprehensive policy fixes
- `RLS-CERTIFICATE-FIX.md` - This troubleshooting guide

## Support
If issues persist:
1. Check the debug page at `/debug`
2. Review Supabase logs in the dashboard
3. Verify wallet connectivity
4. Ensure database schema matches the application expectations

Remember: The quick fix (disabling RLS) is for development only. Always implement proper security policies for production!