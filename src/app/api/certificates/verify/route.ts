import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  validateCertificateAuthenticity,
  generateVerificationMessage,
} from "@/lib/certificateVerification";

interface ExtractedData {
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  certificate_id: string;
  institution_name: string;
  issued_date: string;
}

export async function POST(request: NextRequest) {
  try {
    const extractedData: ExtractedData = await request.json();

    // Validate required fields
    if (!extractedData.certificate_id || !extractedData.certificate_id.trim()) {
      return NextResponse.json(
        {
          error: "Certificate ID is required for verification",
          isValid: false,
          status: "fake",
          extractedData,
          databaseData: null,
          isRevoked: false,
          verificationCount: 0,
          message: "Certificate ID not found in the image",
        },
        { status: 400 },
      );
    }

    // Clean and prepare certificate_id for search
    const searchCertId = extractedData.certificate_id.trim();
    console.log("Searching for certificate_id:", searchCertId);

    // Query database for the certificate
    const { data: certificate, error: dbError } = await supabase
      .from("certificates")
      .select("*")
      .eq("certificate_id", searchCertId)
      .single();

    console.log("Database query result:", {
      found: !!certificate,
      error: dbError?.code,
      message: dbError?.message,
    });

    if (dbError && dbError.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Database query error:", dbError);
      return NextResponse.json(
        {
          error: "Database query failed",
          details: dbError.message,
          searchedId: searchCertId,
        },
        { status: 500 },
      );
    }

    // If certificate not found in database, try alternative searches
    if (!certificate) {
      console.log(
        "Certificate not found with exact match, trying alternative searches...",
      );

      // Try case-insensitive search
      const { data: altCertificate, error: altError } = await supabase
        .from("certificates")
        .select("*")
        .ilike("certificate_id", searchCertId)
        .single();

      console.log("Alternative search result:", {
        found: !!altCertificate,
        error: altError?.code,
      });

      if (!altCertificate) {
        // Try searching by UUID format if the extracted ID looks like a UUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(searchCertId)) {
          console.log(
            "Extracted ID appears to be UUID format, searching id column...",
          );
          const { data: uuidCertificate, error: uuidError } = await supabase
            .from("certificates")
            .select("*")
            .eq("id", searchCertId)
            .single();

          console.log("UUID search result:", {
            found: !!uuidCertificate,
            error: uuidError?.code,
          });

          if (uuidCertificate) {
            console.log("Found certificate by UUID in id column");
            // Use the found certificate
            return await processFoundCertificate(
              uuidCertificate,
              extractedData,
            );
          }
        }

        return NextResponse.json({
          isValid: false,
          status: "fake",
          extractedData,
          databaseData: null,
          isRevoked: false,
          verificationCount: 0,
          message:
            "Certificate not found in database. This certificate is fake or not issued by a registered institution.",
          debug: {
            searchedId: searchCertId,
            searchType: "certificate_id and alternatives",
            extractedFields: Object.keys(extractedData).filter(
              (key) => extractedData[key as keyof ExtractedData],
            ),
          },
        });
      } else {
        console.log("Found certificate with case-insensitive search");
        return await processFoundCertificate(altCertificate, extractedData);
      }
    }

    // Use helper function to process the found certificate
    return await processFoundCertificate(certificate, extractedData);
  } catch (error) {
    console.error("Certificate verification error:", error);

    return NextResponse.json(
      {
        error: "Failed to verify certificate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper function to process found certificate
async function processFoundCertificate(
  certificate: {
    id: string;
    student_name: string;
    roll_no: string;
    course_name: string;
    grade: string;
    certificate_id: string;
    institution_name: string;
    issued_by: string;
    issued_date: string;
    certificate_hash: string;
    is_revoked: boolean;
    student_wallet?: string;
    nft_mint?: string;
    verification_count: number;
    created_at: string;
    updated_at: string;
  },
  extractedData: ExtractedData,
) {
  // Check if certificate is revoked
  if (certificate.is_revoked) {
    // Still increment verification count for revoked certificates
    await supabase
      .from("certificates")
      .update({
        verification_count: (certificate.verification_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", certificate.id);

    return NextResponse.json({
      isValid: false,
      status: "fake",
      extractedData,
      databaseData: {
        student_name: certificate.student_name,
        roll_no: certificate.roll_no,
        course_name: certificate.course_name,
        grade: certificate.grade,
        certificate_id: certificate.certificate_id,
        institution_name: certificate.institution_name,
        issued_date: certificate.issued_date,
      },
      isRevoked: true,
      verificationCount: (certificate.verification_count || 0) + 1,
      message: "Certificate has been revoked and is no longer valid.",
    });
  }

  // Compare extracted data with database data
  const databaseData = {
    student_name: certificate.student_name,
    roll_no: certificate.roll_no,
    course_name: certificate.course_name,
    grade: certificate.grade,
    certificate_id: certificate.certificate_id,
    institution_name: certificate.institution_name,
    issued_date: certificate.issued_date,
  };

  // Normalize data for comparison (trim whitespace and convert to lowercase)
  const normalizeString = (str: string) => str.trim().toLowerCase();

  const fieldsMatch = {
    student_name:
      normalizeString(extractedData.student_name) ===
      normalizeString(databaseData.student_name),
    roll_no:
      normalizeString(extractedData.roll_no) ===
      normalizeString(databaseData.roll_no),
    course_name:
      normalizeString(extractedData.course_name) ===
      normalizeString(databaseData.course_name),
    grade:
      normalizeString(extractedData.grade) ===
      normalizeString(databaseData.grade),
    institution_name:
      normalizeString(extractedData.institution_name) ===
      normalizeString(databaseData.institution_name),
    issued_date: extractedData.issued_date === databaseData.issued_date,
  };

  // Count matching fields
  const matchingFields = Object.values(fieldsMatch).filter(Boolean).length;
  const totalFields = Object.keys(fieldsMatch).length;

  // Use the new validation logic to determine status
  const { status, matchPercentage: calculatedMatchPercentage } =
    validateCertificateAuthenticity(fieldsMatch, totalFields);
  const isValid = status === "authentic" || status === "altered";

  // Update verification count
  const newVerificationCount = (certificate.verification_count || 0) + 1;
  await supabase
    .from("certificates")
    .update({
      verification_count: newVerificationCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificate.id);

  // Generate message based on status
  const message = generateVerificationMessage(
    status,
    false, // not revoked
    matchingFields,
    totalFields,
    calculatedMatchPercentage,
    true, // database exists
  );

  return NextResponse.json({
    isValid,
    status,
    extractedData,
    databaseData,
    isRevoked: false,
    verificationCount: newVerificationCount,
    message,
    fieldsMatch, // Optional: include detailed field comparison
    matchPercentage: calculatedMatchPercentage, // Optional: include match percentage
    debug: {
      foundVia: "database_search",
      certificateDbId: certificate.id,
    },
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to verify a certificate." },
    { status: 405 },
  );
}
