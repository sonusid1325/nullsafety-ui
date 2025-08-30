# 🔧 Troubleshooting Guide - NullSafety Registration Issues

This guide helps you diagnose and fix common issues with university registration in the NullSafety Certificate Verification System.

## 🚨 Common Registration Errors

### "Failed to register institution. Please try again."

This is a generic error that can have several causes. Follow these steps to diagnose:

#### Step 1: Enable Debug Mode
1. Go to `/register-university`
2. Connect your wallet
3. Click "Debug Mode" in the top-right of the registration form
4. Click "Test Database Connection"
5. Check the status message

#### Step 2: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to register again
4. Look for detailed error messages

#### Step 3: Common Causes & Solutions

**Database Connection Issues:**
```
Error: Failed to fetch
Solution: Check your internet connection and Supabase status
```

**Missing Environment Variables:**
```
Error: supabaseUrl is required
Solution: Verify .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Table Structure Issues:**
```
Error: Column 'verification_requested_at' doesn't exist
Solution: Update your database schema (see Database Setup section)
```

**RLS Policy Issues:**
```
Error: new row violates row-level security policy
Solution: Check Supabase RLS policies (see RLS Setup section)
```

### "This wallet is already registered"

**Cause:** The wallet address is already associated with an institution.

**Solutions:**
1. **Use Different Wallet:** Connect a different wallet for the new institution
2. **Check Existing Registration:** Go to `/dashboard` to see your current institution
3. **Contact Admin:** If this is an error, contact support to reset your registration

### Form Validation Errors

**"Institution name is required"**
- Ensure the institution name field is not empty
- Remove leading/trailing spaces

**"Please enter a valid email address"**
- Use format: `name@domain.com`
- Avoid special characters in the local part

**"Please enter a valid establishment year"**
- Use a year between 1800 and current year
- Leave empty if unknown

## 🗄️ Database Setup Issues

### Missing Table or Columns

If you get errors about missing columns, your database schema may be outdated.

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Check if institutions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'institutions';

-- Add missing columns if they don't exist
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'University';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS accreditation VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS verified_by VARCHAR(44);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

### RLS (Row Level Security) Setup

If you get permission errors, set up RLS policies:

```sql
-- Enable RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON institutions
  FOR SELECT USING (true);

-- Allow authenticated inserts
CREATE POLICY "Authenticated insert access" ON institutions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- If the above doesn't work, try this more permissive policy for testing:
CREATE POLICY "Allow all operations" ON institutions
  FOR ALL USING (true) WITH CHECK (true);
```

**⚠️ Security Note:** The last policy is very permissive and should only be used for testing. Remove it in production.

## 🔐 Wallet Connection Issues

### Wallet Not Connecting

**Common Solutions:**
1. **Install Wallet Extension:** Make sure Phantom, Solflare, or another Solana wallet is installed
2. **Unlock Wallet:** Ensure your wallet is unlocked
3. **Refresh Page:** Sometimes a simple refresh fixes connection issues
4. **Try Different Wallet:** Some wallets work better than others
5. **Check Network:** Ensure you're on the correct Solana network (devnet for testing)

### Wallet Address Issues

**Check Wallet Address Format:**
- Should be 32-44 characters
- Only contains letters and numbers
- Example: `DXyZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF`

## 🌐 Network and Connection Issues

### Slow or Failed Requests

1. **Check Internet Connection:** Ensure stable internet
2. **Supabase Status:** Check [status.supabase.com](https://status.supabase.com)
3. **Try Different Network:** Use mobile hotspot to test
4. **Clear Browser Cache:** Clear cache and cookies
5. **Disable Extensions:** Try with browser extensions disabled

### CORS Errors

If you see CORS errors in the console:

1. **Check Environment Variables:** Ensure correct Supabase URL
2. **Supabase Settings:** Verify allowed origins in Supabase dashboard
3. **Local Development:** Use `localhost:3000` not `127.0.0.1:3000`

## 🧪 Testing and Debugging

### Manual Database Testing

Test your database connection manually:

```javascript
// Open browser console and run:
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY')

