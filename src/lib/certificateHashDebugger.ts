import { supabase } from "./supabase";
import { createHash, randomBytes } from "crypto";

export interface HashDebugInfo {
  hash: string;
  exists: boolean;
  certificateId?: string;
  studentName?: string;
  createdAt?: string;
  isDuplicate: boolean;
}

export interface HashConflictReport {
  totalHashes: number;
  uniqueHashes: number;
  duplicateHashes: number;
  conflicts: Array<{
    hash: string;
    count: number;
    certificates: Array<{
      id: string;
      certificateId: string;
      studentName: string;
      createdAt: string;
    }>;
  }>;
}

export class CertificateHashDebugger {
  /**
   * Check if a specific hash exists in the database
   */
  static async checkHashExists(hash: string): Promise<HashDebugInfo> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, certificate_id, student_name, created_at, certificate_hash",
        )
        .eq("certificate_hash", hash);

      if (error) {
        console.error("Error checking hash:", error);
        return {
          hash,
          exists: false,
          isDuplicate: false,
        };
      }

      const exists = data && data.length > 0;
      const isDuplicate = data && data.length > 1;

      if (exists && data.length > 0) {
        const firstCert = data[0];
        return {
          hash,
          exists: true,
          certificateId: firstCert.certificate_id,
          studentName: firstCert.student_name,
          createdAt: firstCert.created_at,
          isDuplicate,
        };
      }

      return {
        hash,
        exists: false,
        isDuplicate: false,
      };
    } catch (error) {
      console.error("Error in checkHashExists:", error);
      return {
        hash,
        exists: false,
        isDuplicate: false,
      };
    }
  }

  /**
   * Generate a test hash for given data
   */
  static generateTestHash(data: {
    studentName: string;
    courseName: string;
    grade: string;
    certificateId: string;
    institutionName: string;
    issuedBy: string;
    studentWallet: string;
    salt?: string;
  }): string {
    const timestamp = Date.now();
    const randomSalt = data.salt || randomBytes(16).toString("hex");
    const hashInput = `${data.studentName}|${data.courseName}|${data.grade}|${data.certificateId}|${data.institutionName}|${data.issuedBy}|${data.studentWallet}|${timestamp}|${randomSalt}`;

    return createHash("sha256").update(hashInput, "utf8").digest("hex");
  }

  /**
   * Find all hash conflicts in the database
   */
  static async findHashConflicts(): Promise<HashConflictReport> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, certificate_id, student_name, certificate_hash, created_at",
        )
        .order("certificate_hash");

      if (error) {
        throw error;
      }

      const hashCounts = new Map<
        string,
        Array<{
          id: string;
          certificateId: string;
          studentName: string;
          createdAt: string;
        }>
      >();

      // Group certificates by hash
      data.forEach((cert) => {
        const hash = cert.certificate_hash;
        if (!hashCounts.has(hash)) {
          hashCounts.set(hash, []);
        }
        hashCounts.get(hash)!.push({
          id: cert.id,
          certificateId: cert.certificate_id,
          studentName: cert.student_name,
          createdAt: cert.created_at,
        });
      });

      // Find duplicates
      const conflicts = Array.from(hashCounts.entries())
        .filter(([, certs]) => certs.length > 1)
        .map(([hash, certificates]) => ({
          hash,
          count: certificates.length,
          certificates,
        }));

      return {
        totalHashes: data.length,
        uniqueHashes: hashCounts.size,
        duplicateHashes: conflicts.length,
        conflicts,
      };
    } catch (error) {
      console.error("Error finding hash conflicts:", error);
      return {
        totalHashes: 0,
        uniqueHashes: 0,
        duplicateHashes: 0,
        conflicts: [],
      };
    }
  }

  /**
   * Resolve hash conflicts by regenerating hashes for duplicates
   */
  static async resolveAllHashConflicts(): Promise<{
    resolved: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let resolved = 0;
    let failed = 0;

    try {
      const conflictReport = await this.findHashConflicts();

      console.log(
        `Found ${conflictReport.conflicts.length} hash conflicts to resolve`,
      );

      for (const conflict of conflictReport.conflicts) {
        // Keep the first certificate's hash, regenerate for the rest
        const certificatesToUpdate = conflict.certificates.slice(1);

        for (const cert of certificatesToUpdate) {
          try {
            // Get full certificate data
            const { data: fullCert, error: fetchError } = await supabase
              .from("certificates")
              .select("*")
              .eq("id", cert.id)
              .single();

            if (fetchError || !fullCert) {
              errors.push(
                `Failed to fetch certificate ${cert.id}: ${fetchError?.message}`,
              );
              failed++;
              continue;
            }

            // Generate new unique hash
            const newHash = this.generateTestHash({
              studentName: fullCert.student_name,
              courseName: fullCert.course_name,
              grade: fullCert.grade,
              certificateId:
                fullCert.certificate_id + `-resolved-${Date.now()}`,
              institutionName: fullCert.institution_name,
              issuedBy: fullCert.issued_by,
              studentWallet: fullCert.student_wallet,
              salt: randomBytes(32).toString("hex"),
            });

            // Update the certificate with the new hash
            const { error: updateError } = await supabase
              .from("certificates")
              .update({ certificate_hash: newHash })
              .eq("id", cert.id);

            if (updateError) {
              errors.push(
                `Failed to update certificate ${cert.id}: ${updateError.message}`,
              );
              failed++;
            } else {
              console.log(
                `Resolved hash conflict for certificate ${cert.certificateId}`,
              );
              resolved++;
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            errors.push(
              `Error processing certificate ${cert.id}: ${errorMessage}`,
            );
            failed++;
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error in resolveAllHashConflicts: ${errorMessage}`);
    }

    return { resolved, failed, errors };
  }

  /**
   * Validate all certificate hashes in the database
   */
  static async validateAllHashes(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    invalidHashes: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("certificate_hash");

      if (error) {
        throw error;
      }

      const invalidHashes: string[] = [];
      const hashPattern = /^[a-fA-F0-9]{64}$/;

      data.forEach((cert) => {
        const hash = cert.certificate_hash;
        if (!hash || !hashPattern.test(hash)) {
          invalidHashes.push(hash || "NULL");
        }
      });

      return {
        total: data.length,
        valid: data.length - invalidHashes.length,
        invalid: invalidHashes.length,
        invalidHashes,
      };
    } catch (error) {
      console.error("Error validating hashes:", error);
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        invalidHashes: [],
      };
    }
  }

  /**
   * Clean up invalid hashes by regenerating them
   */
  static async cleanupInvalidHashes(): Promise<{
    cleaned: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cleaned = 0;
    let failed = 0;

    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .or("certificate_hash.is.null,certificate_hash.not.like.%[a-fA-F0-9]%");

      if (error) {
        throw error;
      }

      for (const cert of data) {
        try {
          const newHash = this.generateTestHash({
            studentName: cert.student_name,
            courseName: cert.course_name,
            grade: cert.grade,
            certificateId: cert.certificate_id,
            institutionName: cert.institution_name,
            issuedBy: cert.issued_by,
            studentWallet: cert.student_wallet,
            salt: randomBytes(16).toString("hex"),
          });

          const { error: updateError } = await supabase
            .from("certificates")
            .update({ certificate_hash: newHash })
            .eq("id", cert.id);

          if (updateError) {
            errors.push(
              `Failed to update certificate ${cert.id}: ${updateError.message}`,
            );
            failed++;
          } else {
            cleaned++;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Error processing certificate ${cert.id}: ${errorMessage}`,
          );
          failed++;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error in cleanupInvalidHashes: ${errorMessage}`);
    }

    return { cleaned, failed, errors };
  }

  /**
   * Get comprehensive hash statistics
   */
  static async getHashStatistics(): Promise<{
    totalCertificates: number;
    totalUniqueHashes: number;
    duplicateHashes: number;
    invalidHashes: number;
    hashCollisionRate: number;
    averageHashLength: number;
    hashDistribution: { [key: string]: number };
  }> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("certificate_hash");

      if (error) {
        throw error;
      }

      const hashCounts = new Map<string, number>();
      const hashLengths: number[] = [];
      const hashDistribution: { [key: string]: number } = {};
      let invalidCount = 0;

      const hashPattern = /^[a-fA-F0-9]{64}$/;

      data.forEach((cert) => {
        const hash = cert.certificate_hash;

        if (!hash || !hashPattern.test(hash)) {
          invalidCount++;
          return;
        }

        hashLengths.push(hash.length);

        // Count hash occurrences
        hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);

        // Hash prefix distribution (first 4 characters)
        const prefix = hash.substring(0, 4);
        hashDistribution[prefix] = (hashDistribution[prefix] || 0) + 1;
      });

      const duplicateHashes = Array.from(hashCounts.values()).filter(
        (count) => count > 1,
      ).length;
      const averageHashLength =
        hashLengths.length > 0
          ? hashLengths.reduce((sum, len) => sum + len, 0) / hashLengths.length
          : 0;

      const hashCollisionRate =
        data.length > 0 ? (duplicateHashes / data.length) * 100 : 0;

      return {
        totalCertificates: data.length,
        totalUniqueHashes: hashCounts.size,
        duplicateHashes,
        invalidHashes: invalidCount,
        hashCollisionRate: Math.round(hashCollisionRate * 100) / 100,
        averageHashLength: Math.round(averageHashLength * 100) / 100,
        hashDistribution,
      };
    } catch (error) {
      console.error("Error getting hash statistics:", error);
      return {
        totalCertificates: 0,
        totalUniqueHashes: 0,
        duplicateHashes: 0,
        invalidHashes: 0,
        hashCollisionRate: 0,
        averageHashLength: 0,
        hashDistribution: {},
      };
    }
  }

  /**
   * Generate a debug report for a specific certificate
   */
  static async debugCertificate(certificateId: string): Promise<{
    found: boolean;
    certificate?: unknown;
    hashInfo?: HashDebugInfo;
    regeneratedHash?: string;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    try {
      // Get certificate data
      const { data: cert, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", certificateId)
        .single();

      if (error || !cert) {
        return {
          found: false,
          recommendations: ["Certificate not found in database"],
        };
      }

      // Check hash info
      const hashInfo = await this.checkHashExists(cert.certificate_hash);

      // Generate what the hash should be
      const regeneratedHash = this.generateTestHash({
        studentName: cert.student_name,
        courseName: cert.course_name,
        grade: cert.grade,
        certificateId: cert.certificate_id,
        institutionName: cert.institution_name,
        issuedBy: cert.issued_by,
        studentWallet: cert.student_wallet,
      });

      // Generate recommendations
      if (!cert.certificate_hash) {
        recommendations.push("Certificate has no hash - should be regenerated");
      } else if (!/^[a-fA-F0-9]{64}$/.test(cert.certificate_hash)) {
        recommendations.push(
          "Certificate hash is invalid format - should be regenerated",
        );
      }

      if (hashInfo.isDuplicate) {
        recommendations.push(
          "Certificate hash is duplicated - should be regenerated with unique salt",
        );
      }

      if (cert.certificate_hash !== regeneratedHash) {
        recommendations.push(
          "Current hash doesn't match regenerated hash - this is normal due to timestamp/salt differences",
        );
      }

      if (recommendations.length === 0) {
        recommendations.push("Certificate hash appears to be valid");
      }

      return {
        found: true,
        certificate: cert,
        hashInfo,
        regeneratedHash,
        recommendations,
      };
    } catch (error) {
      console.error("Error debugging certificate:", error);
      return {
        found: false,
        recommendations: [
          `Error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }
}

// Utility functions for quick debugging
export async function quickHashCheck(hash: string): Promise<boolean> {
  const info = await CertificateHashDebugger.checkHashExists(hash);
  return info.exists;
}

export async function quickConflictReport(): Promise<void> {
  const report = await CertificateHashDebugger.findHashConflicts();
  console.log("Hash Conflict Report:");
  console.log(`Total certificates: ${report.totalHashes}`);
  console.log(`Unique hashes: ${report.uniqueHashes}`);
  console.log(`Duplicate hashes: ${report.duplicateHashes}`);

  if (report.conflicts.length > 0) {
    console.log("\nConflicts:");
    report.conflicts.forEach((conflict, index) => {
      console.log(
        `${index + 1}. Hash: ${conflict.hash} (${conflict.count} certificates)`,
      );
      conflict.certificates.forEach((cert) => {
        console.log(`   - ${cert.certificateId} (${cert.studentName})`);
      });
    });
  }
}

export async function quickStatistics(): Promise<void> {
  const stats = await CertificateHashDebugger.getHashStatistics();
  console.log("Certificate Hash Statistics:");
  console.log(`Total certificates: ${stats.totalCertificates}`);
  console.log(`Unique hashes: ${stats.totalUniqueHashes}`);
  console.log(`Duplicate hashes: ${stats.duplicateHashes}`);
  console.log(`Invalid hashes: ${stats.invalidHashes}`);
  console.log(`Hash collision rate: ${stats.hashCollisionRate}%`);
  console.log(`Average hash length: ${stats.averageHashLength}`);
}
