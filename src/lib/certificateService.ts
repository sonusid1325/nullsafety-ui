import { supabase, Certificate as SupabaseCertificate } from "./supabase";
import { TransactionManager, TransactionResult } from "./anchor/transactions";
import {
  EnhancedTransactionManager,
  EnhancedTransactionResult,
  CertificateHashMetadata,
  BlockchainCertificateData,
  createCertificateMetadata,
  isValidCertificateHash,
} from "./anchor/enhanced-transactions";
import { SolanaClient } from "./anchor/client";
import { WalletContextState } from "@solana/wallet-adapter-react";
import type { Wallet } from "@solana/wallet-adapter-react";
import { WalletInterface, createMockWallet } from "./walletTypes";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createHash, randomBytes } from "crypto";

// Helper function to ensure wallet is WalletContextState
function ensureWalletContextState(
  wallet: WalletInterface | WalletContextState,
): WalletContextState {
  // If it's already a WalletContextState, return it
  if ("autoConnect" in wallet && "wallets" in wallet) {
    return wallet as WalletContextState;
  }

  // If it's a WalletInterface, we need to create a mock WalletContextState
  const walletInterface = wallet as WalletInterface;
  return {
    publicKey: walletInterface.publicKey,
    connected: walletInterface.connected,
    connecting: false,
    disconnecting: false,
    wallet: null,
    wallets: [],
    autoConnect: false,
    signTransaction: walletInterface.signTransaction,
    signAllTransactions: walletInterface.signAllTransactions,
    connect: async () => {},
    disconnect: async () => {},
    sendTransaction: undefined,
    signMessage: undefined,
    signIn: undefined,
    select: async () => {},
  } as unknown as WalletContextState;
}

export interface CertificateData {
  studentName: string;
  rollNo: string;
  courseName: string;
  grade: string;
  institutionName: string;
  issuedBy: string;
  studentWallet: string;
  certificateId?: string;
}

export interface CertificateResult {
  success: boolean;
  certificate?: SupabaseCertificate;
  blockchainSignature?: string;
  certificateHash?: string;
  blockchainAddress?: PublicKey;
  onChainMetadata?: CertificateHashMetadata;
  error?: string;
  partialSuccess?: {
    supabase: boolean;
    blockchain: boolean;
  };
}

export interface VerificationResult {
  isValid: boolean;
  certificate?: SupabaseCertificate;
  blockchainData?: BlockchainCertificateData;
  hashVerification?: {
    isValid: boolean;
    onChainHash: string;
    providedHash: string;
  };
  verificationSources: {
    supabase: boolean;
    blockchain: boolean;
  };
  error?: string;
}

export class UnifiedCertificateService {
  private transactionManager: TransactionManager | null = null;
  private enhancedTransactionManager: EnhancedTransactionManager | null = null;

  constructor(provider?: AnchorProvider) {
    if (provider) {
      this.transactionManager = new TransactionManager(provider);
      this.enhancedTransactionManager = new EnhancedTransactionManager(
        provider,
      );
    }
  }

