import { createHash, randomBytes } from "crypto";
import { PublicKey } from "@solana/web3.js";
import {
  CertificateHashMetadata,
  BlockchainCertificateData,
} from "./anchor/enhanced-transactions";

export interface CertificateHashData {
  certificateId: string;
  studentName: string;
  studentWallet: string;
  courseName: string;
  grade: string;
  institutionName: string;
  issuedBy: string;
  issuedDate: string;
  salt?: string;
}

/**
 * Generate a secure SHA-256 hash for certificate data
 */
export function generateCertificateHash(data: CertificateHashData): string {
  const salt = data.salt || randomBytes(16).toString("hex");
  const hashData = `${data.certificateId}|${data.studentName}|${data.studentWallet}|${data.courseName}|${data.grade}|${data.institutionName}|${data.issuedBy}|${data.issuedDate}|${salt}`;

  return createHash("sha256").update(hashData, "utf8").digest("hex");
}

/**
 * Generate a deterministic hash (without salt) for verification purposes
 */
export function generateDeterministicHash(data: CertificateHashData): string {
  const hashData = `${data.certificateId}|${data.studentName}|${data.studentWallet}|${data.courseName}|${data.grade}|${data.institutionName}|${data.issuedBy}|${data.issuedDate}`;

  return createHash("sha256").update(hashData, "utf8").digest("hex");
}

/**
 * Verify if a provided hash matches the certificate data
 */
export function verifyCertificateHash(
  data: CertificateHashData,
  providedHash: string,
): boolean {
  // Try deterministic hash first
  const deterministicHash = generateDeterministicHash(data);
  if (deterministicHash === providedHash) {
    return true;
  }

  // If salt is provided, try with salt
  if (data.salt) {
    const saltedHash = generateCertificateHash(data);
    return saltedHash === providedHash;
  }

  return false;
}

/**
 * Create IPFS metadata for certificate
 */
export function createIPFSMetadata(
  certificateData: CertificateHashData,
  certificateHash: string,
): {
  name: string;
  description: string;
  image?: string;
  attributes: Array<{ trait_type: string; value: string }>;
  certificate_hash: string;
  blockchain_network: string;
} {
  return {
    name: `Certificate - ${certificateData.courseName}`,
    description: `Academic certificate for ${certificateData.studentName} in ${certificateData.courseName} issued by ${certificateData.institutionName}`,
    attributes: [
      { trait_type: "Student Name", value: certificateData.studentName },
      { trait_type: "Course Name", value: certificateData.courseName },
      { trait_type: "Grade", value: certificateData.grade },
      { trait_type: "Institution", value: certificateData.institutionName },
      { trait_type: "Issued Date", value: certificateData.issuedDate },
      { trait_type: "Certificate ID", value: certificateData.certificateId },
    ],
    certificate_hash: certificateHash,
    blockchain_network: "Solana",
  };
}

/**
 * Validate certificate hash format
 */
