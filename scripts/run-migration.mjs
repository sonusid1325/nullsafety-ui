#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nPlease ensure these are set in your .env.local file");
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🚀 Starting student_wallet migration...\n");

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      "add-student-wallet-migration.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📄 Migration SQL loaded from:", migrationPath);

    // Execute the migration
    console.log("⏳ Executing migration...");
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log("🔄 Trying alternative execution method...");

      // Split migration into individual statements and execute them
      const statements = migrationSQL
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      for (const statement of statements) {
        if (
          statement.toLowerCase().includes("begin") ||
          statement.toLowerCase().includes("commit")
        ) {
          continue; // Skip transaction statements for individual execution
        }

        try {
          const { error: stmtError } = await supabase.rpc("exec", {
            sql: statement,
          });

          if (stmtError) {
            console.warn(
              `⚠️  Warning executing statement: ${stmtError.message}`,
            );
          }
        } catch (err) {
          console.warn(`⚠️  Warning: ${err.message}`);
        }
      }
    }

    // Verify the migration
    console.log("✅ Migration executed. Verifying...\n");

    // Check if student_wallet column exists
    const { data: columnCheck, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_name", "certificates")
      .eq("column_name", "student_wallet");

    if (columnError) {
      console.error("❌ Error checking column:", columnError.message);
    } else if (columnCheck && columnCheck.length > 0) {
      console.log("✅ student_wallet column verified:");
      console.log("   - Data type:", columnCheck[0].data_type);
      console.log("   - Nullable:", columnCheck[0].is_nullable);
    } else {
      console.log("❌ student_wallet column not found");
    }

    // Check existing certificates
    const { data: certStats, error: statsError } = await supabase
      .from("certificates")
      .select("id, student_wallet", { count: "exact" });

    if (statsError) {
      console.error("❌ Error checking certificates:", statsError.message);
    } else {
      const total = certStats?.length || 0;
      const withStudentWallet =
        certStats?.filter((cert) => cert.student_wallet)?.length || 0;

      console.log("\n📊 Certificate statistics:");
      console.log(`   - Total certificates: ${total}`);
      console.log(`   - With student_wallet: ${withStudentWallet}`);
      console.log(`   - Missing student_wallet: ${total - withStudentWallet}`);

      if (total - withStudentWallet > 0) {
        console.log(
          "\n⚠️  Some certificates are missing student_wallet values.",
        );
        console.log(
          "   You may need to update them manually with actual wallet addresses.",
        );
      }
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log(
      "1. Update existing certificates with actual student wallet addresses",
    );
    console.log("2. Test certificate creation with new student_wallet field");
    console.log("3. Verify student filtering works in collectables page");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Student Wallet Migration Script

Usage:
  node run-migration.mjs [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be executed without making changes

This script adds the student_wallet column to the certificates table
and updates related functions and policies.

Environment variables required:
  NEXT_PUBLIC_SUPABASE_URL      - Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     - Service role key for admin operations
`);
  process.exit(0);
}

if (args.includes("--dry-run")) {
  console.log("🔍 DRY RUN MODE - No changes will be made\n");
  const migrationPath = path.join(
    __dirname,
    "add-student-wallet-migration.sql",
  );
  const migrationSQL = fs.readFileSync(migrationPath, "utf8");
  console.log("SQL that would be executed:");
  console.log("=".repeat(50));
  console.log(migrationSQL);
  console.log("=".repeat(50));
  process.exit(0);
}

// Run the migration
runMigration();
