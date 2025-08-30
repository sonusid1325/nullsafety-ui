// Demo data insertion script for CertifyChain
// Run this after setting up your Supabase database

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase credentials
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_SERVICE_KEY = 'your-supabase-service-role-key'; // Use service role key for admin operations

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Demo wallet addresses (replace with actual wallet addresses)
const DEMO_WALLETS = {
  techUniversity: 'TECH123456789ABCDEF123456789ABCDEF12345678',
  stateCollege: 'STATE987654321FEDCBA987654321FEDCBA87654321',
  globalAuthority: 'AUTH111222333444555666777888999000AAA111',
};

async function insertDemoData() {
  try {
    console.log('🚀 Starting demo data insertion...');

    // 1. Insert global state
    console.log('📊 Setting up global state...');
    const { error: globalStateError } = await supabase
      .from('global_state')
      .upsert({
        id: 1,
        authority_wallet: DEMO_WALLETS.globalAuthority,
        total_institutions: 0,
        total_certificates: 0,
        total_verifications: 0,
      });

    if (globalStateError) {
      console.error('❌ Error inserting global state:', globalStateError);
      return;
    }
    console.log('✅ Global state initialized');

    // 2. Insert demo institutions
    console.log('🏫 Inserting demo institutions...');
    const institutions = [
      {
        name: 'Tech University',
        location: 'San Francisco, CA',
        authority_wallet: DEMO_WALLETS.techUniversity,
        is_verified: true,
      },
      {
        name: 'State College',
        location: 'Austin, TX',
        authority_wallet: DEMO_WALLETS.stateCollege,
        is_verified: false,
      },
      {
        name: 'Digital Academy',
        location: 'New York, NY',
        authority_wallet: 'DIGITAL123456789ABCDEF123456789ABCDEF123456',
        is_verified: true,
      },
    ];

    const { data: institutionData, error: institutionError } = await supabase
      .from('institutions')
      .upsert(institutions)
      .select();

    if (institutionError) {
      console.error('❌ Error inserting institutions:', institutionError);
      return;
    }
    console.log(`✅ ${institutionData.length} institutions inserted`);

    // 3. Insert demo certificates
    console.log('🎓 Inserting demo certificates...');
    const certificates = [
      {
        student_name: 'Alice Johnson',
        roll_no: '2023001',
        course_name: 'Bachelor of Computer Science',
        grade: 'A+',
        certificate_id: 'CERT-2024-001',
        institution_name: 'Tech University',
        issued_by: DEMO_WALLETS.techUniversity,
        issued_date: '2024-01-15',
        certificate_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        student_wallet: 'STUDENT1123456789ABCDEF123456789ABCDEF12345',
      },
      {
        student_name: 'Bob Smith',
        roll_no: '2023002',
        course_name: 'Master of Data Science',
        grade: 'A',
        certificate_id: 'CERT-2024-002',
        institution_name: 'Tech University',
        issued_by: DEMO_WALLETS.techUniversity,
        issued_date: '2024-01-20',
        certificate_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        student_wallet: 'STUDENT2987654321FEDCBA987654321FEDCBA87654',
      },
      {
        student_name: 'Carol Davis',
        roll_no: 'SC2023001',
        course_name: 'Bachelor of Arts in Psychology',
        grade: 'B+',
        certificate_id: 'CERT-2024-003',
        institution_name: 'State College',
        issued_by: DEMO_WALLETS.stateCollege,
        issued_date: '2024-01-25',
        certificate_hash: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
      },
      {
        student_name: 'David Wilson',
        roll_no: '2024001',
        course_name: 'Certificate in Web3 Development',
        grade: 'A+',
        certificate_id: 'CERT-2024-004',
        institution_name: 'Digital Academy',
        issued_by: 'DIGITAL123456789ABCDEF123456789ABCDEF123456',
        issued_date: '2024-02-01',
        certificate_hash: '0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        student_wallet: 'STUDENT3111222333444555666777888999000AAA',
      },
      {
        student_name: 'Eva Martinez',
        roll_no: '2024002',
        course_name: 'Advanced Blockchain Development',
        grade: 'A',
        certificate_id: 'CERT-2024-005',
        institution_name: 'Digital Academy',
        issued_by: 'DIGITAL123456789ABCDEF123456789ABCDEF123456',
        issued_date: '2024-02-05',
        certificate_hash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        is_revoked: false,
        nft_mint: 'NFT123456789ABCDEF123456789ABCDEF123456789', // Demo NFT mint address
      },
    ];

    const { data: certificateData, error: certificateError } = await supabase
      .from('certificates')
      .upsert(certificates)
      .select();

    if (certificateError) {
      console.error('❌ Error inserting certificates:', certificateError);
      return;
    }
    console.log(`✅ ${certificateData.length} certificates inserted`);

    // 4. Insert some demo verifications
    console.log('🔍 Adding demo verifications...');
    if (certificateData.length > 0) {
      const verifications = [
        {
          certificate_id: certificateData[0].id,
          verifier_wallet: 'VERIFIER1123456789ABCDEF123456789ABCDEF123',
        },
        {
          certificate_id: certificateData[0].id,
          verifier_wallet: 'VERIFIER2987654321FEDCBA987654321FEDCBA876',
        },
        {
          certificate_id: certificateData[1].id,
          verifier_wallet: 'VERIFIER3111222333444555666777888999000AAA',
        },
      ];

      const { error: verificationError } = await supabase
        .from('certificate_verifications')
        .upsert(verifications);

      if (verificationError) {
        console.error('❌ Error inserting verifications:', verificationError);
      } else {
        console.log(`✅ ${verifications.length} verifications added`);
      }
    }

    console.log('\n🎉 Demo data insertion completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${institutions.length} institutions created`);
    console.log(`   • ${certificates.length} certificates issued`);
    console.log('   • Global state initialized');
    console.log('\n🔗 You can now:');
    console.log('   • Visit the dashboard with demo wallet addresses');
    console.log('   • View certificates using their IDs');
    console.log('   • Test NFT minting functionality');
    console.log('\n⚠️  Remember to update wallet addresses with real ones!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Helper function to display certificate URLs
async function displayCertificateInfo() {
  try {
    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('id, student_name, certificate_id, institution_name')
      .limit(5);

    if (error) {
      console.error('Error fetching certificates:', error);
      return;
    }

    console.log('\n🎓 Sample Certificate URLs:');
    certificates.forEach(cert => {
      console.log(`   • ${cert.student_name} (${cert.institution_name})`);
      console.log(`     URL: http://localhost:3000/cert/${cert.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error displaying certificate info:', error);
  }
}

// Run the script
async function main() {
  if (SUPABASE_URL === 'your-supabase-url' || SUPABASE_SERVICE_KEY === 'your-supabase-service-role-key') {
    console.log('❌ Please update SUPABASE_URL and SUPABASE_SERVICE_KEY in this script');
    return;
  }

  await insertDemoData();
  await displayCertificateInfo();
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { insertDemoData, displayCertificateInfo };
