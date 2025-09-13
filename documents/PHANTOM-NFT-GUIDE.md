# Phantom Wallet NFT Integration Guide

## Overview

This guide explains how the EduChain certificate system creates NFTs that are visible in Phantom wallet as collectables.

## The Problem We Solved

Initially, minted certificates weren't visible in Phantom wallet because:

1. **No Student Interface**: The system only had institution dashboards - students had no way to view their owned NFT certificates
2. **Missing Token Metadata**: NFTs were created as simple SPL tokens without proper Metaplex Token Metadata, making them invisible to wallet UIs
3. **No Metadata Accounts**: Phantom requires NFTs to have metadata accounts following the Token Metadata standard

## Solutions Implemented

### 1. Collectables Page (`/collectables`)

Created a dedicated student-facing page where users can:
- Connect their wallet to view owned certificate NFTs
- Verify on-chain ownership by checking token account balances  
- View certificate details (name, course, institution, grade, date)
- Access links to view full certificates and blockchain data
- See Phantom wallet compatibility status

### 2. Proper NFT Metadata Structure

Updated the minting process to create NFTs with:

```javascript
// Standard NFT metadata format
{
  "name": "University Name - Course Name",
  "symbol": "CERT", 
  "description": "Certificate of completion...",
  "image": "https://...",
  "attributes": [
    {"trait_type": "Student Name", "value": "John Doe"},
    {"trait_type": "Course", "value": "Computer Science"},
    {"trait_type": "University", "value": "ABC University"},
    {"trait_type": "Issue Date", "value": "2024-01-15"},
    {"trait_type": "Type", "value": "Academic Certificate"},
    {"trait_type": "Verification", "value": "Blockchain Verified"}
  ]
}
```

### 3. Metaplex Token Metadata Integration

Enhanced the minting process to:

```javascript
// Create metadata account using Metaplex standard
const metadataPda = findMetadataPda(mintKeypair.publicKey);

// Add metadata instruction to transaction
transaction.add(
  createMetadataInstruction(
    metadataPda,
    mintKeypair.publicKey,
    wallet.publicKey,
    "Certificate Name",
    "CERT",
    metadataUri
  )
);
```

### 4. Phantom Compatibility Verification

Added verification system that checks:
- ✅ Metadata account exists
- ✅ Metadata account is owned by Token Metadata program
- ✅ Proper NFT format (0 decimals, supply of 1)
- ✅ Valid metadata URI

## How NFTs Appear in Phantom

### Before (Not Visible)
- Simple SPL tokens with no metadata
- No metadata account
- Invisible to Phantom UI

### After (Visible as Collectables)
- Proper NFT with Metaplex Token Metadata
- Metadata account created on-chain
- Rich metadata with attributes
- Appears in Phantom "Collectables" section

## File Structure

```
src/
├── app/
│   └── collectables/
│       └── page.tsx              # Student collectables interface
├── lib/
│   └── mintCertificateNFT.ts     # Enhanced NFT minting with metadata
└── components/
    └── ui/                       # UI components for collectables page
```

## Key Features

### Collectables Page Features
- **Wallet Connection**: Connect Solana wallet to view NFTs
- **On-Chain Verification**: Verify actual NFT ownership via token accounts
- **Certificate Details**: Display all relevant certificate information
- **Phantom Status**: Show compatibility status with visual indicators
- **Quick Actions**: View certificate page and NFT on Solscan

### Visual Indicators
- 🟢 Green dot: Verified ownership
- 🔵 Blue dot: Phantom wallet compatible  
- 🔴 Red dot: Missing metadata (won't appear in Phantom)
- 🟡 Yellow dot: Ownership pending verification

### NFT Verification Process
1. Query database for certificates with `student_wallet` matching connected wallet
2. For each certificate, check associated token account balance
3. Verify NFT has proper metadata account
4. Display results with compatibility status

## Usage

### For Students
1. Visit `/collectables` 
2. Connect your Phantom wallet
3. View your certificate NFTs
4. Click "View NFT" to see on Solscan
5. Check Phantom wallet's "Collectables" section

### For Institutions  
1. When issuing certificates, ensure student wallet address is provided
2. Mint NFT through certificate page
3. NFT will automatically appear in student's collectables
4. Student can verify ownership on-chain

## Technical Requirements

### Dependencies
```json
{
  "@solana/web3.js": "Latest",
  "@solana/spl-token": "Latest", 
  "@solana/wallet-adapter-react": "Latest"
}
```

### Environment Variables
```bash
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Troubleshooting

### NFT Not Appearing in Phantom

1. **Check Metadata Account**
   - Verify metadata PDA exists on-chain
   - Confirm it's owned by Token Metadata program

2. **Verify NFT Properties**
   - Must have 0 decimals
   - Supply should be 1
   - Must have proper metadata URI

3. **Check Network**
   - Ensure you're on the correct network (devnet/mainnet)
   - Verify wallet is connected to same network

4. **Refresh Phantom**
   - Force refresh Phantom wallet
   - Sometimes takes a few minutes to appear

### Common Issues

**"Database error: Could not find relationship"**
- Fixed by using direct `institution_name` field instead of joins

**"No collectables found"**
- Ensure wallet address matches `student_wallet` in certificates table
- Verify NFT was actually minted (check `nft_mint` field)

**"NFT exists but not in Phantom"**
- Check compatibility status in collectables page
- Missing metadata account is most common cause

## Future Enhancements

1. **IPFS Integration**: Upload metadata to IPFS for better permanence
2. **Collection Support**: Group certificates by institution as collections  
3. **Enhanced Images**: Generate dynamic certificate images
4. **Mobile Optimization**: Improve mobile wallet integration
5. **Bulk Operations**: Batch mint certificates for efficiency

## Support

For issues with NFT visibility:
1. Check the collectables page for compatibility status
2. Verify on Solscan that metadata account exists
3. Ensure you're using a compatible wallet version
4. Contact support with specific mint addresses for debugging