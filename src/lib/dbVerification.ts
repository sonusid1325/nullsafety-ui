/**
 * Database Verification Utilities
 * Helps verify and troubleshoot database setup for EduChain Certificate System
 */

import { supabase } from "./supabase";

export interface DbVerificationResult {
  success: boolean;
  message: string;
  details?: unknown;
}

/**
 * Test basic database connection
 */
export const testConnection = async (): Promise<DbVerificationResult> => {
  try {
    const { error } = await supabase.from("institutions").select("id").limit(1);

    if (error) {
      return {
        success: false,
        message: "Database connection failed",
        details: error,
      };
    }

    return {
      success: true,
      message: "Database connection successful",
    };
  } catch (error) {
    return {
      success: false,
      message: "Network or configuration error",
      details: error,
    };
  }
};

/**
 * Verify institutions table structure
 */
export const verifyTableStructure = async (): Promise<DbVerificationResult> => {
  try {
    const { error } = await supabase
      .from("institutions")
      .select(
        `
        id,
        name,
        location,
        authority_wallet,
        type,
        website,
        contact_email,
        contact_phone,
        description,
        established_year,
        accreditation,
        is_verified,
        verification_requested_at,
        verified_at,
        verified_by,
        rejection_reason,
        created_at,
        updated_at
      `,
      )
      .limit(0);

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          message: 'Table "institutions" does not exist',
          details: error,
        };
      }

      if (
        error.message.includes("column") &&
        error.message.includes("does not exist")
      ) {
        return {
          success: false,
          message: "Missing columns in institutions table",
          details: error,
        };
      }

      return {
        success: false,
        message: "Table structure verification failed",
        details: error,
      };
    }

    return {
      success: true,
      message: "Table structure is correct",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error checking table structure",
      details: error,
    };
  }
};

/**
 * Test RLS (Row Level Security) policies
 */
export const testRLSPolicies = async (
  walletAddress: string,
): Promise<DbVerificationResult> => {
  try {
    // Test read access
    const { error: readError } = await supabase
      .from("institutions")
      .select("*")
      .limit(1);

    if (readError) {
      return {
        success: false,
        message: "RLS blocks read access",
        details: readError,
      };
    }

    // Test insert access with dummy data
    const testData = {
      name: "__TEST_INSTITUTION__",
      location: "Test Location",
      authority_wallet: walletAddress,
      contact_email: "test@test.com",
      type: "University",
      is_verified: false,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("institutions")
      .insert([testData])
      .select();

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate key error - this is actually good, means insert works
        return {
          success: true,
          message: "RLS policies allow operations (duplicate key is expected)",
        };
      }

      if (
        insertError.message.includes("RLS") ||
        insertError.message.includes("policy")
      ) {
        return {
          success: false,
          message: "RLS policies block insert operations",
          details: insertError,
        };
      }

      return {
        success: false,
        message: "Insert test failed due to other error",
        details: insertError,
      };
    }

    // Clean up test data if insert was successful
    if (insertData && insertData.length > 0) {
      await supabase.from("institutions").delete().eq("id", insertData[0].id);
    }

    return {
      success: true,
      message: "RLS policies are configured correctly",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error testing RLS policies",
      details: error,
    };
  }
};

/**
 * Check RLS policies status
 */
