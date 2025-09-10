# Certificate Hash Conflict Resolution Guide

This guide provides comprehensive solutions for resolving certificate hash conflicts in your Solana-based certificate verification system.

## 🚨 Issue Description

The error "duplicate key value violates unique constraint 'certificates_certificate_hash_key'" occurs when:
1. Multiple certificates generate the same hash value
2. The hash generation algorithm produces collisions
3. The same certificate data is being processed multiple times

## 🔧 Quick Fix Solutions

### Option 1: Run the Automated Resolution Script

```bash
# Install tsx if not already installed
npm install --save-dev tsx

# Run the hash conflict resolution script
npm run resolve-hash-conflicts

# Or check statistics first
npm run hash-stats
```

### Option 2: Manual Database Fix (SQL)

If you have direct database access, run this SQL to find and resolve conflicts:

```sql
-- Find duplicate hashes
SELECT certificate_hash, COUNT(*) as count
FROM certificates 
GROUP BY certificate_hash 
HAVING COUNT(*) > 1;

-- Update duplicates with new hashes (keep the oldest)
WITH ranked_certs AS (
  SELECT id, certificate_hash, 
         ROW_NUMBER() OVER (PARTITION BY certificate_hash ORDER BY created_at) as rn
  FROM certificates
  WHERE certificate_hash IN (
    SELECT certificate_hash 
    FROM certificates 
    GROUP BY certificate_hash 
    HAVING COUNT(*) > 1
  )
)
UPDATE certificates 
SET certificate_hash = CONCAT(certificate_hash, '_', id::text)
WHERE id IN (
  SELECT id FROM ranked_certs WHERE rn > 1
);
```

### Option 3: Remove Unique Constraint Temporarily

```sql
-- Remove the unique constraint
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_certificate_hash_key;

-- After resolving conflicts, add it back
ALTER TABLE certificates ADD CONSTRAINT certificates_certificate_hash_key UNIQUE (certificate_hash);
```

## 🛠️ Enhanced Implementation

### 1. Updated Hash Generation Algorithm

The enhanced system now includes:

- **Collision Detection**: Checks database before creating certificates
- **Unique Salt Generation**: Uses crypto-secure random bytes
- **Retry Mechanism**: Attempts multiple hash generations if conflicts occur
- **Timestamp Integration**: Includes microsecond timestamps for uniqueness

### 2. Certificate Creation with Enhanced Hashing

```typescript
// Example usage of the enhanced certificate service
import { UnifiedCertificateService } from '@/lib/certificateService';
import { AnchorProvider } from '@coral-xyz/anchor';

const certificateService = new UnifiedCertificateService(provider);

const result = await certificateService.createCertificate({
  studentName: "John Doe",
  rollNo: "2024001",
  courseName: "Computer Science",
  grade: "A+",
  institutionName: "Tech University",
  issuedBy: "Dr. Jane Smith",
  studentWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
}, wallet);

if (result.success) {
  console.log('Certificate created with hash:', result.certificateHash);
  console.log('Blockchain address:', result.blockchainAddress?.toBase58());
} else {
  console.error('Creation failed:', result.error);
}
```

### 3. Hash Verification on Solana Blockchain

```typescript
// Verify certificate hash directly on blockchain
const verificationResult = await certificateService.verifyCertificateHashOnBlockchain(
  "CERT-2024-001",
  institutionPublicKey,
  providedHash,
  wallet
);

console.log('Hash is valid:', verificationResult.isValid);
console.log('On-chain hash:', verificationResult.onChainHash);
```

## 📊 Monitoring and Debugging

### Use the Hash Debugger

```typescript
import { CertificateHashDebugger } from '@/lib/certificateHashDebugger';

// Check if a hash exists
const hashInfo = await CertificateHashDebugger.checkHashExists(hash);
console.log('Hash exists:', hashInfo.exists);
console.log('Is duplicate:', hashInfo.isDuplicate);

// Find all conflicts
const conflicts = await CertificateHashDebugger.findHashConflicts();
console.log('Total conflicts:', conflicts.conflicts.length);

// Get comprehensive statistics
const stats = await CertificateHashDebugger.getHashStatistics();
console.log('Hash collision rate:', stats.hashCollisionRate);
```

### React Component for Hash Management

```typescript
import CertificateHashManager from '@/components/CertificateHashManager';

function App() {
  return (
    <CertificateHashManager 
      certificateService={certificateService}
    />
  );
}
```

This component provides:
- Certificate creation with blockchain hash storage
- Real-time hash verification
- Batch operations for multiple certificates
- Institution certificate management

## 🔐 Security Features

### 1. Enhanced Hash Generation

- **SHA-256**: Cryptographically secure hashing
- **Salt Integration**: Prevents rainbow table attacks
- **Timestamp Inclusion**: Ensures temporal uniqueness
- **Collision Detection**: Proactive duplicate prevention

### 2. Blockchain Integration

