# NullSafety - Certificate Verification System

A blockchain-based certificate issuance and verification platform built on Solana, featuring a minimal Vercel-inspired design system.

## 🎯 Overview

Team NullSafety has developed a comprehensive certificate verification system that leverages blockchain technology to create tamper-proof digital credentials. The platform features a clean, minimal black and white design inspired by Vercel's aesthetic, ensuring both functionality and visual appeal.

## ✨ Key Features

### 🔐 Blockchain Security
- **Immutable Records**: Certificates stored on Solana blockchain
- **Tamper-Proof**: Cryptographic verification ensures authenticity
- **Decentralized**: No single point of failure

### ⚡ Instant Verification
- **Real-time Checking**: Verify certificates in seconds
- **Global Access**: Share and verify certificates worldwide
- **Permanent URLs**: Each certificate has a unique, permanent link

### 🔗 Blockchain Integration
- **Immutable Storage**: Certificates stored permanently on blockchain
- **Cryptographic Verification**: Each certificate has unique blockchain hash
- **Transparent Records**: All certificate data publicly verifiable

### 🎨 Modern Design
- **Minimal Aesthetic**: Clean black and white design system
- **Dark/Light Themes**: Automatic theme switching with persistence
- **Responsive Design**: Works perfectly on all devices
- **Accessibility First**: High contrast and clear typography

## 🛠 Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first styling
- **shadcn/ui**: High-quality UI components

### Blockchain
- **Solana**: High-performance blockchain
- **@solana/web3.js**: Solana JavaScript SDK
- **@solana/wallet-adapter**: Wallet integration for admin functions

### Backend & Database
- **Supabase**: PostgreSQL database and authentication
- **Edge Functions**: Serverless backend logic

### Additional Libraries
- **next-themes**: Theme management
- **react-hot-toast**: Notifications
- **html2canvas**: Certificate image generation
- **jsPDF**: PDF export functionality

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Solana devnet SOL for testing

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SIH/nullsafety-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the SQL schema in your Supabase dashboard:
   ```bash
   # File: supabase-schema.sql contains the database structure
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Visit the Application**
   Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── cert/[id]/               # Certificate viewing page
│   ├── dashboard/               # Institution dashboard
│   ├── theme-demo/              # Design system demo
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
├── components/                   # Reusable components
│   ├── ui/                      # shadcn/ui components
│   ├── ThemeProvider.tsx        # Theme context
│   ├── ThemeToggle.tsx          # Theme switching
│   └── WalletProvider.tsx       # Solana wallet setup
├── lib/                         # Utility functions
│   ├── supabase.ts              # Database client
│   └── utils.ts                 # Helper functions
└── globals.css                  # Global styles
```

## 🎨 Design System

### Color Palette
- **Primary**: Black (#000000) / White (#FFFFFF)
- **Background**: White (#FFFFFF) / Black (#000000)
- **Text**: Black (#000000) / White (#FFFFFF)
- **Borders**: Gray-200 (#E5E7EB) / Gray-800 (#1F2937)
- **Muted**: Gray-600 (#4B5563) / Gray-400 (#9CA3AF)

### Typography
- **Font Family**: Geist Sans
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Line Height**: 1.5 (24px/16px)

### Components
All components follow the minimal design principles:
- High contrast for accessibility
- Clean borders and spacing
- Consistent interaction states
- Seamless theme transitions

## 🔧 Key Components

### Certificate Viewer (`/cert/[id]`)
- **View Certificates**: Display blockchain-verified credentials
- **Download Options**: PNG and PDF export
- **Share Functionality**: Social sharing and link copying
- **Verification Status**: Real-time blockchain verification

### Dashboard (`/dashboard`)
- **Institution Management**: Multi-institution support
- **Certificate Creation**: Issue new certificates
- **Statistics Overview**: Certificate analytics
- **Wallet Integration**: Connect institutional wallets

### Theme Demo (`/theme-demo`)
- **Design Showcase**: Complete design system demonstration
- **Theme Controls**: Live theme switching
- **Component Library**: All UI components in action

## 🗄️ Database Schema

### Tables

#### `certificates`
- Basic certificate information
- Student details and grades
- Blockchain hash and verification status

#### `institutions`
- Institution registration data
- Authority wallet addresses
- Verification status

## 🔗 Blockchain Integration

### Solana Network
- **Network**: Devnet (testing) / Mainnet (production)
- **Wallet Support**: Phantom, Solflare, and other Solana wallets (for admin functions)
- **Transaction Fees**: Low-cost Solana transactions for certificate registration

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 🧪 Testing

### Local Testing
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Lint code
npm run lint
```

### Admin Wallet Setup
1. Install Phantom wallet
2. Switch to Devnet
3. Get devnet SOL from faucet
4. Test certificate creation (admin functions)

## 🔒 Security Considerations

- **Wallet Security**: Never store private keys
- **Environment Variables**: Secure API keys
- **Database Access**: Row-level security enabled
- **Input Validation**: All user inputs validated
- **HTTPS Only**: Secure connections enforced

## 🌟 Features in Detail

### Certificate Verification
1. **Blockchain Hash**: Each certificate has a unique blockchain hash
2. **Immutable Storage**: Data cannot be altered once stored
3. **Global Verification**: Verify from anywhere in the world
4. **Instant Results**: Real-time verification status

### Certificate Management
1. **Instant Verification**: Real-time certificate validation
2. **Permanent Storage**: Certificates stored immutably on blockchain
3. **Download Options**: PNG and PDF export functionality
4. **Global Access**: Certificates accessible from anywhere

### Institution Management
1. **Multi-Institution**: Support for multiple educational institutions
2. **Role-Based Access**: Different permissions for different roles
3. **Verification System**: Institution verification process
4. **Analytics Dashboard**: Track certificate issuance and usage

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Write descriptive commit messages
- Add comments for complex logic

## 📄 License

This project is built for educational purposes as part of the Smart India Hackathon.

## 👥 Team NullSafety

Built with ❤️ by Team NullSafety for the Smart India Hackathon 2024.

### Contact
- **Team**: NullSafety
- **Project**: Certificate Verification System
- **Technology**: Solana Blockchain + Next.js

---

## 🎯 Quick Start Commands

```bash
# Install and run
npm install && npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🌐 Live Demo

Experience the NullSafety Certificate Verification System:
- **Homepage**: Clean, minimal landing page
- **Dashboard**: Institution certificate management
- **Certificate Viewer**: Blockchain-verified credentials
- **Theme Demo**: Complete design system showcase

Transform the way certificates are issued, verified, and trusted with blockchain technology and beautiful, accessible design.