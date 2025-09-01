import { supabase, Certificate as SupabaseCertificate } from "./supabase";
import { TransactionManager, TransactionResult } from "./anchor/transactions";
import { SolanaClient } from "./anchor/client";
import { WalletContextState } from "@solana/wallet-adapter-react";
import type { Wallet } from "@solana/wallet-adapter-react";
import { WalletInterface, createMockWallet } from "./walletTypes";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

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
  error?: string;
  partialSuccess?: {
    supabase: boolean;
    blockchain: boolean;
  };
}

export interface VerificationResult {
  isValid: boolean;
  certificate?: SupabaseCertificate;
  blockchainData?: unknown;
  verificationSources: {
    supabase: boolean;
    blockchain: boolean;
  };
  error?: string;
}

export class UnifiedCertificateService {
  private transactionManager: TransactionManager | null = null;

  constructor(provider?: AnchorProvider) {
    if (provider) {
      this.transactionManager = new TransactionManager(provider);
    }
  }

  /**
   * Creates a certificate in both Supabase and blockchain
   */
  async createCertificate(
    certificateData: CertificateData,
    wallet: WalletInterface | WalletContextState,
  ): Promise<CertificateResult> {
    const certificateId =
      certificateData.certificateId || this.generateCertificateId();
    let supabaseResult: SupabaseCertificate | null = null;
    let blockchainResult: TransactionResult | null = null;

    try {
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
        certificate_hash: this.generateCertificateHash(
          certificateData,
          certificateId,
        ),
        is_revoked: false,
      };

      const { data: dbCertificate, error: dbError } = await supabase
        .from("certificates")
        .insert([supabaseCertificate])
        .select()
        .single();

      if (dbError) {
        throw new Error(`Supabase error: ${dbError.message}`);
      }

      supabaseResult = dbCertificate;
      console.log("Certificate created in Supabase:", dbCertificate.id);

      // Step 2: Create certificate on blockchain
      if (this.transactionManager && wallet.publicKey) {
        console.log("Creating certificate on blockchain...");
        const walletContext = ensureWalletContextState(wallet);
        blockchainResult = await this.transactionManager.issueCertificate(
          walletContext,
          certificateData.studentName,
          certificateData.courseName,
          certificateData.grade,
          certificateId,
        );

        if (!blockchainResult.success) {
          // Blockchain failed, but Supabase succeeded - mark as partial success
          console.warn(
            "Blockchain transaction failed:",
            blockchainResult.error,
          );

          // Update Supabase record to indicate blockchain sync issue
          await supabase
            .from("certificates")
            .update({
              certificate_hash: `${supabaseCertificate.certificate_hash}_BLOCKCHAIN_PENDING`,
            })
            .eq("id", dbCertificate.id);

          return {
            success: false,
            certificate: dbCertificate,
            error: `Certificate created in database but blockchain transaction failed: ${blockchainResult.error}`,
            partialSuccess: {
              supabase: true,
              blockchain: false,
            },
          };
        }

        console.log(
          "Certificate created on blockchain:",
          blockchainResult.signature,
        );
      }

      return {
        success: true,
        certificate: dbCertificate,
        blockchainSignature: blockchainResult?.signature,
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
          blockchainSignature: blockchainResult?.signature,
          error: errorMessage,
          partialSuccess: {
            supabase: true,
            blockchain: blockchainResult?.success || false,
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
   * Verifies a certificate against both Supabase and blockchain
   */
  async verifyCertificate(
    certificateId: string,
    wallet?: WalletInterface | WalletContextState,
  ): Promise<VerificationResult> {
    let supabaseValid = false;
    let blockchainValid = false;
    let certificate: SupabaseCertificate | null = null;
    let blockchainData: unknown = null;

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

      // Check blockchain if we have the necessary tools
      if (this.transactionManager && certificate) {
        try {
          console.log("Verifying certificate on blockchain...");

          // Find the institution PDA
          const institutionPublicKey = new PublicKey(certificate.issued_by);
          const [institutionPDA] =
            SolanaClient.getInstitutionPDA(institutionPublicKey);

          // Find the certificate PDA
          const [certificatePDA] = SolanaClient.getCertificatePDA(
            institutionPDA,
            certificateId,
          );

          // Fetch certificate data from blockchain
          const client = new SolanaClient();
          blockchainData = await client.getCertificate(certificatePDA);

          if (
            blockchainData &&
            typeof blockchainData === "object" &&
            "isRevoked" in blockchainData &&
            !blockchainData.isRevoked
          ) {
            blockchainValid = true;
            console.log("Certificate verified on blockchain");

            // Optionally perform verification transaction if wallet is provided
            if (wallet && wallet.publicKey) {
              const walletContext = ensureWalletContextState(wallet);
              const verifyResult =
                await this.transactionManager.verifyCertificate(
                  walletContext,
                  certificatePDA,
                );
              console.log("Verification transaction:", verifyResult.signature);
            }
          }
        } catch (blockchainError) {
          console.warn("Blockchain verification failed:", blockchainError);
          // Continue with Supabase verification only
        }
      }

      const isValid =
        supabaseValid && (blockchainValid || !this.transactionManager);

      return {
        isValid,
        certificate: certificate || undefined,
        blockchainData,
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
  ): string {
    const hashInput = `${data.studentName}-${data.courseName}-${data.grade}-${certificateId}-${Date.now()}`;
    // In a real implementation, you'd use a proper hashing library like crypto
    return `hash-${Buffer.from(hashInput)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 32)}`;
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
