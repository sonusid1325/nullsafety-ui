import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { IDL, CertificateVerification } from "./idl";
import { SolanaClient, PROGRAM_ID } from "./client";
// Note: crypto module not available in browser, using Web Crypto API alternative

export interface CertificateHashMetadata {
  certificateId: string;
  studentName: string;
  studentWallet: string;
  courseName: string;
  grade: string;
  institutionName: string;
  issuedBy: string;
  issuedDate: string;
  certificateHash: string;
  ipfsHash?: string;
  additionalMetadata?: { [key: string]: string };
}

export interface EnhancedTransactionResult {
  signature: string;
  success: boolean;
  certificateAddress?: PublicKey;
  blockchainHash?: string;
  onChainMetadata?: CertificateHashMetadata;
  error?: string;
}

export interface BlockchainCertificateData {
  certificateId: string;
  studentName: string;
  studentWallet: PublicKey;
  courseName: string;
  grade: string;
  institutionName: string;
  issuedBy: string;
  certificateHash: string;
  ipfsHash: string;
  issuedAt: BN;
  isRevoked: boolean;
  verificationCount: BN;
  metadata: { [key: string]: string };
}

export class EnhancedTransactionManager {
  private connection: Connection;
  private program: Program<CertificateVerification>;

  constructor(provider: AnchorProvider) {
    this.connection = provider.connection;
    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  // Generate a secure hash for certificate data
  private generateCertificateHash(metadata: CertificateHashMetadata): string {
    const hashData = `${metadata.certificateId}|${metadata.studentName}|${metadata.studentWallet}|${metadata.courseName}|${metadata.grade}|${metadata.institutionName}|${metadata.issuedBy}|${metadata.issuedDate}`;
    // Using a simple hash for now - in production, use proper crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(hashData);
    return (
      Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("") + Date.now().toString(16)
    );
  }

  // Store certificate hash with full metadata on Solana blockchain
  async storeCertificateHashWithMetadata(
    wallet: WalletContextState,
    metadata: CertificateHashMetadata,
  ): Promise<EnhancedTransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      // Generate certificate hash if not provided
      if (!metadata.certificateHash) {
        metadata.certificateHash = this.generateCertificateHash(metadata);
      }

      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        metadata.certificateId,
      );
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      // Create instruction to store certificate with hash and metadata
      const instruction = await this.program.methods
        .issueCertificate(
          metadata.studentName,
          metadata.courseName,
          metadata.grade,
          metadata.certificateId,
        )
        .accounts({
          issuer: wallet.publicKey,
          institution: institutionPDA,
          certificate: certificatePDA,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      await this.connection.confirmTransaction(signature, "confirmed");

      // Store additional metadata in a separate account if needed
      await this.storeAdditionalMetadata(wallet, certificatePDA, metadata);

      return {
        signature,
        success: true,
        certificateAddress: certificatePDA,
        blockchainHash: metadata.certificateHash,
        onChainMetadata: metadata,
      };
    } catch (error) {
      console.error("Store certificate hash error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Store additional metadata in a separate account for extensibility
  private async storeAdditionalMetadata(
    wallet: WalletContextState,
    certificateAddress: PublicKey,
    metadata: CertificateHashMetadata,
  ): Promise<string | null> {
    try {
      // Create a metadata account PDA
      PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), certificateAddress.toBuffer()],
        PROGRAM_ID,
      );

      // For now, we'll store metadata as a JSON string in the account data
      // In a production environment, you might want to use a more structured approach
      const metadataJson = JSON.stringify({
        certificateHash: metadata.certificateHash,
        ipfsHash: metadata.ipfsHash || "",
        issuedDate: metadata.issuedDate,
        studentWallet: metadata.studentWallet,
        institutionName: metadata.institutionName,
        issuedBy: metadata.issuedBy,
        additionalMetadata: metadata.additionalMetadata || {},
      });

      // Create account to store metadata
      const metadataAccount = Keypair.generate();
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey!,
        newAccountPubkey: metadataAccount.publicKey,
        space: metadataJson.length + 100, // Extra space for future updates
        lamports: await this.connection.getMinimumBalanceForRentExemption(
          metadataJson.length + 100,
        ),
        programId: SystemProgram.programId,
      });

      const transaction = new Transaction().add(createAccountIx);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey!;

      // Sign with both wallet and metadata account
      transaction.partialSign(metadataAccount);
      const signedTransaction = await wallet.signTransaction!(transaction);

      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      await this.connection.confirmTransaction(signature, "confirmed");

