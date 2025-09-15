#!/usr/bin/env tsx

/**
 * Test script for private key-based certificate operations
 *
 * This script demonstrates how to use private keys for automated
 * certificate issuance on Solana devnet without requiring user wallets.
 *
 * Usage:
 *   npx tsx scripts/test-private-key-certificates.ts
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

// Test data
const TEST_CERTIFICATES = [
  {
    studentName: "Alice Johnson",
    courseName: "Blockchain Fundamentals",
    grade: "A+"
  },
  {
    studentName: "Bob Smith",
    courseName: "Smart Contract Development",
    grade: "A"
  },
  {
    studentName: "Carol Davis",
    courseName: "DeFi Protocol Design",
    grade: "B+"
  },
  {
    studentName: "David Wilson",
    courseName: "Cryptocurrency Trading",
    grade: "A-"
  },
  {
    studentName: "Eva Martinez",
    courseName: "NFT Development",
    grade: "A+"
  }
];

async function main() {
  console.log("🎓 EduChain Private Key Certificate Test");
  console.log("=" .repeat(50));

  try {
    // Validate private key
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("SOLANA_PRIVATE_KEY not found in environment variables");
    }

    if (!PrivateKeyUtils.validatePrivateKey(privateKey)) {
      throw new Error("Invalid private key format");
    }

    console.log("✅ Private key validated");
    console.log("🔑 Public key:", PrivateKeyUtils.getPublicKeyFromPrivate(privateKey));
    console.log("");

    // Create transaction manager
    const txManager = createPrivateKeyTransactionManager();

    // Check balance
    console.log("💰 Checking wallet balance...");
    const balance = await txManager.getBalance();
    console.log(`   Current balance: ${balance} SOL`);

    // Request airdrop if needed
    if (balance < 0.5) {
      console.log("💧 Requesting airdrop (2 SOL)...");
      await txManager.requestAirdrop(2);
      const newBalance = await txManager.getBalance();
      console.log(`   New balance: ${newBalance} SOL`);
    }
    console.log("");

    // Setup institution (one-time)
    console.log("🏫 Setting up institution...");
    const setupResult = await txManager.setupInstitution(
      "EduChain Test University",
      "Blockchain Campus, Devnet"
    );

    if (!setupResult) {
      throw new Error("Failed to setup institution");
    }
    console.log("✅ Institution setup complete");
    console.log("");

    // Get institution info
    console.log("📋 Institution Information:");
    const institution = await txManager.getInstitution();
    if (institution) {
      console.log(`   Address: ${institution.address.toString()}`);
      console.log(`   Name: ${institution.data.name}`);
      console.log(`   Location: ${institution.data.location}`);
      console.log(`   Verified: ${institution.data.isVerified}`);
      console.log(`   Certificates Issued: ${institution.data.certificatesIssued.toString()}`);
    }
    console.log("");

    // Test single certificate issuance
    console.log("📜 Testing single certificate issuance...");
    const singleCert = TEST_CERTIFICATES[0];
    const certId = generateCertificateId(singleCert.studentName, singleCert.courseName);

    const result = await txManager.issueCertificate({
      studentName: singleCert.studentName,
      courseName: singleCert.courseName,
      grade: singleCert.grade,
      certificateId: certId
    });

    if (result.success) {
      console.log("✅ Certificate issued successfully!");
      console.log(`   Transaction: ${result.transactionUrl}`);
      console.log(`   Certificate ID: ${certId}`);
    } else {
      console.log("❌ Certificate issuance failed:", result.error);
    }
    console.log("");

    // Test batch certificate issuance
    console.log("🚀 Testing batch certificate issuance...");
    const batchCertificates = TEST_CERTIFICATES.slice(1).map(cert => ({
      ...cert,
      certificateId: generateCertificateId(cert.studentName, cert.courseName)
    }));

    const batchResults = await txManager.batchIssueCertificates(batchCertificates);

    const successful = batchResults.filter(r => r.success);
    const failed = batchResults.filter(r => !r.success);

    console.log(`📊 Batch Results: ${successful.length}/${batchResults.length} successful`);

    if (failed.length > 0) {
      console.log("❌ Failed certificates:");
      failed.forEach((result, index) => {
        console.log(`   ${batchCertificates[index].studentName}: ${result.error}`);
      });
    }
    console.log("");

    // Verify certificates
    console.log("🔍 Verifying certificates...");
    const allCertificates = await txManager.getAllCertificates();
    console.log(`   Found ${allCertificates.length} certificates on blockchain`);

    if (allCertificates.length > 0) {
      console.log("\n📋 Certificate List:");
      allCertificates.forEach((cert, index) => {
        console.log(`   ${index + 1}. ${cert.data.studentName} - ${cert.data.courseName} (${cert.data.grade})`);
        console.log(`      ID: ${cert.data.certificateId}`);
        console.log(`      Address: ${cert.address.toString()}`);
        console.log(`      Revoked: ${cert.data.isRevoked}`);
        console.log("");
      });
    }

    // Test certificate verification
    if (allCertificates.length > 0) {
      console.log("🔐 Testing certificate verification...");
      const firstCert = allCertificates[0];
      const verifyResult = await txManager.verifyCertificate(firstCert.address);

      if (verifyResult.success) {
        console.log("✅ Certificate verification successful!");
        console.log(`   Transaction: ${verifyResult.transactionUrl}`);
      } else {
        console.log("❌ Certificate verification failed:", verifyResult.error);
      }
    }
    console.log("");

    // Final statistics
    console.log("📊 Final Statistics:");
    const finalInstitution = await txManager.getInstitution();
    const finalCertificates = await txManager.getAllCertificates();
    const finalBalance = await txManager.getBalance();

    console.log(`   Total certificates issued: ${finalInstitution?.data.certificatesIssued.toString() || 0}`);
    console.log(`   Certificates on blockchain: ${finalCertificates.length}`);
    console.log(`   Final balance: ${finalBalance} SOL`);
    console.log("");

    console.log("🎉 Test completed successfully!");
    console.log("\n💡 Tips for production:");
    console.log("   - Store private keys securely (never in code)");
    console.log("   - Use environment variables for configuration");
    console.log("   - Implement proper error handling and retries");
    console.log("   - Monitor transaction fees and balance");
    console.log("   - Keep transaction logs for auditing");

  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

// Additional utility functions for testing
async function testCertificateRetrieval(txManager: any, certificateId: string) {
  console.log(`🔍 Testing certificate retrieval for ID: ${certificateId}`);

  const certificate = await txManager.getCertificate(certificateId);
  if (certificate) {
    console.log("✅ Certificate found:");
    console.log(`   Student: ${certificate.data.studentName}`);
    console.log(`   Course: ${certificate.data.courseName}`);
    console.log(`   Grade: ${certificate.data.grade}`);
    console.log(`   Address: ${certificate.address.toString()}`);
    console.log(`   Issued At: ${new Date(certificate.data.issuedAt.toNumber() * 1000).toISOString()}`);
  } else {
    console.log("❌ Certificate not found");
  }
}

async function testAPICompatibility() {
  console.log("\n🌐 Testing API compatibility...");

  try {
    // Test the API endpoint
    const response = await fetch("http://localhost:3000/api/certificates/issue-private", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentName: "API Test Student",
        courseName: "API Integration Course",
        grade: "A"
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API test successful:", data);
    } else {
      console.log("❌ API test failed:", response.status);
    }
  } catch (error) {
    console.log("⚠️  API test skipped (server not running):", (error as Error).message);
  }
}

// Generate test wallet if needed
function generateTestWallet() {
  console.log("\n🔑 Generating test wallet...");
  const wallet = PrivateKeyUtils.generateKeypair();

  console.log("Generated wallet:");
  console.log(`Public Key: ${wallet.publicKey}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log("\n⚠️  Save the private key securely! Add it to your .env.local file:");
  console.log(`SOLANA_PRIVATE_KEY=${wallet.privateKey}`);
}

// Command line argument handling
const args = process.argv.slice(2);

if (args.includes("--generate-wallet")) {
  generateTestWallet();
  process.exit(0);
}

if (args.includes("--help")) {
  console.log("EduChain Private Key Certificate Test");
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx scripts/test-private-key-certificates.ts");
  console.log("");
  console.log("Options:");
  console.log("  --generate-wallet    Generate a new test wallet");
  console.log("  --help              Show this help message");
  console.log("");
  console.log("Environment Variables:");
  console.log("  SOLANA_PRIVATE_KEY   Your Solana private key (Base58 format)");
  process.exit(0);
}

// Run the main test
main().catch(console.error);