  /**
   * Creates a certificate in both Supabase and blockchain with enhanced hash storage
   */
  async createCertificate(
    certificateData: CertificateData,
    wallet: WalletInterface | WalletContextState,
  ): Promise<CertificateResult> {
    // Validate input data first
    const validation = this.validateCertificateData(certificateData);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`,
        partialSuccess: {
          supabase: false,
          blockchain: false,
        },
      };
    }

    const certificateId =
      certificateData.certificateId || this.generateCertificateId();
    let supabaseResult: SupabaseCertificate | null = null;
    let enhancedBlockchainResult: EnhancedTransactionResult | null = null;

    try {
      // Generate unique certificate hash with retry mechanism
      const { certificateHash, attempts } =
        await this.generateUniqueCertificateHash(
          certificateData,
          certificateId,
        );

      console.log(
        `Generated unique certificate hash after ${attempts} attempts`,
      );

      // Step 1: Create certificate in Supabase first
      console.log("Creating certificate in Supabase...");
      const supabaseCertificate = {
        student_name: certificateData.studentName,
        roll_no: certificateData.rollNo,
        course_name: certificateData.courseName,
        grade: certificateData.grade,
        certificate_id: certificateId,
        institution_name: certificateData.institutionName,
        issued_by: certificateData.issuedBy,
        student_wallet: certificateData.studentWallet,
        issued_date: new Date().toISOString().split("T")[0],
        certificate_hash: certificateHash,
        is_revoked: false,
      };

      const { data: dbCertificate, error: dbError } = await supabase
        .from("certificates")
        .insert([supabaseCertificate])
        .select()
        .single();

      if (dbError) {
        // If it's still a duplicate hash error, try once more with a new hash
        if (
          dbError.message.includes("duplicate key") &&
          dbError.message.includes("certificate_hash")
        ) {
          console.log("Hash collision detected, generating new hash...");
          const { certificateHash: newHash } =
            await this.generateUniqueCertificateHash(
              certificateData,
              certificateId,
              true, // force new hash
            );
          supabaseCertificate.certificate_hash = newHash;

          const { data: retryDbCertificate, error: retryDbError } =
            await supabase
              .from("certificates")
              .insert([supabaseCertificate])
              .select()
              .single();

          if (retryDbError) {
            throw new Error(
              `Supabase error after retry: ${retryDbError.message}`,
            );
          }
          supabaseResult = retryDbCertificate;
        } else {
          throw new Error(`Supabase error: ${dbError.message}`);
        }
      } else {
        supabaseResult = dbCertificate;
      }

      console.log("Certificate created in Supabase:", supabaseResult?.id);

      // Step 2: Store certificate hash with metadata on blockchain
      if (this.enhancedTransactionManager && wallet.publicKey) {
        console.log("Storing certificate hash with metadata on blockchain...");

        const metadata = createCertificateMetadata({
          certificateId,
          studentName: certificateData.studentName,
          studentWallet: certificateData.studentWallet,
          courseName: certificateData.courseName,
          grade: certificateData.grade,
          institutionName: certificateData.institutionName,
          issuedBy: certificateData.issuedBy,
          issuedDate: supabaseCertificate.issued_date,
        });

        metadata.certificateHash = certificateHash;

        const walletContext = ensureWalletContextState(wallet);
        enhancedBlockchainResult =
          await this.enhancedTransactionManager.storeCertificateHashWithMetadata(
            walletContext,
            metadata,
          );

        if (!enhancedBlockchainResult?.success) {
          // Blockchain failed, but Supabase succeeded - mark as partial success
          console.warn(
            "Enhanced blockchain transaction failed:",
            enhancedBlockchainResult?.error,
          );

          // Update Supabase record to indicate blockchain sync issue
          if (supabaseResult) {
            await supabase
              .from("certificates")
              .update({
                certificate_hash: `${certificateHash}_BLOCKCHAIN_PENDING`,
              })
              .eq("id", supabaseResult.id);
          }

          return {
            success: false,
            certificate: supabaseResult || undefined,
            error: `Certificate created in database but blockchain transaction failed: ${enhancedBlockchainResult?.error}`,
            partialSuccess: {
              supabase: true,
              blockchain: false,
            },
          };
        }

        console.log(
          "Certificate with hash stored on blockchain:",
          enhancedBlockchainResult.signature,
        );
      }

      return {
        success: true,
        certificate: supabaseResult || undefined,
        blockchainSignature: enhancedBlockchainResult?.signature,
        certificateHash: enhancedBlockchainResult?.blockchainHash,
        blockchainAddress: enhancedBlockchainResult?.certificateAddress,
        onChainMetadata: enhancedBlockchainResult?.onChainMetadata,
      };
    } catch (error) {
      console.error("Certificate creation error:", error);

      // If blockchain succeeded but we're here, it means there was an error after both operations
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // If we have a Supabase result but failed later, it's a partial success
      if (supabaseResult) {
        return {
          success: false,
          certificate: supabaseResult,
          blockchainSignature: enhancedBlockchainResult?.signature,
          certificateHash: enhancedBlockchainResult?.blockchainHash,
          error: errorMessage,
          partialSuccess: {
            supabase: true,
            blockchain: enhancedBlockchainResult?.success || false,
          },
        };
      }

      return {
        success: false,
        error: errorMessage,
        partialSuccess: {
          supabase: false,
          blockchain: false,
        },
      };
    }
  }

  /**
   * Verifies a certificate against both Supabase and blockchain with hash verification
   */
  async verifyCertificate(
    certificateId: string,
    wallet?: WalletInterface | WalletContextState,
    providedHash?: string,
  ): Promise<VerificationResult> {
    let supabaseValid = false;
    let blockchainValid = false;
    let certificate: SupabaseCertificate | null = null;
    let blockchainData: BlockchainCertificateData | null = null;
    let hashVerification:
      | { isValid: boolean; onChainHash: string; providedHash: string }
      | undefined;

    try {
      // Check Supabase first
      console.log("Verifying certificate in Supabase:", certificateId);
      const { data: dbCertificate, error: dbError } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", certificateId)
        .single();

      if (!dbError && dbCertificate && !dbCertificate.is_revoked) {
        supabaseValid = true;
        certificate = dbCertificate;

        // Update verification count
        await supabase
          .from("certificates")
          .update({
            verification_count: (dbCertificate.verification_count || 0) + 1,
          })
          .eq("id", dbCertificate.id);

        console.log("Certificate found in Supabase");
      }

      // Enhanced blockchain verification with hash checking
      if (this.enhancedTransactionManager && certificate) {
        try {
          console.log("Verifying certificate hash on blockchain...");

          // Find the institution public key from the certificate
          const institutionPublicKey = new PublicKey(certificate.issued_by);

          // Get certificate data with hash from blockchain
          blockchainData =
            await this.enhancedTransactionManager.getCertificateHashAndMetadata(
              certificateId,
              institutionPublicKey,
            );

          if (blockchainData && !blockchainData.isRevoked) {
            blockchainValid = true;
            console.log("Certificate found on blockchain");

            // Verify hash if provided
            if (providedHash && blockchainData.certificateHash) {
              const isHashValid =
                blockchainData.certificateHash === providedHash;
              hashVerification = {
                isValid: isHashValid,
                onChainHash: blockchainData.certificateHash,
                providedHash: providedHash,
              };
              console.log(
                `Hash verification: ${isHashValid ? "VALID" : "INVALID"}`,
              );
            }

            // Record verification on blockchain if wallet is provided
            if (wallet && wallet.publicKey) {
              const walletContext = ensureWalletContextState(wallet);
              const verifyResult =
                await this.enhancedTransactionManager.verifyCertificateHash(
                  walletContext,
                  certificateId,
                  institutionPublicKey,
                  certificate.certificate_hash,
                );
              console.log("Hash verification result:", verifyResult.isValid);
            }
          }
        } catch (blockchainError) {
          console.warn(
            "Enhanced blockchain verification failed:",
            blockchainError,
          );

          // Fallback to basic blockchain verification
          if (this.transactionManager) {
            try {
              const institutionPublicKey = new PublicKey(certificate.issued_by);
              const [institutionPDA] =
                SolanaClient.getInstitutionPDA(institutionPublicKey);
              const [certificatePDA] = SolanaClient.getCertificatePDA(
                institutionPDA,
                certificateId,
              );

              const client = new SolanaClient();
              const basicBlockchainData =
                await client.getCertificate(certificatePDA);

              if (
                basicBlockchainData &&
                typeof basicBlockchainData === "object" &&
                "isRevoked" in basicBlockchainData &&
                !basicBlockchainData.isRevoked
              ) {
                blockchainValid = true;
                console.log("Certificate verified on blockchain (basic)");
              }
            } catch (fallbackError) {
              console.warn(
                "Fallback blockchain verification also failed:",
                fallbackError,
              );
            }
          }
        }
      }

      const isValid =
        supabaseValid && (blockchainValid || !this.transactionManager);

      return {
        isValid,
        certificate: certificate || undefined,
        blockchainData: blockchainData || undefined,
        hashVerification,
        verificationSources: {
          supabase: supabaseValid,
          blockchain: blockchainValid,
        },
      };
    } catch (error) {
      console.error("Certificate verification error:", error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Verification failed",
        verificationSources: {
          supabase: supabaseValid,
          blockchain: blockchainValid,
        },
      };
    }
  }

  /**
   * Verify certificate hash directly on blockchain
   */
  async verifyCertificateHashOnBlockchain(
    certificateId: string,
    institutionPublicKey: PublicKey,
    providedHash: string,
    wallet?: WalletInterface | WalletContextState,
  ): Promise<{
    isValid: boolean;
    onChainHash?: string;
    certificateData?: BlockchainCertificateData;
    error?: string;
  }> {
    if (!this.enhancedTransactionManager) {
      return {
        isValid: false,
        error: "Enhanced transaction manager not available",
      };
    }

    try {
      const walletContext = wallet ? ensureWalletContextState(wallet) : null;
      const result =
        await this.enhancedTransactionManager.verifyCertificateHash(
          walletContext || ({} as WalletContextState),
          certificateId,
          institutionPublicKey,
          providedHash,
        );

      return result;
    } catch (error) {
      console.error("Direct hash verification error:", error);
      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : "Hash verification failed",
      };
    }
  }

  /**
   * Get all certificates with hashes for an institution
   */
  async getInstitutionCertificatesWithHashes(
    institutionPublicKey: PublicKey,
  ): Promise<BlockchainCertificateData[]> {
    if (!this.enhancedTransactionManager) {
      console.warn("Enhanced transaction manager not available");
      return [];
    }

    try {
      return await this.enhancedTransactionManager.getInstitutionCertificatesWithHashes(
        institutionPublicKey,
      );
    } catch (error) {
      console.error("Error fetching institution certificates:", error);
      return [];
    }
  }

  /**
   * Resolve hash conflicts by checking and regenerating if needed
   */
  async resolveHashConflict(
    certificateId: string,
    originalData: CertificateData,
  ): Promise<{ newHash: string; resolved: boolean }> {
    try {
      const { certificateHash: newHash } =
        await this.generateUniqueCertificateHash(
          originalData,
          certificateId,
          true, // force new hash
        );

      // Update the certificate with the new hash
      const { error } = await supabase
        .from("certificates")
        .update({ certificate_hash: newHash })
        .eq("certificate_id", certificateId);

      if (error) {
        console.error("Error resolving hash conflict:", error);
        return { newHash: "", resolved: false };
      }

      return { newHash, resolved: true };
    } catch (error) {
      console.error("Error in hash conflict resolution:", error);
      return { newHash: "", resolved: false };
    }
  }

  /**
   * Check if a certificate hash exists in the database
   */
  async checkHashExists(hash: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("id")
        .eq("certificate_hash", hash)
        .single();

      if (error && error.code === "PGRST116") {
        return false; // No matching rows found
      }

      return !!data;
    } catch (error) {
      console.error("Error checking hash existence:", error);
      return false;
    }
  }

  /**
   * Batch verify multiple certificate hashes
   */
  async batchVerifyCertificateHashes(
    certificates: {
      certificateId: string;
      hash: string;
      institutionPublicKey: PublicKey;
    }[],
  ): Promise<{
    verified: string[];
    failed: string[];
    revoked: string[];
    notFound: string[];
  }> {
    if (!this.enhancedTransactionManager) {
      return {
        verified: [],
        failed: certificates.map((c) => c.certificateId),
        revoked: [],
        notFound: [],
      };
    }

    try {
      return await this.enhancedTransactionManager.batchVerifyCertificateHashes(
        certificates,
      );
    } catch (error) {
      console.error("Batch verification error:", error);
      return {
        verified: [],
        failed: certificates.map((c) => c.certificateId),
        revoked: [],
        notFound: [],
      };
    }
  }

  /**
   * Revokes a certificate in both systems
   */
  async revokeCertificate(
    certificateId: string,
    wallet: WalletInterface | WalletContextState,
    reason?: string,
  ): Promise<CertificateResult> {
    try {
      // Step 1: Find certificate in Supabase
      const { data: certificate, error: findError } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", certificateId)
        .single();

      if (findError || !certificate) {
        throw new Error("Certificate not found in database");
      }

      if (certificate.issued_by !== wallet.publicKey?.toString()) {
        throw new Error(
          "Only the issuing institution can revoke this certificate",
        );
      }

      // Step 2: Revoke in Supabase
      const { data: revokedCertificate, error: revokeError } = await supabase
        .from("certificates")
        .update({
          is_revoked: true,
          updated_at: new Date().toISOString(),
        })
        .eq("certificate_id", certificateId)
        .select()
        .single();

      if (revokeError) {
        throw new Error(`Database revocation failed: ${revokeError.message}`);
      }

      // Step 3: Revoke on blockchain
      let blockchainResult: TransactionResult | null = null;
      if (this.transactionManager) {
        const institutionPublicKey = new PublicKey(certificate.issued_by);
        const [institutionPDA] =
          SolanaClient.getInstitutionPDA(institutionPublicKey);
        const [certificatePDA] = SolanaClient.getCertificatePDA(
          institutionPDA,
          certificateId,
        );

        const walletContext = ensureWalletContextState(wallet);
        blockchainResult = await this.transactionManager.revokeCertificate(
          walletContext,
          certificatePDA,
        );

        if (!blockchainResult.success) {
          console.warn("Blockchain revocation failed:", blockchainResult.error);
          // Don't revert Supabase - partial success is acceptable for revocation
        }
      }

      return {
        success: true,
        certificate: revokedCertificate,
        blockchainSignature: blockchainResult?.signature,
      };
    } catch (error) {
      console.error("Certificate revocation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Revocation failed",
      };
    }
  }

  /**
   * Syncs certificates between blockchain and Supabase
   */
  async syncCertificates(wallet: WalletContextState | Wallet | any): Promise<{
    synced: number;
    errors: string[];
  }> {
    if (!this.transactionManager || !wallet.publicKey) {
      throw new Error("Blockchain connection required for sync");
    }

    const errors: string[] = [];
    let synced = 0;

    try {
      // First, check if the blockchain system is initialized
      const client = new SolanaClient();
      const connection = this.transactionManager.getConnection();

      // Create a mock wallet for the provider
      const mockWallet = createMockWallet(ensureWalletContextState(wallet));
      if (!mockWallet) {
        errors.push("Failed to create wallet interface");
        return { synced: 0, errors };
      }

      // Initialize client with the connection from transaction manager
      const anchorProvider = new AnchorProvider(
        connection,
        mockWallet as never,
        { commitment: "confirmed" },
      );
      client.initializeProgram(anchorProvider);

      const globalState = await client.getGlobalState();
      if (!globalState) {
        errors.push(
          "Blockchain system not initialized. Please initialize the system first using the Admin Setup page.",
        );
        return { synced: 0, errors };
      }

      // Get all certificates from Supabase for this issuer
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("issued_by", wallet.publicKey.toString())
        .eq("is_revoked", false);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!certificates || certificates.length === 0) {
        return { synced: 0, errors: [] };
      }

      // Check each certificate on blockchain
      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);

      for (const cert of certificates) {
        try {
          const [certificatePDA] = SolanaClient.getCertificatePDA(
            institutionPDA,
            cert.certificate_id,
          );
          const blockchainCert = await client.getCertificate(certificatePDA);

          if (!blockchainCert) {
            // Certificate doesn't exist on blockchain, attempt to create it
            console.log(
              `Syncing certificate ${cert.certificate_id} to blockchain...`,
            );

            const walletContext = ensureWalletContextState(wallet);
            const result = await this.transactionManager.issueCertificate(
              walletContext,
              cert.student_name,
              cert.course_name,
              cert.grade,
              cert.certificate_id,
            );

            if (result.success) {
              synced++;
              console.log(
                `Successfully synced certificate ${cert.certificate_id}`,
              );
            } else {
              errors.push(
                `Failed to sync ${cert.certificate_id}: ${result.error}`,
              );
            }
          } else if (blockchainCert.isRevoked !== cert.is_revoked) {
            // Status mismatch between systems
            errors.push(
              `Status mismatch for certificate ${cert.certificate_id}`,
            );
          }
        } catch (certError) {
          errors.push(
            `Error checking certificate ${cert.certificate_id}: ${certError}`,
          );
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error("Sync operation failed:", error);
      throw error;
    }
  }

  /**
   * Gets certificates from both sources
   */
  async getCertificates(
    issuedBy?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{
    certificates: SupabaseCertificate[];
    total: number;
    blockchainStatus: { [key: string]: boolean };
  }> {
    try {
      let query = supabase
        .from("certificates")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (issuedBy) {
        query = query.eq("issued_by", issuedBy);
      }

      const {
        data: certificates,
        error,
        count,
      } = await query.range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const blockchainStatus: { [key: string]: boolean } = {};

      // Check blockchain status for each certificate if we have blockchain connection
      if (this.transactionManager && certificates) {
        const client = new SolanaClient();

        for (const cert of certificates) {
          try {
            const institutionPublicKey = new PublicKey(cert.issued_by);
            const [institutionPDA] =
              SolanaClient.getInstitutionPDA(institutionPublicKey);
            const [certificatePDA] = SolanaClient.getCertificatePDA(
              institutionPDA,
              cert.certificate_id,
            );

            const blockchainCert = await client.getCertificate(certificatePDA);
            blockchainStatus[cert.certificate_id] =
              !!blockchainCert && !blockchainCert.isRevoked;
          } catch {
            blockchainStatus[cert.certificate_id] = false;
          }
        }
      }

      return {
        certificates: certificates || [],
        total: count || 0,
        blockchainStatus,
      };
    } catch (error) {
      console.error("Get certificates error:", error);
      throw error;
    }
  }

  private generateCertificateId(): string {
    return `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCertificateHash(
    data: CertificateData,
    certificateId: string,
    salt?: string,
  ): string {
    const timestamp = Date.now();
    const randomSalt = salt || randomBytes(16).toString("hex");
    const hashInput = `${data.studentName}|${data.courseName}|${data.grade}|${certificateId}|${data.institutionName}|${data.issuedBy}|${data.studentWallet}|${timestamp}|${randomSalt}`;

    return createHash("sha256").update(hashInput, "utf8").digest("hex");
  }

  /**
   * Generate a unique certificate hash with collision detection
   */
  private async generateUniqueCertificateHash(
    data: CertificateData,
    certificateId: string,
    forceNew: boolean = false,
  ): Promise<{ certificateHash: string; attempts: number }> {
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      const salt =
        forceNew || attempts > 1 ? randomBytes(16).toString("hex") : undefined;
      const certificateHash = this.generateCertificateHash(
        data,
        certificateId,
        salt,
      );

      // Check if this hash already exists in Supabase
      try {
        const { data: existingCert, error } = await supabase
          .from("certificates")
          .select("id")
          .eq("certificate_hash", certificateHash)
          .single();

        if (error && error.code === "PGRST116") {
          // No matching rows found, hash is unique
          return { certificateHash, attempts };
        }

        if (existingCert) {
          console.log(
            `Hash collision detected on attempt ${attempts}, trying again...`,
          );
          continue;
        }

        // If no error and no existing cert, hash is unique
        return { certificateHash, attempts };
      } catch (error) {
        console.error("Error checking hash uniqueness:", error);
        // If we can't check, proceed with the hash (let the insert operation handle duplicates)
        return { certificateHash, attempts };
      }
    }

    // If we've exhausted all attempts, use the last generated hash and let the insert handle any collision
    const finalSalt = randomBytes(32).toString("hex"); // Use larger salt as last resort
    const finalHash = this.generateCertificateHash(
      data,
      certificateId,
      finalSalt,
    );
    console.warn(`Used maximum attempts (${maxAttempts}) for hash generation`);

    return { certificateHash: finalHash, attempts };
  }

