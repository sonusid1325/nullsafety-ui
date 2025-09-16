// Utility library for certificate verification functions

export interface ExtractedCertificateData {
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  certificate_id: string;
  institution_name: string;
  issued_date: string;
}

export interface DatabaseCertificateData extends ExtractedCertificateData {
  id: string;
  issued_by: string;
  certificate_hash: string;
  is_revoked: boolean;
  student_wallet?: string;
  nft_mint?: string;
  verification_count: number;
  created_at: string;
  updated_at: string;
}

export interface VerificationResult {
  isValid: boolean;
  status: "authentic" | "altered" | "fake";
  extractedData: ExtractedCertificateData;
  databaseData: ExtractedCertificateData | null;
  isRevoked: boolean;
  verificationCount: number;
  message: string;
  fieldsMatch?: { [key: string]: boolean };
  matchPercentage?: number;
}

export interface FieldComparison {
  field: string;
  extracted: string;
  database: string;
  matches: boolean;
}

// Constants for validation
export const VALIDATION_CONFIG = {
  MINIMUM_MATCH_PERCENTAGE: 0.6, // 60% of fields must match
  CRITICAL_FIELDS: ["student_name", "institution_name"],
  OPTIONAL_FIELDS: ["roll_no", "course_name", "grade", "issued_date"],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

/**
 * Normalizes a string for comparison by trimming whitespace and converting to lowercase
 */
export function normalizeString(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase();
}

/**
 * Normalizes date string to YYYY-MM-DD format
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Compares two strings with normalization
 */
export function compareFields(
  field1: string,
  field2: string,
  isDate = false,
): boolean {
  if (isDate) {
    const date1 = normalizeDate(field1);
    const date2 = normalizeDate(field2);
    return date1 === date2 && date1 !== "";
  }

  return (
    normalizeString(field1) === normalizeString(field2) &&
    normalizeString(field1) !== ""
  );
}

/**
 * Compares extracted data with database data
 */
export function compareExtractedWithDatabase(
  extracted: ExtractedCertificateData,
  database: ExtractedCertificateData,
): { fieldsMatch: { [key: string]: boolean }; matchCount: number } {
  const fieldsMatch: { [key: string]: boolean } = {};
  let matchCount = 0;

  const fields: (keyof ExtractedCertificateData)[] = [
    "student_name",
    "roll_no",
    "course_name",
    "grade",
    "institution_name",
    "issued_date",
  ];

  fields.forEach((field) => {
    const isDate = field === "issued_date";
    const matches = compareFields(extracted[field], database[field], isDate);
    fieldsMatch[field] = matches;
    if (matches) matchCount++;
  });

  return { fieldsMatch, matchCount };
}

/**
 * Validates certificate authenticity and determines status
 */
export function validateCertificateAuthenticity(
  fieldsMatch: { [key: string]: boolean },
  totalFields: number,
): {
  status: "authentic" | "altered" | "fake";
  reason: string;
  matchPercentage: number;
} {
  const matchCount = Object.values(fieldsMatch).filter(Boolean).length;
  const matchPercentage = Math.round((matchCount / totalFields) * 100);

  // Check critical fields
  const criticalFieldsMatch = VALIDATION_CONFIG.CRITICAL_FIELDS.every(
    (field) => fieldsMatch[field] === true,
  );

  if (!criticalFieldsMatch) {
    return {
      status: "fake",
      reason: "Critical fields (student name or institution name) do not match",
      matchPercentage,
    };
  }

  if (matchPercentage < VALIDATION_CONFIG.MINIMUM_MATCH_PERCENTAGE * 100) {
    return {
      status: "fake",
      reason: `Only ${matchPercentage}% of fields match (minimum ${Math.round(VALIDATION_CONFIG.MINIMUM_MATCH_PERCENTAGE * 100)}% required)`,
      matchPercentage,
    };
  }

  if (matchPercentage === 100) {
    return {
      status: "authentic",
      reason: `Certificate is authentic - all extracted data matches database records`,
      matchPercentage,
    };
  }

  return {
    status: "altered",
    reason: `Certificate appears to be altered - ${matchPercentage}% of fields match database records`,
    matchPercentage,
  };
}

/**
 * Creates a detailed field comparison for display
 */
export function createFieldComparison(
  extracted: ExtractedCertificateData,
  database: ExtractedCertificateData | null,
): FieldComparison[] {
  const fields: (keyof ExtractedCertificateData)[] = [
    "student_name",
    "roll_no",
    "course_name",
    "grade",
    "institution_name",
    "issued_date",
  ];

  return fields.map((field) => ({
    field,
    extracted: extracted[field] || "",
    database: database?.[field] || "",
    matches: database
      ? compareFields(
          extracted[field],
          database[field],
          field === "issued_date",
        )
      : false,
  }));
}

/**
 * Validates file before upload
 */
export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  if (!VALIDATION_CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Please upload ${VALIDATION_CONFIG.SUPPORTED_IMAGE_TYPES.join(", ")}`,
    };
  }

  if (file.size > VALIDATION_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${VALIDATION_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes extracted data
 */
export function sanitizeExtractedData(data: unknown): ExtractedCertificateData {
  const dataObj = data as Record<string, unknown>;
  const sanitized: ExtractedCertificateData = {
    student_name: String(dataObj.student_name || "").trim(),
    roll_no: String(dataObj.roll_no || "").trim(),
    course_name: String(dataObj.course_name || "").trim(),
    grade: String(dataObj.grade || "").trim(),
    certificate_id: String(dataObj.certificate_id || "").trim(),
    institution_name: String(dataObj.institution_name || "").trim(),
    issued_date: String(dataObj.issued_date || "").trim(),
  };

  // Normalize date if present
  if (sanitized.issued_date) {
    sanitized.issued_date = normalizeDate(sanitized.issued_date);
  }

  return sanitized;
}

/**
 * Generates verification message based on results
 */
export function generateVerificationMessage(
  status: "authentic" | "altered" | "fake",
  isRevoked: boolean,
  matchCount: number,
  totalFields: number,
  matchPercentage: number,
  databaseExists: boolean,
): string {
  if (!databaseExists) {
    return "Certificate not found in database. This certificate is fake or not issued by a registered institution.";
  }

  if (isRevoked) {
    return "Certificate has been revoked and is no longer valid.";
  }

  switch (status) {
    case "authentic":
      return "Certificate is authentic. All extracted data matches database records perfectly.";
    case "altered":
      return `Certificate appears to be altered. ${matchPercentage}% of fields match database records. Some information may have been modified.`;
    case "fake":
      return `Certificate is fake or invalid. Only ${matchPercentage}% of fields match database records.`;
    default:
      return "Unable to determine certificate authenticity.";
  }
}

/**
 * Helper function to format field names for display
 */
export function formatFieldName(fieldName: string): string {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Extracts JSON from Gemini API response text
 */
export function extractJSONFromResponse(
  responseText: string,
): ExtractedCertificateData {
  try {
    // Try direct parsing first
    return JSON.parse(responseText);
  } catch {
    // Try to find JSON in the text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No valid JSON found in response");
  }
}

/**
 * Creates a verification result object
 */
export function createVerificationResult(
  extracted: ExtractedCertificateData,
  database: ExtractedCertificateData | null,
  isRevoked: boolean,
  verificationCount: number,
): VerificationResult {
  if (!database) {
    return {
      isValid: false,
      status: "fake",
      extractedData: extracted,
      databaseData: null,
      isRevoked: false,
      verificationCount: 0,
      message: generateVerificationMessage("fake", false, 0, 0, 0, false),
    };
  }

  const { fieldsMatch, matchCount } = compareExtractedWithDatabase(
    extracted,
    database,
  );
  const totalFields = Object.keys(fieldsMatch).length;
  const { status, matchPercentage } = validateCertificateAuthenticity(
    fieldsMatch,
    totalFields,
  );

  return {
    isValid: (status === "authentic" || status === "altered") && !isRevoked,
    status: isRevoked ? "fake" : status,
    extractedData: extracted,
    databaseData: database,
    isRevoked,
    verificationCount,
    message: generateVerificationMessage(
      status,
      isRevoked,
      matchCount,
      totalFields,
      matchPercentage,
      true,
    ),
    fieldsMatch,
    matchPercentage,
  };
}
