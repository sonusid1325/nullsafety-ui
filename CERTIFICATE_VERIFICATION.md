# Certificate Verification System

A comprehensive certificate verification system built with Next.js, Supabase, and Google's Gemini AI for OCR. This system allows users to verify the authenticity of educational certificates by uploading images and comparing extracted data against a secure database.

## 🌟 Features

- **Image-based Certificate Verification**: Upload certificate images for automatic data extraction
- **AI-Powered OCR**: Uses Google's Gemini AI for accurate text extraction from certificates
- **Database Verification**: Compares extracted data against secure database records
- **Real-time Results**: Instant verification with detailed comparison tables
- **Revocation Status**: Tracks and displays certificate revocation status
- **Verification Analytics**: Counts and tracks verification attempts
- **Multi-format Support**: Supports JPG, PNG, and WebP image formats
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Debug Tools**: Built-in debugging tools for development and testing

## 🏗️ Architecture

### System Components

1. **Frontend (Next.js)**
   - Certificate upload interface (`/verify`)
   - Results display with comparison tables
   - Debug tools (`/verify-debug` - development only)

2. **Backend APIs**
   - OCR extraction endpoint (`/api/ocr/extract`)
   - Certificate verification endpoint (`/api/certificates/verify`)

3. **Database (Supabase)**
   - Secure certificate storage
   - Institution management
   - Verification tracking

4. **AI Integration**
   - Google Gemini AI for OCR processing
   - Structured data extraction from certificate images

### Data Flow

```
Certificate Image → Gemini OCR → Extracted Data → Database Comparison → Three-Tier Classification → Verification Result
```

## 📋 Database Schema

### Certificates Table

```sql
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_name VARCHAR(255) NOT NULL,
  roll_no VARCHAR(100) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  certificate_id VARCHAR(100) UNIQUE NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  issued_by VARCHAR(44) NOT NULL,
  issued_date DATE NOT NULL,
  certificate_hash VARCHAR(128) UNIQUE NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  student_wallet VARCHAR(44),
  nft_mint VARCHAR(44),
  verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Key Fields

- **certificate_id**: Unique identifier extracted from certificate (used for database lookup only, not compared)
- **student_name**: Full name of the certificate holder (critical field for comparison)
- **institution_name**: Name of the issuing institution (critical field for comparison)
- **is_revoked**: Boolean flag for revoked certificates
- **verification_count**: Number of times certificate has been verified

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ 
- Supabase project
- Google Cloud API key with Generative AI access

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

1. **Install Dependencies**
   ```bash
   npm install @google/generative-ai
   ```

2. **Database Setup**
   ```bash
   # Run the sample data script (optional for testing)
   psql -f scripts/insert-sample-certificates.sql
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📖 API Documentation

### OCR Extraction Endpoint

**POST** `/api/ocr/extract`

Extracts certificate data from uploaded images using Gemini AI.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `image` file

**Response:**
```json
{
  "student_name": "John Doe",
  "roll_no": "2021CS001",
  "course_name": "Computer Science",
  "grade": "A+",
  "certificate_id": "CERT-2024-001",
  "institution_name": "MIT Institute of Technology",
  "issued_date": "2024-01-15"
}
```

### Certificate Verification Endpoint

**POST** `/api/certificates/verify`

Verifies extracted certificate data against the database.

**Request:**
```json
{
  "student_name": "John Doe",
  "roll_no": "2021CS001",
  "course_name": "Computer Science",
  "grade": "A+",
  "certificate_id": "CERT-2024-001",
  "institution_name": "MIT Institute of Technology",
  "issued_date": "2024-01-15"
}
```

**Response:**
```json
{
  "isValid": true,
  "status": "authentic",
  "extractedData": { /* extracted data */ },
  "databaseData": { /* database data */ },
  "isRevoked": false,
  "verificationCount": 4,
  "message": "Certificate is authentic. All extracted data matches database records perfectly.",
  "fieldsMatch": {
    "student_name": true,
    "roll_no": true,
    "institution_name": true,
    /* ... (certificate_id not included in comparison) */
  },
  "matchPercentage": 100
}
```

## 🎯 Usage Examples

### Basic Verification Flow

1. **Navigate to Verification Page**
   ```
   http://localhost:3000/verify
   ```

2. **Upload Certificate Image**
   - Click upload area or drag & drop image
   - Supported formats: JPG, PNG, WebP
   - Maximum size: 10MB

3. **View Results**
   - Authentication status (Authentic/Altered/Fake/Revoked)
   - Detailed field comparison table
   - Verification count and statistics

