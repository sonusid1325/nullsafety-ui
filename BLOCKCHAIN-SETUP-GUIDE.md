# Blockchain Certificate Verification System Setup Guide

This guide will help you set up and deploy the blockchain-integrated certificate verification system using Solana.

## Overview

The system consists of:
- **Solana Program**: Smart contract deployed at `BssezJKJhhZfQo6EWUHVrfonpdJba54ptgRyG4v5wzb3`
- **Frontend Application**: Next.js app with Solana wallet integration
- **Devnet Deployment**: Currently deployed on Solana Devnet

## Prerequisites

1. **Node.js** (v18 or later)
2. **npm** or **yarn**
3. **Solana Wallet** (Phantom, Solflare, etc.)
4. **Devnet SOL** for testing

## Installation

1. **Clone and Install Dependencies**
```bash
cd nullsafety-ui
npm install
```

2. **Environment Setup**
The system is pre-configured for Devnet. No additional environment variables needed.

## System Architecture

### Smart Contract (Solana Program)
- **Program ID**: `BssezJKJhhZfQo6EWUHVrfonpdJba54ptgRyG4v5wzb3`
- **Network**: Solana Devnet
- **Functions**:
  - `initialize()`: Initialize global system state
  - `register_institution()`: Register educational institutions
  - `issue_certificate()`: Issue certificates on-chain
  - `verify_certificate()`: Verify and increment verification count
  - `revoke_certificate()`: Revoke certificates
  - `verify_institution()`: Admin function to verify institutions

### Frontend Components
- **BlockchainDashboard**: Institution management interface
- **BlockchainVerification**: Certificate verification interface
- **AdminSetup**: System administration panel

## Getting Started

### 1. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`

### 2. Connect Your Wallet
- Install a Solana wallet (Phantom recommended)
- Connect to Devnet in wallet settings
- Get devnet SOL from a faucet or use the built-in airdrop feature

### 3. System Initialization (Admin Only)

**Important**: Update admin wallet addresses in the code before deployment:

1. Edit `src/components/AdminSetup.tsx`:
```typescript
const SYSTEM_ADMIN_WALLETS = [
  "YOUR_ADMIN_WALLET_ADDRESS_HERE",
  // Add more admin wallets as needed
];
```

2. Navigate to `/admin-setup`
3. Connect your admin wallet
4. Click "Initialize System" (only needs to be done once)

### 4. Institution Registration

Navigate to `/blockchain-dashboard`:
1. Connect your institution's wallet
2. Click "Register Institution"
3. Fill in institution details
4. Submit transaction

### 5. Certificate Issuance

After registration:
1. Go to `/blockchain-dashboard`
2. Click "Issue Certificate"
3. Fill in student and course details
4. Submit transaction

### 6. Certificate Verification

Navigate to `/blockchain-verify`:
1. Enter certificate address
2. View certificate details and verification status
3. Connect wallet to record verification (optional)

## Key Features

### Blockchain Integration
- **Immutable Records**: All certificates stored on Solana blockchain
- **Transparent Verification**: Anyone can verify certificate authenticity
- **Decentralized**: No single point of failure
- **Cost-Effective**: Low transaction fees on Solana

### Security Features
- **Program Derived Addresses (PDAs)**: Deterministic account addresses
- **Access Controls**: Institution-only certificate issuance
- **Revocation Support**: Institutions can revoke certificates
- **Admin Controls**: System-level administration functions

### User Experience
- **Wallet Integration**: Seamless Solana wallet connection
- **Real-time Updates**: Live blockchain state updates
- **Explorer Links**: Direct links to Solana Explorer
- **Responsive Design**: Mobile-friendly interface

## API Reference

### Smart Contract Functions

#### `initialize()`
Initializes the global system state. Must be called once by admin.
- **Access**: Admin only
- **Returns**: Global state account

#### `register_institution(name: string, location: string)`
Registers a new educational institution.
- **Parameters**: 
  - `name`: Institution name
  - `location`: Institution location
- **Returns**: Institution account

#### `issue_certificate(student_name: string, course_name: string, grade: string, certificate_id: string)`
Issues a new certificate on the blockchain.
- **Access**: Registered institutions only
- **Parameters**:
  - `student_name`: Name of the student
  - `course_name`: Name of the course
  - `grade`: Grade achieved
  - `certificate_id`: Unique certificate identifier