- **On-chain Storage**: Certificate hashes stored on Solana
- **Immutable Records**: Blockchain provides tamper-proof storage
- **Metadata Support**: Additional certificate data stored with hashes
- **Verification Tracking**: Record verification attempts on-chain

### 3. Data Integrity

```typescript
// Integrity checking between Supabase and blockchain
import { CertificateIntegrityChecker } from '@/lib/certificateHashUtils';

const integrity = await CertificateIntegrityChecker.checkIntegrity(
  supabaseData,
  blockchainData
);

console.log('Data is valid:', integrity.isValid);
console.log('Confidence level:', integrity.confidence);
console.log('Discrepancies:', integrity.discrepancies);
```

## 🚀 Best Practices

### 1. Certificate Creation

```typescript
// Always validate data before creation
const validation = certificateService.validateCertificateData(certificateData);
if (!validation.isValid) {
  throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
}

// Use the enhanced service for automatic hash conflict resolution
const result = await certificateService.createCertificate(certificateData, wallet);
```

### 2. Hash Verification

```typescript
// Verify both in database and on blockchain
const result = await certificateService.verifyCertificate(
  certificateId,
  wallet,
  providedHash // Optional hash to verify
);

console.log('Supabase valid:', result.verificationSources.supabase);
console.log('Blockchain valid:', result.verificationSources.blockchain);
console.log('Hash verification:', result.hashVerification);
```

### 3. Batch Operations

```typescript
// Process multiple certificates efficiently
const certificates = [
  { certificateId: "CERT-001", hash: "hash1...", institutionPublicKey: pubkey1 },
  { certificateId: "CERT-002", hash: "hash2...", institutionPublicKey: pubkey2 }
];

const batchResults = await certificateService.batchVerifyCertificateHashes(certificates);
console.log('Verified:', batchResults.verified.length);
console.log('Failed:', batchResults.failed.length);
```

## 🔄 Migration Guide

### For Existing Certificates

1. **Backup existing data**:
   ```bash
   npm run resolve-hash-conflicts --backup
   ```

2. **Resolve conflicts**:
   ```bash
   npm run resolve-hash-conflicts
   ```

3. **Validate resolution**:
   ```bash
   npm run hash-stats
   ```

4. **Update to enhanced service**:
   ```typescript
   // Replace old certificate service usage with enhanced version
   const service = new UnifiedCertificateService(provider);
   ```

### Database Schema Updates

If needed, update your Supabase schema:

```sql
-- Ensure proper indexing for performance
CREATE INDEX IF NOT EXISTS idx_certificate_hash ON certificates(certificate_hash);
CREATE INDEX IF NOT EXISTS idx_certificate_id ON certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_student_wallet ON certificates(student_wallet);

-- Add verification count if not exists
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;
```

## 📈 Performance Optimization

### 1. Hash Generation

- Uses crypto-secure random number generation
- Implements caching for frequently accessed certificates
- Optimized database queries for conflict detection

### 2. Blockchain Integration

- Batch operations reduce transaction costs
- PDA (Program Derived Address) usage for deterministic addressing
- Event-driven architecture for real-time updates

### 3. Database Optimization

```typescript
// Use connection pooling and prepared statements
const { data } = await supabase
  .from('certificates')
  .select('id, certificate_hash')
  .eq('certificate_hash', hash)
  .limit(1)
  .single();
```

## 🆘 Troubleshooting

### Common Issues

1. **Hash conflicts persist**:
   - Run the resolution script multiple times
   - Check for data corruption in certificate fields
   - Verify timestamp generation is working

2. **Blockchain connection issues**:
   - Verify Solana RPC endpoint is accessible
   - Check wallet connectivity and permissions
   - Ensure sufficient SOL balance for transactions

3. **Performance degradation**:
   - Monitor database query performance
   - Check index usage and optimization
   - Consider implementing caching layers

### Debug Commands

```bash
# Check specific certificate
npm run debug-certificate CERT-2024-001

# Analyze hash distribution
npm run hash-stats

# Resolve specific hash conflict
npm run debug-hash abc123def456...
```

## 📞 Support

If issues persist after following this guide:

1. Check the generated backup files in your project root
2. Review console logs for specific error messages
3. Use the debugging utilities to identify the root cause
4. Consider temporarily disabling the unique constraint while resolving conflicts

## 🎯 Next Steps

After resolving the immediate hash conflicts:

1. **Implement monitoring**: Set up alerts for hash conflicts
2. **Regular maintenance**: Schedule periodic hash integrity checks
3. **Performance monitoring**: Track hash generation and verification times
4. **Backup strategy**: Implement automated backups of certificate data
5. **Documentation**: Keep this guide updated with new learnings

## 📝 Summary

The enhanced certificate hash system provides:

- ✅ **Collision-resistant hash generation**
- ✅ **Blockchain-based immutable storage**
- ✅ **Comprehensive verification system**
- ✅ **Automated conflict resolution**
- ✅ **Real-time monitoring and debugging**
- ✅ **Scalable architecture for growth**

Your certificate verification system is now equipped with enterprise-grade hash management and blockchain integration on Solana.