#!/usr/bin/env tsx

/**
 * Certificate Hash Conflict Resolution Script
 *
 * This script helps resolve duplicate certificate hash issues in the Supabase database.
 * Run this script when you encounter "duplicate key value violates unique constraint" errors.
 *
 * Usage:
 * npm run resolve-hash-conflicts
 * or
 * npx tsx scripts/resolve-hash-conflicts.ts
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in environment variables");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CertificateRecord {
  id: string;
  certificate_id: string;
  student_name: string;
  course_name: string;
  grade: string;
  institution_name: string;
  issued_by: string;
  student_wallet: string;
  certificate_hash: string;
  created_at: string;
}

function generateSecureHash(data: {
  studentName: string;
  courseName: string;
  grade: string;
  certificateId: string;
  institutionName: string;
  issuedBy: string;
  studentWallet: string;
  timestamp?: number;
  salt?: string;
}): string {
  const timestamp = data.timestamp || Date.now();
  const salt = data.salt || randomBytes(16).toString("hex");

  const hashInput = [
    data.studentName,
    data.courseName,
    data.grade,
    data.certificateId,
    data.institutionName,
    data.issuedBy,
    data.studentWallet,
    timestamp.toString(),
    salt,
  ].join("|");

  return createHash("sha256").update(hashInput, "utf8").digest("hex");
}

async function findDuplicateHashes(): Promise<
  Map<string, CertificateRecord[]>
> {
  console.log("🔍 Scanning for duplicate certificate hashes...");

  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("certificate_hash, created_at");

  if (error) {
    throw new Error(`Failed to fetch certificates: ${error.message}`);
  }

  const hashGroups = new Map<string, CertificateRecord[]>();

  data.forEach((cert: CertificateRecord) => {
    if (!hashGroups.has(cert.certificate_hash)) {
      hashGroups.set(cert.certificate_hash, []);
    }
    hashGroups.get(cert.certificate_hash)!.push(cert);
  });

  // Filter to only duplicates
  const duplicates = new Map<string, CertificateRecord[]>();
  hashGroups.forEach((certs, hash) => {
    if (certs.length > 1) {
      duplicates.set(hash, certs);
    }
  });

  return duplicates;
}

async function resolveDuplicateHash(
  hash: string,
  certificates: CertificateRecord[],
): Promise<void> {
  console.log(`\n📝 Resolving duplicate hash: ${hash}`);
  console.log(`   Found ${certificates.length} certificates with this hash:`);

  certificates.forEach((cert, index) => {
    console.log(
      `   ${index + 1}. ${cert.certificate_id} - ${cert.student_name} (ID: ${cert.id})`,
    );
  });

  // Keep the oldest certificate with the original hash
  const sortedCerts = certificates.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const keepOriginal = sortedCerts[0];
  const toUpdate = sortedCerts.slice(1);

  console.log(
    `   ✅ Keeping original hash for: ${keepOriginal.certificate_id}`,
  );
  console.log(
    `   🔧 Updating ${toUpdate.length} certificates with new hashes...`,
  );

  for (const cert of toUpdate) {
    try {
      // Generate a new unique hash
      let newHash: string;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        attempts++;
        newHash = generateSecureHash({
          studentName: cert.student_name,
          courseName: cert.course_name,
          grade: cert.grade,
          certificateId: cert.certificate_id,
          institutionName: cert.institution_name,
          issuedBy: cert.issued_by,
          studentWallet: cert.student_wallet,
          timestamp: Date.now() + attempts * 1000, // Ensure different timestamps
          salt: randomBytes(32).toString("hex"), // Large salt for uniqueness
        });

        // Check if this hash already exists
        const { data: existing } = await supabase
          .from("certificates")
          .select("id")
          .eq("certificate_hash", newHash)
          .single();

        if (!existing) {
          break; // Hash is unique
        }

        if (attempts >= maxAttempts) {
          throw new Error(
            `Could not generate unique hash after ${maxAttempts} attempts`,
          );
        }
      } while (true);

      // Update the certificate with the new hash
      const { error: updateError } = await supabase
        .from("certificates")
        .update({ certificate_hash: newHash })
        .eq("id", cert.id);

      if (updateError) {
        throw new Error(`Failed to update certificate: ${updateError.message}`);
      }

      console.log(
        `     ✅ Updated ${cert.certificate_id}: ${newHash.substring(0, 16)}...`,
      );
    } catch (error) {
      console.error(`     ❌ Failed to update ${cert.certificate_id}:`, error);
    }
  }
}

async function validateHashUniqueness(): Promise<boolean> {
  console.log("\n🔍 Validating hash uniqueness...");

  const { data, error } = await supabase
    .from("certificates")
    .select("certificate_hash");

  if (error) {
    console.error("❌ Error validating uniqueness:", error.message);
    return false;
  }

  if (data) {
    // Count duplicates by grouping hashes
    const hashCounts = data.reduce(
      (acc: { [key: string]: number }, cert: { certificate_hash: string }) => {
        acc[cert.certificate_hash] = (acc[cert.certificate_hash] || 0) + 1;
        return acc;
      },
      {},
    );

    const duplicates = Object.entries(hashCounts).filter(
      ([, count]) => count > 1,
    );

    if (duplicates.length > 0) {
      console.log(`❌ Still found ${duplicates.length} duplicate hashes`);
      return false;
    }
  }

  console.log("✅ All certificate hashes are now unique!");
  return true;
}

async function displayStatistics(): Promise<void> {
  console.log("\n📊 Certificate Hash Statistics:");

  try {
    const { count: totalCount, error: countError } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error getting total count:", countError.message);
      return;
    }

    const { data: allHashes, error: uniqueError } = await supabase
      .from("certificates")
      .select("certificate_hash");

    if (uniqueError) {
      console.error("Error getting unique hashes:", uniqueError.message);
      return;
    }

    const uniqueHashes = [
      ...new Set(allHashes?.map((h) => h.certificate_hash) || []),
    ];

    console.log(`   Total Certificates: ${totalCount || 0}`);
    console.log(`   Unique Hashes: ${uniqueHashes?.length || 0}`);
    console.log(
      `   Uniqueness Rate: ${totalCount ? (((uniqueHashes?.length || 0) / totalCount) * 100).toFixed(2) : 0}%`,
    );
  } catch (error) {
    console.error("Error displaying statistics:", error);
  }
}

async function backupBeforeResolving(): Promise<void> {
  console.log("💾 Creating backup of certificate hashes...");

  try {
    const { data, error } = await supabase
      .from("certificates")
      .select("id, certificate_id, certificate_hash, created_at");

    if (error) {
      throw new Error(`Failed to backup data: ${error.message}`);
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      certificates: data,
    };

    const fs = await import("fs");
    const path = await import("path");

    const backupPath = path.join(
      process.cwd(),
      `certificate-hash-backup-${Date.now()}.json`,
    );
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup created: ${backupPath}`);
  } catch (error) {
    console.error("❌ Failed to create backup:", error);
    console.log("⚠️  Continuing without backup...");
  }
}

async function main(): Promise<void> {
  console.log("🚀 Certificate Hash Conflict Resolution Tool");
  console.log("===========================================\n");

  try {
    // Display initial statistics
    await displayStatistics();

    // Create backup
    await backupBeforeResolving();

    // Find duplicate hashes
    const duplicates = await findDuplicateHashes();

    if (duplicates.size === 0) {
      console.log("✅ No duplicate certificate hashes found!");
      return;
    }

    console.log(
      `\n⚠️  Found ${duplicates.size} duplicate hash(es) affecting ${Array.from(duplicates.values()).reduce((sum, certs) => sum + certs.length, 0)} certificates`,
    );

    // Resolve each duplicate hash
    for (const [hash, certificates] of duplicates) {
      await resolveDuplicateHash(hash, certificates);
    }

    // Validate that all conflicts are resolved
    const isResolved = await validateHashUniqueness();

    if (isResolved) {
      console.log("\n🎉 All hash conflicts have been successfully resolved!");
    } else {
      console.log(
        "\n⚠️  Some conflicts may still exist. Please run the script again.",
      );
    }

    // Display final statistics
    await displayStatistics();
  } catch (error) {
    console.error("\n❌ Error during resolution process:", error);
    process.exit(1);
  }
}

// Additional utility functions for manual resolution
async function resolveSpecificHash(hash: string): Promise<void> {
  console.log(`🔧 Resolving specific hash: ${hash}`);

  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("certificate_hash", hash);

  if (error) {
    throw new Error(`Failed to fetch certificates with hash: ${error.message}`);
  }

  if (!data || data.length <= 1) {
    console.log("✅ No duplicate found for this hash");
    return;
  }

  await resolveDuplicateHash(hash, data);
}

// Command line argument handling
const args = process.argv.slice(2);

if (args.length > 0) {
  const command = args[0];

  switch (command) {
    case "--hash":
      if (args[1]) {
        resolveSpecificHash(args[1]).catch(console.error);
      } else {
        console.error("Please provide a hash to resolve: --hash <hash_value>");
      }
      break;
    case "--stats":
      displayStatistics().catch(console.error);
      break;
    case "--help":
      console.log("Certificate Hash Conflict Resolution Tool");
      console.log("");
      console.log("Usage:");
      console.log(
        "  npx tsx scripts/resolve-hash-conflicts.ts           # Resolve all conflicts",
      );
      console.log(
        "  npx tsx scripts/resolve-hash-conflicts.ts --stats   # Show statistics only",
      );
      console.log(
        "  npx tsx scripts/resolve-hash-conflicts.ts --hash <hash>  # Resolve specific hash",
      );
      console.log(
        "  npx tsx scripts/resolve-hash-conflicts.ts --help    # Show this help",
      );
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for available options");
  }
} else {
  // Run main resolution process
  main().catch(console.error);
}