  /**
   * Validate certificate data before processing
   */
  private validateCertificateData(data: CertificateData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.studentName || data.studentName.trim().length < 2) {
      errors.push("Student name must be at least 2 characters long");
    }

    if (!data.courseName || data.courseName.trim().length < 2) {
      errors.push("Course name must be at least 2 characters long");
    }

    if (!data.grade || data.grade.trim().length === 0) {
      errors.push("Grade is required");
    }

    if (!data.institutionName || data.institutionName.trim().length < 2) {
      errors.push("Institution name must be at least 2 characters long");
    }

    if (!data.issuedBy || data.issuedBy.trim().length < 2) {
      errors.push("Issuer name must be at least 2 characters long");
    }

    if (!data.studentWallet || data.studentWallet.trim().length === 0) {
      errors.push("Student wallet address is required");
    } else {
      try {
        new PublicKey(data.studentWallet);
      } catch {
        errors.push("Invalid student wallet address format");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Factory function to create service instance
export function createCertificateService(
  provider?: AnchorProvider,
): UnifiedCertificateService {
  return new UnifiedCertificateService(provider);
}

// Utility functions
export async function verifyCertificateById(
  certificateId: string,
  provider?: AnchorProvider,
  wallet?: WalletInterface | WalletContextState,
): Promise<VerificationResult> {
  const service = createCertificateService(provider);
  return service.verifyCertificate(certificateId, wallet);
}

export async function createUnifiedCertificate(
  certificateData: CertificateData,
  wallet: WalletContextState | Wallet | any,
  provider?: AnchorProvider,
): Promise<CertificateResult> {
  const service = createCertificateService(provider);
  return service.createCertificate(certificateData, wallet);
}