export const checkRLSPolicies = async (): Promise<DbVerificationResult> => {
  try {
    // Check if RLS is enabled on key tables
    const { data: rlsStatus, error: rlsError } = await supabase
      .from("pg_tables")
      .select("tablename, rowsecurity")
      .in("tablename", ["institutions", "certificates"])
      .eq("schemaname", "public");

    if (rlsError) {
      return {
        success: false,
        message: "Cannot check RLS status",
        details: rlsError,
      };
    }

    // Check existing policies
    const { data: policies, error: policiesError } = await supabase
      .from("pg_policies")
      .select("tablename, policyname, cmd")
      .in("tablename", ["institutions", "certificates"]);

    if (policiesError) {
      return {
        success: false,
        message: "Cannot check RLS policies",
        details: policiesError,
      };
    }

    const rlsEnabled = rlsStatus?.filter((t) => t.rowsecurity).length || 0;
    const totalTables = rlsStatus?.length || 0;
    const policyCount = policies?.length || 0;

    return {
      success: true,
      message: `RLS Status: ${rlsEnabled}/${totalTables} tables enabled, ${policyCount} policies found`,
      details: {
        rlsStatus,
        policies,
        rlsEnabled: rlsEnabled === totalTables,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Error checking RLS configuration",
      details: error,
    };
  }
};

/**
 * Test certificate creation with RLS
 */
export const testCertificateCreation = async (
  walletAddress: string,
): Promise<DbVerificationResult> => {
  try {
    // First check if institution exists and is verified
    const { data: institution, error: instError } = await supabase
      .from("institutions")
      .select("*")
      .eq("authority_wallet", walletAddress)
      .maybeSingle();

    if (instError) {
      return {
        success: false,
        message: "Cannot check institution status",
        details: instError,
      };
    }

    if (!institution) {
      return {
        success: false,
        message:
          "No institution found for this wallet. Register institution first.",
        details: { walletAddress },
      };
    }

    if (!institution.is_verified) {
      return {
        success: false,
        message:
          "Institution exists but is not verified. Cannot create certificates.",
        details: { institution: institution.name },
      };
    }

    // Try to create a test certificate
    const testCertData = {
      student_name: "__RLS_TEST_STUDENT__",
      roll_no: "TEST-001",
      course_name: "RLS Test Course",
      grade: "A+",
      certificate_id: `RLS-TEST-${Date.now()}`,
      institution_name: institution.name,
      issued_by: walletAddress,
      issued_date: new Date().toISOString().split("T")[0],
      certificate_hash: `rls-test-${Date.now()}`,
      is_revoked: false,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("certificates")
      .insert([testCertData])
      .select();

    if (insertError) {
      if (insertError.code === "42501") {
        return {
          success: false,
          message:
            "RLS policy blocks certificate creation. Check policies or disable RLS for development.",
          details: insertError,
        };
      }

      return {
        success: false,
        message: "Certificate creation failed",
        details: insertError,
      };
    }

    // Clean up test data
    if (insertData && insertData.length > 0) {
      await supabase.from("certificates").delete().eq("id", insertData[0].id);
    }

    return {
      success: true,
      message: "Certificate creation test passed",
      details: { testCertificateId: testCertData.certificate_id },
    };
  } catch (error) {
    return {
      success: false,
      message: "Error testing certificate creation",
      details: error,
    };
  }
};

/**
 * Check for existing registration with wallet address
 */
export const checkExistingRegistration = async (
  walletAddress: string,
): Promise<DbVerificationResult> => {
  try {
    const { data, error } = await supabase
      .from("institutions")
      .select("*")
      .eq("authority_wallet", walletAddress)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: "Error checking existing registration",
        details: error,
      };
    }

    if (data) {
      return {
        success: true,
        message: "Existing registration found",
        details: {
          institutionName: data.name,
          isVerified: data.is_verified,
          registeredAt: data.created_at,
        },
      };
    }

    return {
      success: true,
      message: "No existing registration found - ready to register",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error checking registration status",
      details: error,
    };
  }
};

/**
 * Validate form data before submission
 */
export const validateRegistrationData = (
  formData: Record<string, unknown>,
): DbVerificationResult => {
  const errors: string[] = [];

  // Required fields
  if (
    !formData.name ||
    (typeof formData.name === "string" && !formData.name.trim())
  ) {
    errors.push("Institution name is required");
  }

  if (
    !formData.location ||
    (typeof formData.location === "string" && !formData.location.trim())
  ) {
    errors.push("Location is required");
  }

  if (
    !formData.contact_email ||
    (typeof formData.contact_email === "string" &&
      !formData.contact_email.trim())
  ) {
    errors.push("Contact email is required");
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    formData.contact_email &&
    typeof formData.contact_email === "string" &&
    !emailRegex.test(formData.contact_email.trim())
  ) {
    errors.push("Invalid email format");
  }

  // Year validation
  if (formData.established_year) {
    const year =
      typeof formData.established_year === "string"
        ? parseInt(formData.established_year)
        : typeof formData.established_year === "number"
          ? formData.established_year
          : NaN;
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1800 || year > currentYear) {
      errors.push("Invalid establishment year");
    }
  }

  // Website validation
  if (
    formData.website &&
    typeof formData.website === "string" &&
    formData.website.trim()
  ) {
    try {
      new URL(formData.website);
    } catch {
      errors.push("Invalid website URL format");
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: "Form validation failed",
      details: { errors },
    };
  }

  return {
    success: true,
    message: "Form data is valid",
  };
};

/**
 * Run comprehensive database verification
 */
export const runFullVerification = async (
  walletAddress?: string,
): Promise<{
  connection: DbVerificationResult;
  tableStructure: DbVerificationResult;
  rlsPolicies?: DbVerificationResult;
  rlsStatus?: DbVerificationResult;
  certificateTest?: DbVerificationResult;
  existingRegistration?: DbVerificationResult;
  overallSuccess: boolean;
}> => {
  const connection = await testConnection();
  const tableStructure = await verifyTableStructure();
  const rlsStatus = await checkRLSPolicies();
  let rlsPolicies: DbVerificationResult | undefined;
  let certificateTest: DbVerificationResult | undefined;
  let existingRegistration: DbVerificationResult | undefined;

  if (walletAddress) {
    rlsPolicies = await testRLSPolicies(walletAddress);
    existingRegistration = await checkExistingRegistration(walletAddress);
    certificateTest = await testCertificateCreation(walletAddress);
  }

  const overallSuccess =
    connection.success &&
    tableStructure.success &&
    (rlsPolicies ? rlsPolicies.success : true) &&
    (certificateTest ? certificateTest.success : true);

  return {
    connection,
    tableStructure,
    rlsStatus,
    rlsPolicies,
    certificateTest,
    existingRegistration,
    overallSuccess,
  };
};