export function isValidHashFormat(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Extract certificate data from blockchain response
 */
export function extractCertificateFromBlockchain(
  blockchainData: BlockchainCertificateData,
): CertificateHashData {
  return {
    certificateId: blockchainData.certificateId,
    studentName: blockchainData.studentName,
    studentWallet: blockchainData.studentWallet.toBase58(),
    courseName: blockchainData.courseName,
    grade: blockchainData.grade,
    institutionName: blockchainData.institutionName,
    issuedBy: blockchainData.issuedBy,
    issuedDate: new Date(blockchainData.issuedAt.toNumber() * 1000)
      .toISOString()
      .split("T")[0],
  };
}

/**
 * Generate QR code data for certificate verification
 */
export function generateQRCodeData(
  certificateId: string,
  institutionPublicKey: string,
  certificateHash: string,
): {
  type: string;
  certificateId: string;
  institution: string;
  hash: string;
  verificationUrl: string;
} {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return {
    type: "solana_certificate",
    certificateId,
    institution: institutionPublicKey,
    hash: certificateHash,
    verificationUrl: `${baseUrl}/verify/${certificateId}?institution=${institutionPublicKey}&hash=${certificateHash}`,
  };
}

/**
 * Hash comparison utilities
 */
export class HashComparator {
  static compare(hash1: string, hash2: string): boolean {
    if (!isValidHashFormat(hash1) || !isValidHashFormat(hash2)) {
      return false;
    }
    return hash1.toLowerCase() === hash2.toLowerCase();
  }

  static batchCompare(
    hashes: string[],
    targetHash: string,
  ): { matches: string[]; nonMatches: string[] } {
    const matches: string[] = [];
    const nonMatches: string[] = [];

    hashes.forEach((hash) => {
      if (this.compare(hash, targetHash)) {
        matches.push(hash);
      } else {
        nonMatches.push(hash);
      }
    });

    return { matches, nonMatches };
  }
}

/**
 * Certificate integrity checker
 */
export class CertificateIntegrityChecker {
  static async checkIntegrity(
    supabaseData: {
      student_name: string;
      course_name: string;
      grade: string;
      certificate_id: string;
      institution_name: string;
      issued_by: string;
      student_wallet: string;
      issued_date: string;
    },
    blockchainData: BlockchainCertificateData,
  ): Promise<{
    isValid: boolean;
    discrepancies: string[];
    confidence: number;
  }> {
    const discrepancies: string[] = [];

    // Check basic fields
    if (supabaseData.student_name !== blockchainData.studentName) {
      discrepancies.push("Student name mismatch");
    }

    if (supabaseData.course_name !== blockchainData.courseName) {
      discrepancies.push("Course name mismatch");
    }

    if (supabaseData.grade !== blockchainData.grade) {
      discrepancies.push("Grade mismatch");
    }

    if (supabaseData.certificate_id !== blockchainData.certificateId) {
      discrepancies.push("Certificate ID mismatch");
    }

    // Check hash integrity
    const reconstructedData: CertificateHashData = {
      certificateId: supabaseData.certificate_id,
      studentName: supabaseData.student_name,
      studentWallet: supabaseData.student_wallet,
      courseName: supabaseData.course_name,
      grade: supabaseData.grade,
      institutionName: supabaseData.institution_name,
      issuedBy: supabaseData.issued_by,
      issuedDate: supabaseData.issued_date,
    };

    const expectedHash = generateDeterministicHash(reconstructedData);
    if (!HashComparator.compare(expectedHash, blockchainData.certificateHash)) {
      discrepancies.push("Certificate hash integrity failed");
    }

    const confidence = Math.max(0, (5 - discrepancies.length) / 5);

    return {
      isValid: discrepancies.length === 0,
      discrepancies,
      confidence,
    };
  }
}

/**
 * Blockchain certificate utilities
 */
export class BlockchainCertificateUtils {
  /**
   * Create certificate metadata for blockchain storage
   */
  static createMetadataForBlockchain(
    certificateData: CertificateHashData,
    ipfsHash?: string,
  ): CertificateHashMetadata {
    const hash = generateDeterministicHash(certificateData);

    return {
      certificateId: certificateData.certificateId,
      studentName: certificateData.studentName,
      studentWallet: certificateData.studentWallet,
      courseName: certificateData.courseName,
      grade: certificateData.grade,
      institutionName: certificateData.institutionName,
      issuedBy: certificateData.issuedBy,
      issuedDate: certificateData.issuedDate,
      certificateHash: hash,
      ipfsHash,
      additionalMetadata: {
        timestamp: Date.now().toString(),
        version: "1.0",
      },
    };
  }

  /**
   * Validate metadata before blockchain storage
   */
  static validateMetadata(metadata: CertificateHashMetadata): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!metadata.certificateId) {
      errors.push("Certificate ID is required");
    }

    if (!metadata.studentName || metadata.studentName.length < 2) {
      errors.push("Valid student name is required");
    }

    if (!metadata.studentWallet) {
      errors.push("Student wallet address is required");
    } else {
      try {
        new PublicKey(metadata.studentWallet);
      } catch {
        errors.push("Invalid student wallet address format");
      }
    }

    if (!metadata.courseName) {
      errors.push("Course name is required");
    }

    if (!metadata.grade) {
      errors.push("Grade is required");
    }

    if (!metadata.institutionName) {
      errors.push("Institution name is required");
    }

    if (!metadata.issuedBy) {
      errors.push("Issuer information is required");
    }

    if (!metadata.issuedDate) {
      errors.push("Issue date is required");
    }

    if (
      !metadata.certificateHash ||
      !isValidHashFormat(metadata.certificateHash)
    ) {
      errors.push("Valid certificate hash is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate merkle proof for batch verification
   */
  static generateMerkleProof(hashes: string[]): {
    root: string;
    proofs: { [hash: string]: string[] };
  } {
    if (hashes.length === 0) {
      throw new Error("Cannot generate merkle proof for empty hash array");
    }

    if (hashes.length === 1) {
      return {
        root: hashes[0],
        proofs: { [hashes[0]]: [] },
      };
    }

    // Simple merkle tree implementation
    const tree: string[][] = [hashes];
    const proofs: { [hash: string]: string[] } = {};

    // Initialize proofs
    hashes.forEach((hash) => {
      proofs[hash] = [];
    });

    // Build tree levels
    let currentLevel = hashes;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Handle odd number of nodes

        const combined = createHash("sha256")
          .update(left + right, "utf8")
          .digest("hex");

        nextLevel.push(combined);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Generate proofs for each original hash
    for (const originalHash of hashes) {
      let index = hashes.indexOf(originalHash);

      for (let level = 0; level < tree.length - 1; level++) {
        const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

        if (siblingIndex < tree[level].length) {
          proofs[originalHash].push(tree[level][siblingIndex]);
        }

        index = Math.floor(index / 2);
      }
    }

    return {
      root: tree[tree.length - 1][0],
      proofs,
    };
  }
}

/**
 * Example usage functions
 */
export class CertificateHashExamples {
  /**
   * Example: Create and store certificate hash on Solana
   */
  static async exampleCreateCertificateWithHash() {
    // Example certificate data
    const certificateData: CertificateHashData = {
      certificateId: "CERT-2024-001",
      studentName: "John Doe",
      studentWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      courseName: "Computer Science Degree",
      grade: "A+",
      institutionName: "University of Technology",
      issuedBy: "Dr. Jane Smith",
      issuedDate: "2024-01-15",
    };

    // Generate hash
    const certificateHash = generateDeterministicHash(certificateData);
    console.log("Generated hash:", certificateHash);

    // Create metadata for blockchain
    const metadata =
      BlockchainCertificateUtils.createMetadataForBlockchain(certificateData);

    // Validate before storing
    const validation = BlockchainCertificateUtils.validateMetadata(metadata);
    if (!validation.isValid) {
      console.error("Validation errors:", validation.errors);
      return;
    }

    console.log("Certificate ready for blockchain storage:", metadata);
    return { certificateData, metadata, hash: certificateHash };
  }

  /**
   * Example: Verify certificate hash
   */
  static async exampleVerifyCertificateHash() {
    const certificateData: CertificateHashData = {
      certificateId: "CERT-2024-001",
      studentName: "John Doe",
      studentWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      courseName: "Computer Science Degree",
      grade: "A+",
      institutionName: "University of Technology",
      issuedBy: "Dr. Jane Smith",
      issuedDate: "2024-01-15",
    };

    const providedHash = "a1b2c3d4e5f6..."; // Hash to verify
    const isValid = verifyCertificateHash(certificateData, providedHash);

    console.log("Hash verification result:", isValid);
    return isValid;
  }

  /**
   * Example: Generate QR code for certificate
   */
  static exampleGenerateQRCode() {
    const qrData = generateQRCodeData(
      "CERT-2024-001",
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "a1b2c3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef",
    );

    console.log("QR Code Data:", JSON.stringify(qrData, null, 2));
    return qrData;
  }

  /**
   * Example: Batch verify multiple certificates
   */
  static async exampleBatchVerification() {
    const certificates = [
      {
        certificateId: "CERT-2024-001",
        hash: "hash1...",
        institutionPublicKey: new PublicKey(
          "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        ),
      },
      {
        certificateId: "CERT-2024-002",
        hash: "hash2...",
        institutionPublicKey: new PublicKey(
          "8VzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        ),
      },
    ];

    // This would be called with the actual service
    console.log("Batch verification setup:", certificates);
    return certificates;
  }
}

// Export utility constants
export const HASH_ALGORITHMS = {
  SHA256: "sha256",
  SHA512: "sha512",
} as const;

export const CERTIFICATE_HASH_LENGTH = 64; // SHA-256 hex length
export const DEFAULT_SALT_LENGTH = 16;

// Export validation patterns
export const VALIDATION_PATTERNS = {
  CERTIFICATE_ID: /^[A-Z0-9-]{1,50}$/,
  WALLET_ADDRESS: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
  HASH_FORMAT: /^[a-fA-F0-9]{64}$/,
} as const;