// Test connection
supabase.from('institutions').select('*').limit(1).then(console.log)
```

### Form Data Validation

Check if your form data is valid:

```javascript
// In browser console while on registration page:
console.log('Form data:', formData);
console.log('Wallet:', publicKey?.toString());
console.log('Required fields filled:', {
  name: !!formData.name,
  location: !!formData.location,
  email: !!formData.contact_email
});
```

## 🔄 Step-by-Step Registration Test

Follow these steps to systematically test registration:

### 1. Environment Check
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] No trailing spaces in environment variables

### 2. Database Check
- [ ] Supabase project is active
- [ ] `institutions` table exists
- [ ] All required columns are present
- [ ] RLS policies allow inserts

### 3. Wallet Check
- [ ] Wallet extension installed
- [ ] Wallet is unlocked
- [ ] Connected to correct network
- [ ] Wallet address is valid format

### 4. Form Check
- [ ] All required fields filled
- [ ] Email format is valid
- [ ] No special characters in problematic fields
- [ ] Institution name is unique (if required)

### 5. Network Check
- [ ] Internet connection is stable
- [ ] No firewall blocking Supabase
- [ ] No VPN interfering
- [ ] Browser allows cross-origin requests

## 🆘 Emergency Solutions

### Quick Fix for Testing

If you need to test quickly and registration keeps failing:

1. **Disable RLS temporarily:**
```sql
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
```

2. **Insert manually:**
```sql
INSERT INTO institutions (
  name, location, authority_wallet, contact_email, is_verified
) VALUES (
  'Test University', 
  'Test City', 
  'YOUR_WALLET_ADDRESS', 
  'test@test.edu', 
  true
);
```

3. **Re-enable RLS after testing:**
```sql
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
```

### Reset Registration

If you need to start over:

```sql
-- Remove your institution (replace with your wallet address)
DELETE FROM institutions 
WHERE authority_wallet = 'YOUR_WALLET_ADDRESS';
```

## 📊 Monitoring and Logs

### Supabase Logs

Check logs in Supabase dashboard:
1. Go to your Supabase project
2. Navigate to "Logs" section
3. Look for API logs around the time of your registration attempt
4. Check for error messages or failed requests

### Browser Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Try registration again
4. Look for failed requests (red status)
5. Click on failed requests to see error details

## 🎯 Success Indicators

You'll know registration worked when:

- [ ] Form submits without errors
- [ ] Success message appears
- [ ] Redirected to success page
- [ ] Entry appears in Supabase `institutions` table
- [ ] `/dashboard` shows "pending verification" status

## 📞 Getting Help

If none of these solutions work:

1. **Gather Information:**
   - Browser console errors
   - Network request details
   - Database logs from Supabase
   - Form data you're trying to submit

2. **Check Documentation:**
   - README.md for setup instructions
   - UNIVERSITY-GUIDE.md for detailed process
   - QUICKSTART.md for basic setup

3. **Test Environment:**
   - Try on different browser
   - Test on different device
   - Use different wallet
   - Try different network connection

4. **Contact Support:**
   - Include all error messages
   - Specify your browser and OS
   - Mention steps you've already tried

---

## 🎉 Common Success Stories

**"It worked after I..."**

- Cleared my browser cache and cookies
- Used a different wallet (Phantom instead of Solflare)
- Added the missing columns to my database
- Fixed my environment variables (had extra spaces)
- Disabled RLS temporarily for testing
- Used the correct Supabase URL (was using wrong project)
- Refreshed the page after connecting wallet

**Remember:** Most registration issues are caused by database setup, environment variables, or wallet connection problems. Work through the checklist systematically!

---

**Built by Team NullSafety - We're here to help! 🛠️**