/**
 * Get database setup instructions based on verification results
 */
export const getDatabaseSetupInstructions = (
  results: Record<string, DbVerificationResult>,
): string[] => {
  const instructions: string[] = [];

  if (!results.connection.success) {
    instructions.push(
      "Fix database connection:",
      "1. Check NEXT_PUBLIC_SUPABASE_URL in .env.local",
      "2. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
      "3. Verify Supabase project is active",
      "4. Check internet connection",
    );
  }

  if (!results.tableStructure.success) {
    instructions.push(
      "Fix table structure:",
      "1. Run the SQL schema from supabase-schema.sql",
      "2. Ensure all columns exist in institutions table",
      "3. Check for typos in column names",
    );
  }

  if (results.rlsPolicies && !results.rlsPolicies.success) {
    instructions.push(
      "Fix RLS policies:",
      "1. Quick fix: Run supabase/quick-dev-fix.sql to disable RLS for development",
      "2. Proper fix: Run supabase/fix-rls-policies.sql for wallet-based policies",
      "3. Alternative: ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;",
      "4. Check RLS-CERTIFICATE-FIX.md for detailed instructions",
    );
  }

  if (results.certificateTest && !results.certificateTest.success) {
    instructions.push(
      "Fix certificate creation:",
      "1. Ensure institution is registered and verified",
      "2. Check RLS policies allow certificate insertion",
      "3. Verify wallet address matches institution authority_wallet",
      "4. Run: UPDATE institutions SET is_verified = true WHERE authority_wallet = 'YOUR_WALLET';",
    );
  }

  if (instructions.length === 0) {
    instructions.push("Database setup looks good! 🎉");
  }

  return instructions;
};

/**
 * Generate diagnostic report
 */
export const generateDiagnosticReport = (
  results: Record<string, DbVerificationResult>,
  formData?: Record<string, unknown>,
): string => {
  let report = "=== EduChain Database Diagnostic Report ===\n\n";

  report += `Connection Test: ${results.connection.success ? "✅ PASS" : "❌ FAIL"}\n`;
  report += `Message: ${results.connection.message}\n\n`;

  report += `Table Structure: ${results.tableStructure.success ? "✅ PASS" : "❌ FAIL"}\n`;
  report += `Message: ${results.tableStructure.message}\n\n`;

  if (results.rlsPolicies) {
    report += `RLS Policies: ${results.rlsPolicies.success ? "✅ PASS" : "❌ FAIL"}\n`;
    report += `Message: ${results.rlsPolicies.message}\n\n`;
  }

  if (results.existingRegistration) {
    report += `Registration Check: ${results.existingRegistration.success ? "✅ PASS" : "❌ FAIL"}\n`;
    report += `Message: ${results.existingRegistration.message}\n\n`;
  }

  if (formData) {
    const validation = validateRegistrationData(formData);
    report += `Form Validation: ${validation.success ? "✅ PASS" : "❌ FAIL"}\n`;
    report += `Message: ${validation.message}\n\n`;
  }

  report += `Overall Status: ${results.overallSuccess ? "✅ READY TO REGISTER" : "❌ ISSUES FOUND"}\n\n`;

  const instructions = getDatabaseSetupInstructions(results);
  report += "=== Setup Instructions ===\n";
  report += instructions.join("\n") + "\n\n";

  report += "=== Technical Details ===\n";
  if (results.connection.details) {
    report += `Connection Error: ${JSON.stringify(results.connection.details, null, 2)}\n`;
  }
  if (results.tableStructure.details) {
    report += `Table Error: ${JSON.stringify(results.tableStructure.details, null, 2)}\n`;
  }
  if (results.rlsStatus?.details) {
    report += `RLS Status: ${JSON.stringify(results.rlsStatus.details, null, 2)}\n`;
  }
  if (results.rlsPolicies?.details) {
    report += `RLS Error: ${JSON.stringify(results.rlsPolicies.details, null, 2)}\n`;
  }
  if (results.certificateTest?.details) {
    report += `Certificate Test: ${JSON.stringify(results.certificateTest.details, null, 2)}\n`;
  }

  return report;
};

const dbVerificationUtils = {
  testConnection,
  verifyTableStructure,
  testRLSPolicies,
  checkRLSPolicies,
  testCertificateCreation,
  checkExistingRegistration,
  validateRegistrationData,
  runFullVerification,
  getDatabaseSetupInstructions,
  generateDiagnosticReport,
};

export default dbVerificationUtils;
