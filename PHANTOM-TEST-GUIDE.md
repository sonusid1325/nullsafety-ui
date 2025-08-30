# Phantom Wallet NFT Testing Guide

## 🎯 Goal
Test that minted certificate NFTs appear properly in Phantom wallet's collectables section.

## ✅ What's Now Working

The enhanced minting process now creates NFTs with proper Metaplex Token Metadata, making them visible in Phantom wallet.

### Key Features Added:
- **Metadata Accounts**: NFTs now have proper metadata accounts using Token Metadata Program
- **Standard Format**: Follows Metaplex NFT standard with name, symbol, description, and attributes
- **Phantom Detection**: Verification system checks if NFTs are Phantom-compatible
- **Visual Indicators**: Color-coded status dots show compatibility

## 🧪 Testing Steps

### Step 1: Prepare Your Environment
1. **Connect to Devnet**
   - Set Phantom wallet to Devnet
   - Get some devnet SOL from https://faucet.solana.com/
   - Need at least 0.1 SOL for minting fees

2. **Access the Application**
   - Go to your application URL
   - Navigate to `/collectables`
   - Connect your Phantom wallet

### Step 2: Test NFT Minting
1. **Use Test Mint Feature**
   ```
   - Click "🧪 Test Mint" button on collectables page
   - Approve transaction in Phantom when prompted
   - Wait for confirmation (usually 30-60 seconds)
   ```

2. **Or Mint Real Certificate**
   ```
   - Go to certificate page (e.g., `/cert/some-id`)
   - Click "Mint NFT" button
   - Make sure student wallet address is filled
   - Approve transaction
   ```

### Step 3: Verify in Application
After successful minting, check the collectables page:

- ✅ **Green dot**: Verified ownership
- 🔵 **Blue dot**: Phantom wallet compatible  
- 🔴 **Red dot**: Missing metadata (old NFTs)
- 🟡 **Yellow dot**: Ownership pending verification

### Step 4: Check Phantom Wallet
1. **Open Phantom Wallet**
2. **Go to Collectables Tab**
   - Should see your certificate NFT
   - NFT shows name like "University Name - Course Name"
   - Symbol shows as "CERT"

3. **View NFT Details**
   - Click on the NFT in Phantom
   - Should show certificate attributes:
     - Student Name
     - Course Name
     - University
     - Issue Date
     - Grade
     - Certificate Hash

## 🔍 Verification Process

### Browser Console Logs
When minting succeeds, you should see:
```
🚀 Starting NFT minting process...
✅ Wallet connected: [address]
💰 Checking issuer SOL balance...
📝 Creating metadata...
✅ Metadata created: data:application/json;base64,[data]
🔑 Generating mint keypair...
✅ NFT mint address: [mint_address]
📝 Metadata PDA: [metadata_pda]
✍️ Requesting wallet signature...
✅ Transaction signed by wallet
📤 Sending transaction to network...
✅ Transaction sent, signature: [signature]
⏳ Confirming transaction...
✅ Transaction confirmed
🎉 NFT minted successfully!
👻 Should now appear in Phantom wallet collectables!
```

### On-Chain Verification
You can verify the NFT on Solscan:
- Visit: `https://solscan.io/token/[MINT_ADDRESS]?cluster=devnet`
- Should show:
  - Token supply: 1
  - Decimals: 0
  - Metadata account exists
  - Token holder matches student wallet

## 🚨 Troubleshooting

### NFT Not Appearing in Phantom

**1. Check Compatibility Status**
- Look at status dots on collectables page
- Red dot = missing metadata, won't appear in Phantom
- Blue dot = should appear in Phantom

**2. Wait and Refresh**
- Phantom sometimes takes 1-5 minutes to show new NFTs
- Try closing and reopening Phantom
- Switch networks back and forth (mainnet → devnet)

**3. Verify Network**
- Ensure Phantom is on Devnet (same as application)
- Check that mint address exists on correct network

**4. Check Transaction**
- Verify transaction was confirmed on Solscan
- Ensure metadata account was created successfully

### Common Issues

**"Insufficient SOL for transaction fees"**
- Get more devnet SOL from faucet
- Need ~0.02 SOL for each mint

**"Transaction failed"**
- Network congestion, try again in a few minutes
- Check if you approved the transaction in Phantom

**"User rejected transaction"**
- Make sure to approve when Phantom popup appears
- Check if popup blocker is enabled

**NFT minted but not in collectables page**
- Check that `student_wallet` field matches your wallet address
- Refresh the collectables page
- Verify on-chain ownership via token account

## 📊 Status Indicators

### Visual Status System
- 🟢 **Verified Ownership**: You own this NFT token
- 🔵 **Phantom Compatible**: Has metadata account, will show in Phantom
- 🔴 **No Metadata**: Old format, won't show in Phantom wallets
- 🟡 **Pending**: Ownership verification in progress

### What Each Status Means
```
🟢 + 🔵 = Perfect! NFT is owned and will appear in Phantom
🟢 + 🔴 = You own it, but it's old format (won't show in Phantom)
🟡 + 🔴 = Checking ownership of old format NFT
🟡 + 🔵 = Checking ownership of new format NFT
```

## 🎯 Success Criteria

Your NFT integration is working correctly when:

1. ✅ Test mint completes successfully
2. ✅ Blue status dot appears (Phantom compatible)
3. ✅ Green status dot appears (verified ownership)  
4. ✅ NFT appears in Phantom wallet's collectables
5. ✅ NFT details show proper attributes in Phantom
6. ✅ Solscan shows metadata account exists

## 🔄 Testing Checklist

- [ ] Connect Phantom wallet to devnet
- [ ] Have sufficient devnet SOL (>0.1)
- [ ] Test mint works without errors
- [ ] NFT shows blue + green dots in collectables
- [ ] NFT appears in Phantom collectables within 5 minutes
- [ ] NFT details show in Phantom when clicked
- [ ] Solscan shows metadata account exists
- [ ] Can view certificate via "View Certificate" link

## 📞 Need Help?

If NFTs still don't appear in Phantom after following this guide:

1. **Check Browser Console** for error messages during minting
2. **Verify on Solscan** that metadata account exists
3. **Test with Fresh Wallet** to rule out wallet-specific issues
4. **Check Network Settings** ensure both app and Phantom on same network

The metadata account is the key - if it exists and is owned by the Token Metadata program (`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`), then Phantom should display the NFT.