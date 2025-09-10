# Student Wallet Implementation Guide

## Overview
This document outlines the implementation of the `student_wallet` field in the NullSafety certificate system, enabling proper student-specific certificate filtering and access control.

## Changes Made

### 1. Database Schema Updates

#### Schema Changes
- Added `student_wallet VARCHAR(44) NOT NULL` column to `certificates` table
- Added index `idx_certificates_student_wallet` for performance
- Updated RLS policies for student access control
- Modified `get_certificate_by_id` function to include `student_wallet`

#### Migration Files
- `scripts/add-student-wallet-migration.sql` - SQL migration script
- `scripts/run-migration.mjs` - Node.js script to execute migration

### 2. TypeScript Interface Updates

#### Certificate Interface (`src/lib/supabase.ts`)
```typescript
export interface Certificate {
  // ... existing fields
  student_wallet: string;  // NEW FIELD
  // ... rest of fields
}
```

#### CertificateData Interface (`src/lib/certificateService.ts`)
```typescript
export interface CertificateData {
  // ... existing fields
  studentWallet: string;  // NEW FIELD
  // ... rest of fields
}
```

### 3. Frontend Components

#### Dashboard Updates (`src/app/dashboard/page.tsx`)
- Added `student_wallet` input field to certificate creation form
- Implemented user type detection (university/student/public)
- Added student-specific certificate filtering
- Updated UI to show different content based on user type
- Added Admin Setup link for blockchain initialization

#### Collectables Page (`src/app/collectables/page.tsx`)
- Implemented proper student wallet filtering
- Students now only see certificates issued to their wallet address

### 4. API Route Updates

#### Unified Certificate API (`src/app/api/certificates/unified/route.ts`)
- Added `student_wallet` parameter validation
- Updated certificate creation to include `student_wallet` field

### 5. Certificate Service Enhancements

#### Initialization Checking (`src/lib/certificateService.ts`)
- Added blockchain system initialization check before sync operations
- Enhanced error handling with specific initialization messages
- Improved wallet type conversion helpers

#### Sync Improvements
- Better error messages for uninitialized blockchain systems
- Automatic detection of initialization status
- Clear guidance when admin setup is required

## User Experience Changes

### For Universities (Certificate Issuers)
1. **Certificate Creation Form**: Now includes "Student Wallet Address" field
2. **Dashboard View**: Shows certificates they have issued
3. **Blockchain Sync**: Enhanced error handling with admin setup guidance

### For Students (Certificate Recipients)
1. **Dashboard View**: Shows only certificates issued to their wallet
2. **Collectables Page**: Filtered view of their certificates
3. **Access Control**: Cannot see certificates issued to other students

### For Public Users
1. **Limited Access**: Can view public certificates but not create/manage
2. **Connection Prompts**: Clear guidance to connect wallet for personalized features

## Migration Process

### Prerequisites
```bash
# Ensure environment variables are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Running the Migration
```bash
# Navigate to project root
cd nullsafety-ui

# Install dependencies if needed
npm install

# Run migration (dry run first)
node scripts/run-migration.mjs --dry-run

# Execute actual migration
node scripts/run-migration.mjs
```

### Post-Migration Steps
1. **Update Existing Certificates**: Replace placeholder values with actual student wallet addresses
2. **Test Certificate Creation**: Verify new certificates include student_wallet field
3. **Test Filtering**: Confirm students only see their certificates

## Database Queries

### View Certificate Statistics
```sql
SELECT 
    COUNT(*) as total_certificates,
    COUNT(student_wallet) as certificates_with_student_wallet,
    COUNT(*) - COUNT(student_wallet) as certificates_missing_student_wallet
FROM certificates;
```

### Update Existing Certificates (Example)
```sql
-- Replace with actual student wallet addresses
UPDATE certificates 
SET student_wallet = 'actual_student_wallet_address'
WHERE certificate_id = 'specific_certificate_id';
```

## Security Considerations

### Row Level Security (RLS)
- Students can only view certificates where `student_wallet` matches their authenticated wallet
- Universities can view/manage certificates they issued (`issued_by` field)
- Public read access remains for general certificate verification

### Access Control
- Certificate creation requires valid `student_wallet` address
- API validates all required fields including `student_wallet`
- Frontend enforces user type-based access control

## Error Handling

### Common Issues and Solutions

#### Sync Errors: "Program not initialized"
**Cause**: Blockchain system hasn't been initialized
**Solution**: 
1. Visit `/admin-setup` page
2. Click "Initialize System" button
3. Wait for confirmation
4. Retry sync operation

#### Missing student_wallet Values
**Cause**: Migration created placeholder values
**Solution**: Update certificates with actual student wallet addresses

#### Access Denied for Students
**Cause**: Certificate doesn't have student's wallet address
**Solution**: Verify certificate has correct `student_wallet` value

## Testing Checklist

### Certificate Creation
- [ ] Form includes student_wallet input field
- [ ] Field is required for submission
- [ ] Certificate created with correct student_wallet value
- [ ] Database record includes student_wallet

### Student Access Control
- [ ] Students only see their certificates in dashboard
- [ ] Students only see their certificates in collectables
- [ ] Students cannot see other students' certificates

### University Access
- [ ] Universities see certificates they issued
- [ ] Universities can create certificates with student_wallet
- [ ] Universities can sync certificates to blockchain

### Blockchain Integration
- [ ] Sync operation checks for system initialization
- [ ] Clear error messages for uninitialized system
- [ ] Admin setup link accessible when needed

## Future Enhancements

### Planned Features
1. **Bulk Certificate Import**: CSV import with student wallet addresses
2. **QR Code Generation**: Include student wallet in certificate QR codes
3. **Notification System**: Alert students when certificates are issued
4. **Wallet Verification**: Verify student wallet ownership before issuance

### Performance Optimizations
1. **Caching**: Cache user type detection
2. **Indexing**: Additional indexes for common query patterns
3. **Pagination**: Improve large certificate list handling

## Support and Troubleshooting

### Common Commands
```bash
# Check migration status
node scripts/run-migration.mjs --dry-run

# View database schema
psql -d your_db -c "\d certificates"

# Check certificate count by type
node scripts/check-certificates.mjs
```

### Getting Help
1. Check console errors for specific issues
2. Verify environment variables are set correctly
3. Ensure wallet is connected and has proper permissions
4. Review migration logs for database issues

## Conclusion

The student_wallet implementation provides proper access control and filtering for the certificate system. Students can now view only their certificates, while universities maintain full control over certificates they issue. The enhanced error handling and initialization checking improve the overall user experience and system reliability.