      console.log(
        `Metadata stored at account: ${metadataAccount.publicKey.toBase58()}`,
      );
      return signature;
    } catch (error) {
      console.error("Error storing additional metadata:", error);
      return null;
    }
  }

  // Retrieve certificate hash and metadata from blockchain
  async getCertificateHashAndMetadata(
    certificateId: string,
    institutionPublicKey: PublicKey,
  ): Promise<BlockchainCertificateData | null> {
    try {
      const [institutionPDA] =
        SolanaClient.getInstitutionPDA(institutionPublicKey);
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );

      // Fetch certificate account data
      const certificateAccount =
        await this.program.account.certificate.fetch(certificatePDA);

      // Try to fetch additional metadata
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), certificatePDA.toBuffer()],
        PROGRAM_ID,
      );

      let additionalMetadata: { [key: string]: string } = {};
      try {
        const metadataAccountInfo =
          await this.connection.getAccountInfo(metadataPDA);
        if (metadataAccountInfo && metadataAccountInfo.data) {
          const metadataJson = metadataAccountInfo.data.toString("utf-8");
          additionalMetadata = JSON.parse(metadataJson);
        }
      } catch (metadataError) {
        console.warn("Could not fetch additional metadata:", metadataError);
      }

      return {
        certificateId: certificateAccount.certificateId,
        studentName: certificateAccount.studentName,
        studentWallet: new PublicKey(additionalMetadata.studentWallet || ""),
        courseName: certificateAccount.courseName,
        grade: certificateAccount.grade,
        institutionName: additionalMetadata.institutionName || "",
        issuedBy: additionalMetadata.issuedBy || "",
        certificateHash: additionalMetadata.certificateHash || "",
        ipfsHash: additionalMetadata.ipfsHash || "",
        issuedAt: new BN(certificateAccount.issuedAt),
        isRevoked: certificateAccount.isRevoked,
        verificationCount: new BN(certificateAccount.verificationCount),
        metadata:
          typeof additionalMetadata.additionalMetadata === "object" &&
          additionalMetadata.additionalMetadata !== null
            ? (additionalMetadata.additionalMetadata as {
                [key: string]: string;
              })
            : {},
      };
    } catch (error) {
      console.error("Error fetching certificate data:", error);
      return null;
    }
  }

  // Verify certificate hash on blockchain
  async verifyCertificateHash(
    wallet: WalletContextState,
    certificateId: string,
    institutionPublicKey: PublicKey,
    providedHash: string,
  ): Promise<{
    isValid: boolean;
    onChainHash?: string;
    certificateData?: BlockchainCertificateData;
    error?: string;
  }> {
    try {
      const certificateData = await this.getCertificateHashAndMetadata(
        certificateId,
        institutionPublicKey,
      );

      if (!certificateData) {
        return {
          isValid: false,
          error: "Certificate not found on blockchain",
        };
      }

      if (certificateData.isRevoked) {
        return {
          isValid: false,
          error: "Certificate has been revoked",
          certificateData,
        };
      }

      const isValid = certificateData.certificateHash === providedHash;

      // Record verification on blockchain
      if (isValid && wallet.publicKey) {
        await this.recordVerification(
          wallet,
          certificateId,
          institutionPublicKey,
        );
      }

      return {
        isValid,
        onChainHash: certificateData.certificateHash,
        certificateData,
      };
    } catch (error) {
      console.error("Error verifying certificate hash:", error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  // Record a verification event on the blockchain
  private async recordVerification(
    wallet: WalletContextState,
    certificateId: string,
    institutionPublicKey: PublicKey,
  ): Promise<void> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return;
    }

    try {
      const [institutionPDA] =
        SolanaClient.getInstitutionPDA(institutionPublicKey);
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .verifyCertificate()
        .accounts({
          verifier: wallet.publicKey,
          certificate: certificatePDA,
          globalState: globalStatePDA,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      await this.connection.confirmTransaction(signature, "confirmed");
      console.log("Verification recorded on blockchain:", signature);
    } catch (error) {
      console.error("Error recording verification:", error);
    }
  }

  // Update certificate hash (for amendments, only by issuer)
  async updateCertificateHash(
    wallet: WalletContextState,
    certificateId: string,
    newMetadata: CertificateHashMetadata,
  ): Promise<EnhancedTransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );

      // Verify that the wallet is the original issuer
      const certificateData = await this.getCertificateHashAndMetadata(
        certificateId,
        wallet.publicKey,
      );

      if (!certificateData) {
        return {
          signature: "",
          success: false,
          error: "Certificate not found",
        };
      }

      if (certificateData.isRevoked) {
        return {
          signature: "",
          success: false,
          error: "Cannot update revoked certificate",
        };
      }

      // Generate new hash
      newMetadata.certificateHash = this.generateCertificateHash(newMetadata);

      // Update metadata
      const updateResult = await this.storeAdditionalMetadata(
        wallet,
        certificatePDA,
        newMetadata,
      );

      return {
        signature: updateResult || "",
        success: !!updateResult,
        certificateAddress: certificatePDA,
        blockchainHash: newMetadata.certificateHash,
        onChainMetadata: newMetadata,
      };
    } catch (error) {
      console.error("Error updating certificate hash:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  }

  // Get all certificates for an institution with their hashes
  async getInstitutionCertificatesWithHashes(
    institutionPublicKey: PublicKey,
  ): Promise<BlockchainCertificateData[]> {
    try {
      // Get all certificate accounts for this institution
      const certificateAccounts = await this.connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            {
              dataSize: 1000, // Approximate certificate account size
            },
            {
              memcmp: {
                offset: 8, // Skip discriminator
                bytes: institutionPublicKey.toBase58(),
              },
            },
          ],
        },
      );

      const certificates: BlockchainCertificateData[] = [];

      for (const account of certificateAccounts) {
        try {
          const certificateData = await this.program.account.certificate.fetch(
            account.pubkey,
          );

          // Fetch additional metadata
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), account.pubkey.toBuffer()],
            PROGRAM_ID,
          );

          let additionalMetadata: { [key: string]: string } = {};
          try {
            const metadataAccountInfo =
              await this.connection.getAccountInfo(metadataPDA);
            if (metadataAccountInfo && metadataAccountInfo.data) {
              const metadataJson = metadataAccountInfo.data.toString("utf-8");
              additionalMetadata = JSON.parse(metadataJson);
            }
          } catch (metadataError) {
            console.warn(
              `Could not fetch metadata for ${account.pubkey.toBase58()}:`,
              metadataError,
            );
          }

          certificates.push({
            certificateId: certificateData.certificateId,
            studentName: certificateData.studentName,
            studentWallet: new PublicKey(
              additionalMetadata.studentWallet || SystemProgram.programId,
            ),
            courseName: certificateData.courseName,
            grade: certificateData.grade,
            institutionName: additionalMetadata.institutionName || "",
            issuedBy: additionalMetadata.issuedBy || "",
            certificateHash: additionalMetadata.certificateHash || "",
            ipfsHash: additionalMetadata.ipfsHash || "",
            issuedAt: new BN(certificateData.issuedAt),
            isRevoked: certificateData.isRevoked,
            verificationCount: new BN(certificateData.verificationCount),
            metadata:
              typeof additionalMetadata.additionalMetadata === "object" &&
              additionalMetadata.additionalMetadata !== null
                ? (additionalMetadata.additionalMetadata as {
                    [key: string]: string;
                  })
                : {},
          });
        } catch (parseError) {
          console.warn(
            `Error parsing certificate ${account.pubkey.toBase58()}:`,
            parseError,
          );
        }
      }

      return certificates;
    } catch (error) {
      console.error("Error fetching institution certificates:", error);
      return [];
    }
  }

  // Batch verify multiple certificate hashes
  async batchVerifyCertificateHashes(
    certificateHashes: {
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
    const results = {
      verified: [] as string[],
      failed: [] as string[],
      revoked: [] as string[],
      notFound: [] as string[],
    };

    for (const {
      certificateId,
      hash,
      institutionPublicKey,
    } of certificateHashes) {
      try {
        const certificateData = await this.getCertificateHashAndMetadata(
          certificateId,
          institutionPublicKey,
        );

        if (!certificateData) {
          results.notFound.push(certificateId);
          continue;
        }

        if (certificateData.isRevoked) {
          results.revoked.push(certificateId);
          continue;
        }

        if (certificateData.certificateHash === hash) {
          results.verified.push(certificateId);
        } else {
          results.failed.push(certificateId);
        }
      } catch (error) {
        console.error(`Error verifying certificate ${certificateId}:`, error);
        results.failed.push(certificateId);
      }
    }

    return results;
  }

  // Get certificate verification history
  async getCertificateVerificationHistory(
    certificateId: string,
    institutionPublicKey: PublicKey,
  ): Promise<{
    verificationCount: number;
    isRevoked: boolean;
    lastVerified?: Date;
  }> {
    try {
      const certificateData = await this.getCertificateHashAndMetadata(
        certificateId,
        institutionPublicKey,
      );

      if (!certificateData) {
        throw new Error("Certificate not found");
      }

      return {
        verificationCount: certificateData.verificationCount.toNumber(),
        isRevoked: certificateData.isRevoked,
        // Note: We would need to enhance the program to track verification timestamps
        // This is just a placeholder structure
      };
    } catch (error) {
      console.error("Error fetching verification history:", error);
      throw error;
    }
  }
}

// Utility functions for enhanced certificate management
export function createEnhancedTransactionManager(
  provider: AnchorProvider,
): EnhancedTransactionManager {
  return new EnhancedTransactionManager(provider);
}

// Helper to validate certificate hash format
export function isValidCertificateHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

// Helper to create certificate metadata
export function createCertificateMetadata(certificateData: {
  certificateId: string;
  studentName: string;
  studentWallet: string;
  courseName: string;
  grade: string;
  institutionName: string;
  issuedBy: string;
  issuedDate?: string;
  ipfsHash?: string;
  additionalMetadata?: { [key: string]: string };
}): CertificateHashMetadata {
  return {
    certificateId: certificateData.certificateId,
    studentName: certificateData.studentName,
    studentWallet: certificateData.studentWallet,
    courseName: certificateData.courseName,
    grade: certificateData.grade,
    institutionName: certificateData.institutionName,
    issuedBy: certificateData.issuedBy,
    issuedDate:
      certificateData.issuedDate || new Date().toISOString().split("T")[0],
    certificateHash: "", // Will be generated
    ipfsHash: certificateData.ipfsHash,
    additionalMetadata: certificateData.additionalMetadata,
  };
}
