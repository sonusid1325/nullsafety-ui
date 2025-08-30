# CertifyChain - Blockchain Certificate Verification System

A comprehensive certificate issuance and verification platform built on Solana blockchain with Next.js, featuring NFT minting capabilities and institutional management.

## 🌟 Features

- **Blockchain Security**: Tamper-proof certificates stored on Solana blockchain
- **Instant Verification**: Cryptographic proof-based certificate verification
- **NFT Certificates**: Transform certificates into tradeable NFTs using Metaplex
- **Multi-Institution Support**: Role-based access for multiple educational institutions
- **Global Access**: Share certificates with permanent URLs and QR codes
- **Download Options**: Export certificates as PNG or PDF
- **Real-time Dashboard**: Institution management and certificate analytics

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Blockchain**: Solana, Anchor Framework
- **NFT Protocol**: Metaplex Foundation
- **Wallet Integration**: Solana Wallet Adapter
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Local storage with API endpoints
- **Notifications**: React Hot Toast

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Solana wallet (Phantom, Solflare, etc.)
- Supabase account for database
- Basic understanding of Solana and Web3

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nullsafety-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=BssezJKJhhZfQo6EWUHVrfonpdJba54ptgRyG4v5wzb3
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql` in the SQL editor
   - Configure Row Level Security policies as needed

5. **Deploy the Anchor program** (if not already deployed)
   ```bash
   cd ../contract
   anchor build
   anchor deploy
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API routes
│   │   └── upload-certificate-image/  # Image upload endpoint
│   ├── cert/[id]/         # Certificate display page
│   ├── dashboard/         # Institution dashboard
│   ├── layout.tsx         # Root layout with wallet provider
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   └── WalletProvider.tsx # Solana wallet configuration
├── lib/
│   ├── mintCertificateNFT.ts  # NFT minting logic
│   ├── supabase.ts           # Database configuration
│   └── utils.ts              # Utility functions
```

## 🎯 Usage Guide

### For Institutions

1. **Connect Wallet**: Use the "Connect Wallet" button with your institution's authorized wallet
2. **Access Dashboard**: Navigate to `/dashboard` to manage certificates
3. **Issue Certificates**: Click "Issue Certificate" and fill in student details
4. **View Analytics**: Monitor certificate statistics and verification counts

### For Students/Public

1. **View Certificate**: Access certificates via `/cert/[id]` URL
2. **Verify Authenticity**: Certificate automatically shows blockchain verification status
3. **Share Certificate**: Use the share button to copy the certificate URL
4. **Download**: Export certificate as PNG or PDF for offline use

### NFT Minting Process

1. **Prerequisite**: Student wallet address must be provided in certificate data
2. **Authorization**: Only the issuing institution can mint NFTs
3. **Minting**: Click "Mint as NFT" button in certificate view
4. **Transfer**: NFT is automatically transferred to student's wallet
5. **Verification**: View NFT on Solscan using the provided links

## 🔧 API Endpoints

### Certificate Management
- `GET /cert/[id]` - View certificate page
- `POST /api/upload-certificate-image` - Upload certificate images for NFT metadata

### Database Operations (via Supabase)
- **Institutions**: CRUD operations for institution management
- **Certificates**: Certificate issuance, revocation, and updates
- **Verifications**: Track certificate verification events

## 🎨 Customization

### Styling
- Modify `src/app/globals.css` for global styles
- Update Tailwind configuration in `tailwind.config.js`
- Customize UI components in `src/components/ui/`

### Certificate Design
- Edit certificate template in `src/app/cert/[id]/page.tsx`
- Modify the certificate rendering section to match your institution's branding
- Update background patterns and styling as needed

### Blockchain Configuration
- Update program ID in environment variables
- Modify RPC endpoints for different networks (devnet/mainnet)
- Adjust wallet adapter configuration in `WalletProvider.tsx`

## 🔒 Security Considerations

1. **Wallet Security**: Never expose private keys in client-side code
2. **Database Security**: Use Supabase RLS policies to protect sensitive data
3. **Image Uploads**: Validate file types and implement size limits
4. **Environment Variables**: Keep sensitive keys in `.env.local` (not committed)

## 🚨 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure wallet extension is installed and unlocked
   - Check if you're on the correct network (devnet/mainnet)

2. **Database Connection Errors**
   - Verify Supabase URL and API key
   - Check if database schema is properly set up

3. **NFT Minting Failures**
   - Ensure sufficient SOL for transaction fees
   - Verify Metaplex configuration and Bundlr setup
   - Check student wallet address format

4. **Certificate Not Found**
   - Verify certificate ID in URL
   - Check database for certificate existence

### Debug Tips

- Enable browser developer tools for detailed error logs
- Check Supabase dashboard for database query logs
- Use Solana Explorer to verify blockchain transactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.org/) for blockchain infrastructure
- [Metaplex](https://www.metaplex.com/) for NFT protocols
- [Anchor](https://www.anchor-lang.com/) for Solana program development
- [Supabase](https://supabase.com/) for database services
- [shadcn/ui](https://ui.shadcn.com/) for UI components

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check existing documentation and troubleshooting guides
- Review Solana and Metaplex documentation for blockchain-specific issues

---

**Built with ❤️ for educational verification on blockchain**