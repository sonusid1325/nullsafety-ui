import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { IDL, CertificateVerification } from "./idl";
import { SolanaClient, PROGRAM_ID } from "./client";

export interface PrivateKeyTransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  transactionUrl?: string;
}

export interface CertificateIssueParams {
  studentName: string;
  courseName: string;
  grade: string;
  certificateId: string;
}

export class PrivateKeyTransactionManager {
  private connection: Connection;
  private program: Program<CertificateVerification>;
  private keypair: Keypair;
  private rpcUrl: string;

  constructor(
    privateKeyBase58: string,
    rpcUrl: string = "https://api.devnet.solana.com",
  ) {
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, "confirmed");

    // Create keypair from private key
    try {
      const privateKeyBytes = bs58.decode(privateKeyBase58);
      this.keypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log(
        "✅ Keypair loaded. Public key:",
        this.keypair.publicKey.toString(),
      );
    } catch (error) {
      throw new Error(`Invalid private key: ${error}`);
    }

    // Create provider and program
    const provider = new AnchorProvider(
      this.connection,
      {
        publicKey: this.keypair.publicKey,
        signTransaction: async (tx: any) => {
          tx.sign(this.keypair);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          return txs.map((tx: any) => {
            tx.sign(this.keypair);
            return tx;
          });
        },
      },
      { commitment: "confirmed" },
    );

    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  // Get public key of the loaded keypair
  getPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  // Get connection
  getConnection(): Connection {
    return this.connection;
  }