### Verification Status Classifications

- **✅ Authentic**: All extracted data matches database records (100% match)
- **⚠️ Altered**: Certificate exists but some information has been modified (>60% but <100% match)
- **❌ Fake**: Certificate not found or insufficient data match (≤60% match)
- **🚫 Revoked**: Certificate exists but has been revoked

### Debug Tools (Development Only)

Access debug tools at `/verify-debug` to:
- View database certificates
- Search by certificate ID or UUID
- Test API endpoints directly
- Check database connection status

## 🧪 Testing

### Sample Test Data

Use the provided sample certificates in `scripts/insert-sample-certificates.sql`:

```sql
-- Test certificates include:
CERT-2024-001 - Valid certificate (John Doe)
CERT-2024-002 - Valid certificate (Jane Smith)
CERT-2024-004 - Revoked certificate (Bob Wilson)
/* ... more test data */
```

### Manual Testing Steps

1. **Insert Sample Data**
   ```bash
   # Execute the sample data script in your Supabase SQL editor
   ```

2. **Test Valid Certificate**
   - Create a mock certificate image with data matching `CERT-2024-001`
   - Upload and verify expected authentic result

3. **Test Invalid Certificate**
   - Upload image with non-existent certificate ID
   - Verify "fake" result

4. **Test Revoked Certificate**
   - Use data matching `CERT-2024-004`
   - Verify revoked status is properly detected

## 🔧 Configuration

### Validation Settings

Modify validation rules in `src/lib/certificateVerification.ts`:

```typescript
export const VALIDATION_CONFIG = {
  MINIMUM_MATCH_PERCENTAGE: 0.6, // 60% minimum for altered/authentic classification
  CRITICAL_FIELDS: ['student_name', 'institution_name'], // certificate_id used for lookup only
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};
```

### Classification Thresholds

- **100% match**: Certificate is **Authentic**
- **60-99% match**: Certificate is **Altered** (exists but modified)
- **<60% match**: Certificate is **Fake** (invalid or doesn't exist)
- **Any match + revoked flag**: Certificate is **Revoked**

### OCR Prompt Customization

Adjust OCR extraction prompt in `src/app/api/ocr/extract/route.ts` for different certificate formats or languages.

## 🐛 Troubleshooting

### Common Issues

**1. "Certificate ID not found in image"**
- Ensure certificate has a clear, visible unique identifier
- Certificate ID is required for database lookup (not for comparison)
- Check OCR extraction is working properly in debug tools

**2. "Failed to extract data from image"**
- Verify Gemini API key is correctly set
- Check image quality and format
- Ensure image contains text in supported language

**3. "Certificate appears altered" (60-99% match)**
- Some fields don't match database records exactly
- Could indicate tampering or poor image quality
- Check individual field comparisons for discrepancies

**4. "Certificate is fake" (<60% match)**
- Either not found in database or major discrepancies
- Verify certificate source and authenticity
- Check if certificate was issued by registered institution

**5. "Database query failed"**
- Verify Supabase connection and credentials
- Check database schema matches expected structure
- Ensure certificates table exists and has data

**6. OCR Timeout Errors****
- Image may be too large or complex
- Try with smaller, clearer images
- Check network connectivity

### Debug Techniques

1. **Use Debug Page** (`/verify-debug`)
   - Check database connectivity
   - Search for specific certificates
   - Test API endpoints directly

2. **Check Browser Console**
   - View detailed error messages
   - Monitor API request/response data

3. **Database Logs**
   - Check Supabase logs for database errors
   - Verify data integrity and constraints

## 🔒 Security Considerations

- All certificate data is stored securely in Supabase
- API endpoints include proper error handling
- File uploads are validated for type and size
- Database queries use parameterized statements
- Environment variables protect sensitive API keys

## 🚀 Production Deployment

### Environment Setup

1. **Production Environment Variables**
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   GEMINI_API_KEY=your_production_gemini_key
   ```

2. **Database Migration**
   - Run production database setup
   - Insert actual certificate data
   - Set up proper indexes and constraints

3. **API Rate Limiting**
   - Implement rate limiting for OCR endpoint
   - Monitor Gemini API usage and costs

## 📊 Analytics & Monitoring

The system tracks:
- Certificate verification attempts
- Success/failure rates
- Most verified certificates
- Institution verification patterns

Access analytics through the database:
```sql
-- Verification statistics
SELECT 
  institution_name,
  COUNT(*) as certificate_count,
  SUM(verification_count) as total_verifications,
  AVG(verification_count) as avg_verifications
FROM certificates 
GROUP BY institution_name;
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.