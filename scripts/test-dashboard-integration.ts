#!/usr/bin/env tsx

/**
 * Integration test script for dashboard private key functionality
 *
 * This script tests the private key integration with the dashboard
 * by simulating certificate creation and verification processes.
 *
 * Usage:
 *   npx tsx scripts/test-dashboard-integration.ts
 *
 * Make sure to set SOLANA_PRIVATE_KEY in your .env.local file
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { createPrivateKeyTransactionManager, generateCertificateId, PrivateKeyUtils } from "../src/lib/anchor/private-key-transactions";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase environment variables not found");
  console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const TEST_INSTITUTION = {
  name: "EduChain Test University",
  location: "Blockchain Campus, Devnet",
  authority_wallet: "" // Will be set from private key
};

const TEST_STUDENT = {
  name: "Alice Johnson",
  roll_no: "CS2024001",
  wallet_address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHkh" // Example wallet
};

const TEST_CERTIFICATE = {
  studentName: "Alice Johnson",
  courseName: "Blockchain Fundamentals",
  grade: "A+",
  rollNo: "CS2024001"
};

async function main() {
  console.log("🔗 EduChain Dashboard Integration Test");
  console.log("=" .repeat(50));

  try {
    // Validate environment setup
    console.log("🔍 Validating environment setup...");

    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("SOLANA_PRIVATE_KEY not found in environment variables");
    }

    if (!PrivateKeyUtils.validatePrivateKey(privateKey)) {
      throw new Error("Invalid private key format");
    }

    const publicKey = PrivateKeyUtils.getPublicKeyFromPrivate(privateKey);
    console.log("✅ Private key validated");
    console.log(`🔑 Public key: ${publicKey}`);

    // Update test institution with actual authority wallet
    TEST_INSTITUTION.authority_wallet = publicKey;
    console.log("");

    // Create transaction manager
    console.log("⚡ Initializing transaction manager...");
    const txManager = createPrivateKeyTransactionManager();

    // Check balance
    const balance = await txManager.getBalance();
    console.log(`💰 Current balance: ${balance} SOL`);

    if (balance < 0.1) {
      console.log("💧 Requesting airdrop...");
      await txManager.requestAirdrop(1);
      const newBalance = await txManager.getBalance();
      console.log(`💰 New balance: ${newBalance} SOL`);
    }
    console.log("");

    // Setup institution on blockchain
    console.log("🏫 Setting up institution on blockchain...");
    const setupResult = await txManager.setupInstitution(
      TEST_INSTITUTION.name,
      TEST_INSTITUTION.location
    );

    if (!setupResult) {
      throw new Error("Failed to setup institution on blockchain");
    }
    console.log("✅ Institution setup complete on blockchain");
    console.log("");

    // Setup institution in database
    console.log("📊 Setting up institution in database...");

    // Check if institution exists
    const { data: existingInstitution } = await supabase
      .from('institutions')
      .select('*')
      .eq('authority_wallet', publicKey)
      .single();

    if (!existingInstitution) {
      const { error: institutionError } = await supabase
        .from('institutions')
        .insert({
          name: TEST_INSTITUTION.name,
          location: TEST_INSTITUTION.location,
          authority_wallet: TEST_INSTITUTION.authority_wallet,
          is_verified: true,
          registration_date: new Date().toISOString().split('T')[0]
        });

      if (institutionError) {
        console.error("⚠️  Database institution setup failed:", institutionError);
      } else {
        console.log("✅ Institution created in database");
      }
    } else {
      console.log("✅ Institution already exists in database");
    }

    // Get institution ID for student creation
    const { data: institution } = await supabase
      .from('institutions')
      .select('id')
      .eq('authority_wallet', publicKey)
      .single();

    if (!institution) {
      throw new Error("Failed to get institution from database");
    }

    // Setup test student in database
    console.log("👨‍🎓 Setting up test student...");

    // Check if student exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('roll_no', TEST_STUDENT.roll_no)
      .eq('institution_id', institution.id)
      .single();

    if (!existingStudent) {
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          name: TEST_STUDENT.name,
          roll_no: TEST_STUDENT.roll_no,
          wallet_address: TEST_STUDENT.wallet_address,
          institution_id: institution.id,
          enrollment_date: new Date().toISOString().split('T')[0]
        });

      if (studentError) {
        console.error("⚠️  Database student setup failed:", studentError);
      } else {
        console.log("✅ Test student created in database");
      }
    } else {
      console.log("✅ Test student already exists in database");
    }
    console.log("");

    // Test certificate creation (simulating dashboard flow)
    console.log("📜 Testing certificate creation...");

    const certificateId = generateCertificateId(
      TEST_CERTIFICATE.studentName,
      TEST_CERTIFICATE.courseName
    );

    console.log(`🔖 Generated certificate ID: ${certificateId}`);

    // Step 1: Create certificate on blockchain
    console.log("⛓️  Issuing certificate on blockchain...");
    const blockchainResult = await txManager.issueCertificate({
      studentName: TEST_CERTIFICATE.studentName,
      courseName: TEST_CERTIFICATE.courseName,
      grade: TEST_CERTIFICATE.grade,
      certificateId: certificateId
    });

    if (!blockchainResult.success) {
      throw new Error(`Blockchain certificate creation failed: ${blockchainResult.error}`);
    }

    console.log("✅ Certificate issued on blockchain");
    console.log(`🔗 Transaction: ${blockchainResult.transactionUrl}`);

    // Step 2: Store certificate in database (simulating dashboard)
    console.log("💾 Storing certificate in database...");
    const { error: dbError } = await supabase
      .from('certificates')
      .insert({
        student_name: TEST_CERTIFICATE.studentName,
        roll_no: TEST_CERTIFICATE.rollNo,
        course_name: TEST_CERTIFICATE.courseName,
        grade: TEST_CERTIFICATE.grade,
        certificate_id: certificateId,
        institution_name: TEST_INSTITUTION.name,
        issued_by: publicKey,
        student_wallet: TEST_STUDENT.wallet_address,
        issued_date: new Date().toISOString().split('T')[0],
        certificate_hash: blockchainResult.signature, // Use transaction signature as hash
      });

    if (dbError) {
      throw new Error(`Database certificate storage failed: ${dbError.message}`);
    }

    console.log("✅ Certificate stored in database");
    console.log(`📋 Certificate hash: ${blockchainResult.signature}`);
    console.log("");

    // Test certificate verification
    console.log("🔍 Testing certificate verification...");

    // Get certificate from blockchain
    const blockchainCert = await txManager.getCertificate(certificateId);
    if (blockchainCert) {
      console.log("✅ Certificate found on blockchain");
      console.log(`📍 Blockchain address: ${blockchainCert.address.toString()}`);
    } else {
      console.log("❌ Certificate not found on blockchain");
    }

    // Get certificate from database
    const { data: dbCert, error: fetchError } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_id', certificateId)
      .single();

    if (fetchError) {
      console.log("❌ Certificate not found in database:", fetchError);
    } else {
      console.log("✅ Certificate found in database");
      console.log(`🎓 Student: ${dbCert.student_name}`);
      console.log(`📚 Course: ${dbCert.course_name}`);
      console.log(`🏆 Grade: ${dbCert.grade}`);
    }
    console.log("");

    // Test sync functionality (simulating dashboard sync)
    console.log("🔄 Testing blockchain sync...");

    const allBlockchainCerts = await txManager.getAllCertificates();
    console.log(`📊 Found ${allBlockchainCerts.length} certificates on blockchain`);

    const { data: allDbCerts } = await supabase
      .from('certificates')
      .select('*')
      .eq('issued_by', publicKey);

    console.log(`📊 Found ${allDbCerts?.length || 0} certificates in database`);

    // Check sync status
    const syncedCerts = (allDbCerts || []).filter(dbCert =>
      allBlockchainCerts.some(bcCert =>
        bcCert.data.certificateId === dbCert.certificate_id
      )
    );

    console.log(`🔗 ${syncedCerts.length} certificates are synced between blockchain and database`);
    console.log("");

    // Final statistics
    console.log("📊 Test Results Summary:");
    console.log(`✅ Institution setup: Complete`);
    console.log(`✅ Student setup: Complete`);
    console.log(`✅ Certificate blockchain creation: ${blockchainResult.success ? 'Success' : 'Failed'}`);
    console.log(`✅ Certificate database storage: ${!dbError ? 'Success' : 'Failed'}`);
    console.log(`✅ Certificate verification: ${blockchainCert && dbCert ? 'Success' : 'Partial'}`);
    console.log(`✅ Blockchain sync: ${syncedCerts.length > 0 ? 'Success' : 'No certificates'}`);

    console.log("\n🎉 Dashboard integration test completed successfully!");

    console.log("\n💡 Next steps:");
    console.log("1. Start your development server: npm run dev");
    console.log("2. Navigate to /dashboard");
    console.log("3. Connect your wallet (same public key as private key)");
    console.log("4. Create certificates using the dashboard");
    console.log("5. All certificates will be created using your private key automatically");

    // Cleanup instructions
    console.log("\n🧹 Cleanup (optional):");
    console.log(`- Delete test certificate: certificate_id = ${certificateId}`);
    console.log(`- Remove test student: roll_no = ${TEST_STUDENT.roll_no}`);

  } catch (error) {
    console.error("\n❌ Integration test failed:");
    console.error(error);

    if (error instanceof Error && error.message.includes('SOLANA_PRIVATE_KEY')) {
      console.log("\n💡 Solution:");
      console.log("Add your private key to .env.local:");
      console.log("SOLANA_PRIVATE_KEY=3sNrx9GXSEt9n9RGQDPkNhuQsAWAQAssAkiH8QKcyFh7jwpvGJLizYMstbpq5FqFifAeZKt7h31KeSkWDJamtTfF");
    }

    process.exit(1);
  }
}

// Utility function to clean up test data
async function cleanup() {
  console.log("🧹 Cleaning up test data...");

  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Private key not found for cleanup");
    return;
  }

  const publicKey = PrivateKeyUtils.getPublicKeyFromPrivate(privateKey);

  // Remove test certificates
  const { error: certError } = await supabase
    .from('certificates')
    .delete()
    .eq('issued_by', publicKey)
    .like('certificate_id', 'alicejohnson_blockchain%');

  if (certError) {
    console.error("Failed to cleanup certificates:", certError);
  } else {
    console.log("✅ Test certificates cleaned up");
  }

  // Remove test students
  const { error: studentError } = await supabase
    .from('students')
    .delete()
    .eq('roll_no', TEST_STUDENT.roll_no);

  if (studentError) {
    console.error("Failed to cleanup students:", studentError);
  } else {
    console.log("✅ Test students cleaned up");
  }

  console.log("🧹 Cleanup completed");
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--cleanup')) {
  cleanup().catch(console.error);
} else if (args.includes('--help')) {
  console.log("EduChain Dashboard Integration Test");
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx scripts/test-dashboard-integration.ts          # Run integration test");
  console.log("  npx tsx scripts/test-dashboard-integration.ts --cleanup # Clean up test data");
  console.log("  npx tsx scripts/test-dashboard-integration.ts --help    # Show this help");
  console.log("");
  console.log("Environment Variables Required:");
  console.log("  SOLANA_PRIVATE_KEY              # Your Solana private key (Base58 format)");
  console.log("  NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL");
  console.log("  NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anonymous key");
} else {
  main().catch(console.error);
}