  // Get SOL balance
  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  // Request airdrop (devnet only)
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.rpcUrl.includes("devnet")) {
      throw new Error("Airdrop only available on devnet");
    }

    console.log(`Requesting ${amount} SOL airdrop...`);
    const signature = await this.connection.requestAirdrop(
      this.keypair.publicKey,
      amount * LAMPORTS_PER_SOL,
    );

    await this.connection.confirmTransaction(signature);
    console.log("✅ Airdrop completed:", signature);
    return signature;
  }

  // Initialize system (one-time setup)
  async initializeSystem(): Promise<PrivateKeyTransactionResult> {
    try {
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      // Check if already initialized
      try {
        await this.program.account.globalState.fetch(globalStatePDA);
        return {
          signature: "",
          success: true,
          error: "System already initialized",
        };
      } catch {
        // Not initialized, proceed
      }

      const tx = await this.program.methods
        .initialize()
        .accounts({
          authority: this.keypair.publicKey,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.keypair])
        .rpc();

      const transactionUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
      console.log("✅ System initialized:", transactionUrl);

      return {
        signature: tx,
        success: true,
        transactionUrl,
      };
    } catch (error) {
      console.error("❌ Initialize system error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Register institution
  async registerInstitution(
    name: string,
    location: string,
  ): Promise<PrivateKeyTransactionResult> {
    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      // Check if already registered
      try {
        await this.program.account.institution.fetch(institutionPDA);
        return {
          signature: "",
          success: true,
          error: "Institution already registered",
        };
      } catch {
        // Not registered, proceed
      }

      const tx = await this.program.methods
        .registerInstitution(name, location)
        .accounts({
          authority: this.keypair.publicKey,
          institution: institutionPDA,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.keypair])
        .rpc();

      const transactionUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
      console.log("✅ Institution registered:", transactionUrl);

      return {
        signature: tx,
        success: true,
        transactionUrl,
      };
    } catch (error) {
      console.error("❌ Register institution error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Issue certificate - Main function you'll use
  async issueCertificate(
    params: CertificateIssueParams,
  ): Promise<PrivateKeyTransactionResult> {
    try {
      const { studentName, courseName, grade, certificateId } = params;

      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      // Check if certificate already exists
      try {
        await this.program.account.certificate.fetch(certificatePDA);
        return {
          signature: "",
          success: false,
          error: `Certificate with ID ${certificateId} already exists`,
        };
      } catch {
        // Certificate doesn't exist, proceed with issuance
      }

      const tx = await this.program.methods
        .issueCertificate(studentName, courseName, grade, certificateId)
        .accounts({
          issuer: this.keypair.publicKey,
          institution: institutionPDA,
          certificate: certificatePDA,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.keypair])
        .rpc();

      const transactionUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
      console.log("✅ Certificate issued:", transactionUrl);
      console.log("📜 Certificate PDA:", certificatePDA.toString());

      return {
        signature: tx,
        success: true,
        transactionUrl,
      };
    } catch (error) {
      console.error("❌ Issue certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Batch issue certificates
  async batchIssueCertificates(
    certificates: CertificateIssueParams[],
  ): Promise<PrivateKeyTransactionResult[]> {
    const results: PrivateKeyTransactionResult[] = [];

    console.log(`🚀 Issuing ${certificates.length} certificates...`);

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      console.log(
        `Processing certificate ${i + 1}/${certificates.length}: ${cert.certificateId}`,
      );

      const result = await this.issueCertificate(cert);
      results.push(result);

      // Add small delay between transactions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const successful = results.filter((r) => r.success).length;
    console.log(
      `✅ Batch complete: ${successful}/${certificates.length} certificates issued successfully`,
    );

    return results;
  }

  // Verify certificate
  async verifyCertificate(
    certificateAddress: PublicKey,
  ): Promise<PrivateKeyTransactionResult> {
    try {
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const tx = await this.program.methods
        .verifyCertificate()
        .accounts({
          verifier: this.keypair.publicKey,
          certificate: certificateAddress,
          globalState: globalStatePDA,
        })
        .signers([this.keypair])
        .rpc();

      const transactionUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
      console.log("✅ Certificate verified:", transactionUrl);

      return {
        signature: tx,
        success: true,
        transactionUrl,
      };
    } catch (error) {
      console.error("❌ Verify certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Revoke certificate
  async revokeCertificate(
    certificateAddress: PublicKey,
  ): Promise<PrivateKeyTransactionResult> {
    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );

      const tx = await this.program.methods
        .revokeCertificate()
        .accounts({
          revoker: this.keypair.publicKey,
          certificate: certificateAddress,
          institution: institutionPDA,
        })
        .signers([this.keypair])
        .rpc();

      const transactionUrl = `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
      console.log("✅ Certificate revoked:", transactionUrl);

      return {
        signature: tx,
        success: true,
        transactionUrl,
      };
    } catch (error) {
      console.error("❌ Revoke certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get certificate data
  async getCertificate(certificateId: string) {
    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );

      const certificate =
        await this.program.account.certificate.fetch(certificatePDA);
      return {
        address: certificatePDA,
        data: certificate,
      };
    } catch (error) {
      console.error("❌ Get certificate error:", error);
      return null;
    }
  }

  // Get institution data
  async getInstitution() {
    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );
      const institution =
        await this.program.account.institution.fetch(institutionPDA);
      return {
        address: institutionPDA,
        data: institution,
      };
    } catch (error) {
      console.error("❌ Get institution error:", error);
      return null;
    }
  }

  // Get all certificates for this institution
  async getAllCertificates() {
    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(
        this.keypair.publicKey,
      );

      const certificates = await this.program.account.certificate.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: institutionPDA.toBase58(),
          },
        },
      ]);

      return certificates.map((cert) => ({
        address: cert.publicKey,
        data: cert.account,
      }));
    } catch (error) {
      console.error("❌ Get all certificates error:", error);
      return [];
    }
  }

  // One-time setup for institution
  async setupInstitution(name: string, location: string): Promise<boolean> {
    console.log("🚀 Setting up institution with private key...");
    console.log("📍 Public Key:", this.keypair.publicKey.toString());

    // Check balance
    const balance = await this.getBalance();
    console.log("💰 Current balance:", balance, "SOL");

    // Request airdrop if needed
    if (balance < 0.1) {
      console.log("💧 Requesting airdrop...");
      await this.requestAirdrop(2);
    }

    // Initialize system
    const initResult = await this.initializeSystem();
    if (!initResult.success && !initResult.error?.includes("already")) {
      console.error("❌ Failed to initialize system:", initResult.error);
      return false;
    }

    // Register institution
    const regResult = await this.registerInstitution(name, location);
    if (!regResult.success && !regResult.error?.includes("already")) {
      console.error("❌ Failed to register institution:", regResult.error);
      return false;
    }

    console.log("✅ Institution setup complete!");
    return true;
  }
}

// Factory function to create the manager
export function createPrivateKeyTransactionManager(
  privateKey?: string,
  rpcUrl?: string,
): PrivateKeyTransactionManager {
  // Try to get private key from environment if not provided
  const key = privateKey || process.env.SOLANA_PRIVATE_KEY;

  if (!key) {
    throw new Error(
      "Private key not found. Provide it as parameter or set SOLANA_PRIVATE_KEY environment variable.",
    );
  }

  return new PrivateKeyTransactionManager(key, rpcUrl);
}

// Helper to generate certificate ID
export function generateCertificateId(
  studentName: string,
  courseName: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const nameHash = studentName.toLowerCase().replace(/\s+/g, "");
  const courseHash = courseName.toLowerCase().replace(/\s+/g, "");

  return `${nameHash}_${courseHash}_${timestamp}_${random}`;
}

// Utility functions
export const PrivateKeyUtils = {
  // Convert private key formats if needed
  validatePrivateKey: (privateKey: string): boolean => {
    try {
      bs58.decode(privateKey);
      return true;
    } catch {
      return false;
    }
  },

  // Get public key from private key
  getPublicKeyFromPrivate: (privateKey: string): string => {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    return keypair.publicKey.toString();
  },

  // Generate new keypair for testing
  generateKeypair: (): { publicKey: string; privateKey: string } => {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
    };
  },
};
