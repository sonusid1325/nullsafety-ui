# 🚀 Quick Start Guide - EduChain Certificate Verification System

Welcome to Team EduChain's blockchain certificate verification platform! This guide will get you up and running in under 10 minutes.

## 🎯 What You're Building

A complete certificate verification system featuring:
- ✅ Blockchain-secured certificates on Solana
- ✅ NFT minting capabilities
- ✅ Minimal black & white Vercel-inspired design
- ✅ Dark/light theme support
- ✅ Institution management dashboard

## ⚡ 5-Minute Setup

### Step 1: Environment Setup
Create `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Install & Run
```bash
npm install
npm run dev
```

### Step 3: Access the Platform
- **Homepage**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Theme Demo**: http://localhost:3000/theme-demo

## 🛠 Essential Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality

# Type Checking
npx tsc --noEmit    # Check TypeScript errors
```

## 📋 Database Setup (Supabase)

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com)
2. **Run Schema**: Copy and run the SQL from `supabase-schema.sql`
3. **Get Credentials**: Copy URL and anon key to `.env.local`

### Essential Tables Created:
- `certificates` - Certificate records
- `institutions` - Educational institutions

## 🔑 Wallet Setup (For Testing)

1. **Install Phantom Wallet**: [phantom.app](https://phantom.app)
2. **Switch to Devnet**: Settings → Change Network → Devnet
3. **Get Test SOL**: Use Solana faucet for devnet SOL
4. **Connect Wallet**: Click "Connect Wallet" in the app

## 🎨 Design System Features

### Color Scheme
- **Light Mode**: White background, black text
- **Dark Mode**: Black background, white text
- **Accent**: Gray borders and muted text

### Key Components
- **Clean Cards**: Minimal borders, subtle shadows
- **Typography**: Geist Sans font family
- **Buttons**: High contrast, rounded corners
- **Theme Toggle**: Smooth dark/light transitions

## 📱 Key Pages Overview

### 🏠 Homepage (`/`)
- Hero section with EduChain branding
- Feature showcase
- Wallet connection
- Clean footer with navigation

### 📊 Dashboard (`/dashboard`)
- Certificate creation form
- Statistics overview
- Institution management
- Certificate list with actions

### 📜 Certificate Viewer (`/cert/[id]`)
- Certificate display
- Blockchain verification status
- Download options (PNG/PDF)
- NFT minting functionality

### 🎨 Theme Demo (`/theme-demo`)
- Design system showcase
- Live theme switching
- Component demonstrations

## 🔧 Common Tasks

### Creating a Certificate
1. Go to `/dashboard`
2. Connect your wallet
3. Click "Create Certificate"
4. Fill in student details
5. Certificate is stored on blockchain

### Minting an NFT
1. View certificate at `/cert/[id]`
2. Ensure wallet is connected
3. Click "Mint NFT"
4. Approve transaction
5. NFT sent to student wallet

### Switching Themes
- Click the theme toggle (🌙/☀️) in any header
- Theme persists across browser sessions
- System theme follows OS preference

## 🚨 Troubleshooting

### Wallet Won't Connect
- ✅ Check wallet extension is installed
- ✅ Ensure you're on Solana Devnet
- ✅ Try refreshing the page

### Database Errors
- ✅ Verify Supabase URL and key in `.env.local`
- ✅ Check if schema was run correctly
- ✅ Ensure Row Level Security is configured

### Build Errors
- ✅ Run `npm install` to update dependencies
- ✅ Check for TypeScript errors with `npx tsc --noEmit`
- ✅ Verify all imports are correct

## 🌟 Pro Tips

### Development
- Use the theme demo page to test design changes
- Check browser console for detailed error logs
- Use Solana Explorer to verify transactions

### Design
- All components use consistent spacing (4px grid)
- High contrast ensures accessibility
- Responsive design works on all devices

### Performance
- Images are optimized with Next.js Image component
- CSS is minimal with Tailwind utilities
- Theme switching has no flash of unstyled content

## 📦 Project Structure Quick Reference

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Homepage
│   ├── dashboard/         # Certificate management
│   ├── cert/[id]/         # Certificate viewer
│   └── theme-demo/        # Design showcase
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── Theme*.tsx        # Theme management
├── lib/                  # Utility functions
└── globals.css          # Global styles
```

## 🎯 Next Steps

1. **Customize Branding**: Update logos and colors to match your institution
2. **Add Features**: Implement additional verification methods
3. **Deploy**: Deploy to Vercel or your preferred platform
4. **Scale**: Add support for multiple institutions

## 🤝 Need Help?

- **Documentation**: See full README.md for detailed info
- **Code**: Check existing components for examples
- **Design**: Visit `/theme-demo` for component showcase
- **Blockchain**: Refer to Solana documentation

---

**Built with ❤️ by Team EduChain**

*Ready to revolutionize certificate verification? Let's build something amazing! 🚀*