- **Returns**: Certificate account

#### `verify_certificate()`
Records a certificate verification (increments counter).
- **Access**: Anyone
- **Returns**: Updated certificate account

#### `revoke_certificate()`
Revokes a certificate.
- **Access**: Issuing institution only
- **Returns**: Updated certificate account

### Frontend Hooks

#### `useTransactions()`
Main hook for blockchain transactions:
```typescript
const {
  loading,
  initializeSystem,
  registerInstitution,
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  error,
  clearError
} = useTransactions();
```

#### `useGlobalState()`
Get global system statistics:
```typescript
const { globalState, loading, error } = useGlobalState();
```

#### `useInstitution(authority?: PublicKey)`
Get institution data:
```typescript
const { institution, loading, isRegistered } = useInstitution();
```

#### `useCertificates(institutionAuthority?: PublicKey)`
Get certificates for an institution:
```typescript
const { certificates, loading, refetch } = useCertificates();
```

## Deployment

### Development Deployment
The system is already configured for Devnet deployment. Simply run:
```bash
npm run build
npm start
```

### Production Deployment
For production deployment:

1. **Update Network Configuration**: 
   - Change RPC endpoint to mainnet
   - Update program ID if deploying new contract
   - Update admin wallet addresses

2. **Deploy to Hosting Platform**:
   ```bash
   # Example for Vercel
   npm run build
   vercel deploy
   ```

3. **Update Smart Contract** (if needed):
   - Deploy program to mainnet
   - Update program ID in codebase
   - Initialize system on mainnet

## Troubleshooting

### Common Issues

#### "Program not initialized" Error
- Solution: Run system initialization from admin panel
- Check: Admin wallet address is correct

#### "Insufficient SOL" Error
- Solution: Add more SOL to wallet
- For Devnet: Use airdrop feature

#### "Certificate not found" Error
- Solution: Verify certificate address is correct
- Check: Certificate exists on current network (devnet/mainnet)

#### Transaction Timeouts
- Solution: Increase wallet timeout settings
- Check: Network congestion and retry

### Debug Tools

1. **Solana Explorer**: View transactions and accounts
   - Devnet: `https://explorer.solana.com/?cluster=devnet`
   - Mainnet: `https://explorer.solana.com/`

2. **Browser Console**: Check for JavaScript errors
3. **Network Tab**: Monitor RPC calls
4. **Wallet Logs**: Check wallet connection issues

## Performance Considerations

### Optimization Tips
- **Batch Operations**: Group multiple transactions when possible
- **Connection Management**: Reuse RPC connections
- **State Management**: Cache frequently accessed data
- **Error Handling**: Implement proper retry mechanisms

### Scaling
- **RPC Providers**: Consider premium RPC providers for production
- **Caching**: Implement client-side caching for better UX
- **Load Balancing**: Distribute requests across multiple RPC endpoints

## Security Best Practices

### Wallet Security
- Never share private keys
- Use hardware wallets for high-value operations
- Verify transaction details before signing

### Smart Contract Security
- Audit contract code before mainnet deployment
- Implement proper access controls
- Use established patterns and libraries

### Frontend Security
- Validate all user inputs
- Sanitize data before blockchain interactions
- Implement proper error handling

## Support and Maintenance

### Monitoring
- Monitor RPC endpoint health
- Track transaction success rates
- Monitor wallet connection issues
- Check for smart contract updates

### Updates
- Keep dependencies updated
- Monitor Solana network upgrades
- Update wallet adapters as needed
- Review and update security practices

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Resources

- **Solana Documentation**: https://docs.solana.com/
- **Anchor Framework**: https://www.anchor-lang.com/
- **Solana Wallet Adapter**: https://github.com/solana-labs/wallet-adapter
- **Next.js Documentation**: https://nextjs.org/docs

## License

This project is open source. See LICENSE file for details.

---

## Quick Start Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Update admin wallet addresses in code
- [ ] Start development server (`npm run dev`)
- [ ] Connect wallet to Devnet
- [ ] Get Devnet SOL (airdrop or faucet)
- [ ] Initialize system (admin only)
- [ ] Register institution
- [ ] Issue test certificate
- [ ] Verify certificate functionality

For additional help, check the troubleshooting section or open an issue in the repository.