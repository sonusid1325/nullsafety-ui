# 🚀 Deployment Guide - NullSafety Certificate Verification System

This guide covers deploying the NullSafety Certificate Verification System to production.

## 🎯 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] ESLint checks pass (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] No console.log statements in production code
- [ ] All environment variables documented

### ✅ Security
- [ ] API keys secured in environment variables
- [ ] No private keys in codebase
- [ ] Supabase Row Level Security (RLS) policies enabled
- [ ] HTTPS enforced in production
- [ ] Input validation implemented

### ✅ Performance
- [ ] Images optimized
- [ ] Bundle size analyzed
- [ ] Critical CSS inlined
- [ ] Lazy loading implemented where appropriate

### ✅ Functionality
- [ ] Wallet connection working
- [ ] Certificate creation tested
- [ ] NFT minting functional
- [ ] Theme switching works
- [ ] Download functionality tested
- [ ] Mobile responsive

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

#### Step 1: Prepare Repository
```bash
# Ensure clean git state
git add .
git commit -m "Production ready deployment"
git push origin main
```

#### Step 2: Vercel Setup
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### Step 3: Environment Variables
Add these in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Step 4: Deploy
- Click "Deploy"
- Vercel will automatically deploy on every push to main

### Option 2: Netlify

#### Step 1: Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
```

#### Step 2: Environment Variables
Add in Netlify dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option 3: Self-Hosted (Docker)

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  nullsafety-ui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

## 🗄️ Database Production Setup

### Supabase Production
1. **Upgrade to Pro**: For production workloads
2. **Enable Point-in-Time Recovery**: For data safety
3. **Configure Connection Pooling**: For better performance
4. **Set up Monitoring**: Track database performance

### Security Policies
```sql
-- Enable RLS on certificates table
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view certificates
CREATE POLICY "Public read access" ON certificates
  FOR SELECT USING (true);

-- Policy: Only institutions can create certificates
CREATE POLICY "Institution create access" ON certificates
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'wallet_address' = issued_by
  );
```

## 🎨 Asset Optimization

### Images
```bash
# Optimize images before deployment
npm install -g imagemin-cli
imagemin public/images/* --out-dir=public/images/optimized
```

### Bundle Analysis
```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

## 🔧 Environment Configuration

### Production Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Optional
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_CLUSTER=mainnet-beta
```

### Development vs Production
- **Development**: Uses devnet, console logs enabled
- **Production**: Uses mainnet, console logs removed

## 📊 Monitoring & Analytics

### Error Tracking
Consider adding:
- **Sentry**: Error monitoring
- **LogRocket**: Session replay
- **Google Analytics**: Usage analytics

### Performance Monitoring
- **Vercel Analytics**: If using Vercel
- **Core Web Vitals**: Monitor page performance
- **Uptime Monitoring**: Service availability

## 🚨 Production Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

#### Environment Variable Issues
- Check variable names match exactly
- Ensure no trailing spaces
- Verify values in deployment platform

#### Database Connection Issues
- Check Supabase service status
- Verify connection pooling settings
- Review RLS policies

### Health Checks
```bash
# Test production build locally
npm run build
npm start

# Check all routes work
curl http://localhost:3000/
curl http://localhost:3000/dashboard
curl http://localhost:3000/theme-demo
```

## 🔄 Deployment Workflow

### Automated Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run lint
      - name: Build
        run: npm run build
```

### Manual Deployment Steps
1. **Test Locally**: `npm run build && npm start`
2. **Push to Git**: `git push origin main`
3. **Verify Deployment**: Check production URL
4. **Test Critical Paths**: Wallet connection, certificate creation
5. **Monitor Logs**: Check for errors in first hour

## 📱 Domain Setup

### Custom Domain (Vercel)
1. Add domain in Vercel dashboard
2. Configure DNS records:
   ```
   A     @       76.76.19.61
   CNAME www     cname.vercel-dns.com
   ```
3. Enable HTTPS (automatic with Vercel)

### SSL Certificate
- Vercel/Netlify: Automatic Let's Encrypt
- Self-hosted: Configure nginx with SSL

## 🎯 Post-Deployment

### Verification Checklist
- [ ] Homepage loads correctly
- [ ] Theme switching works
- [ ] Wallet connection functional
- [ ] Certificate creation works
- [ ] NFT minting operational
- [ ] Database queries successful
- [ ] Mobile responsive
- [ ] Performance acceptable (< 3s load time)

### SEO Setup
```javascript
// next-seo.config.js
export default {
  title: 'NullSafety - Certificate Verification System',
  description: 'Blockchain-based certificate verification on Solana',
  openGraph: {
    type: 'website',
    url: 'https://your-domain.com',
    title: 'NullSafety Certificate Verification',
    description: 'Secure, blockchain-verified educational certificates',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NullSafety Certificate Verification',
      },
    ],
  },
};
```

## 🔐 Security Hardening

### Headers Configuration
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 📈 Scaling Considerations

### Database Scaling
- **Connection Pooling**: Essential for high traffic
- **Read Replicas**: For read-heavy workloads
- **Indexing**: Optimize query performance

### CDN Setup
- **Static Assets**: Serve via CDN
- **Edge Caching**: Reduce server load
- **Geographic Distribution**: Better global performance

## 🎉 Go Live Checklist

Final steps before announcing:
- [ ] All functionality tested in production
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup procedures in place
- [ ] Monitoring alerts configured
- [ ] Support documentation ready
- [ ] Team trained on production issues

---

**🚀 Ready for Production!**

Your NullSafety Certificate Verification System is now ready to secure and verify educational credentials on the blockchain. 

**Team NullSafety** - Building the future of certificate verification! 🛡️