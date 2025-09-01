import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { IDL, CertificateVerification } from "./idl";
import { SolanaClient, PROGRAM_ID } from "./client";

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export class TransactionManager {
  private connection: Connection;
  private program: Program<CertificateVerification>;

  constructor(provider: AnchorProvider) {
    this.connection = provider.connection;
    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  // Getter for connection
  getConnection(): Connection {
    return this.connection;
  }

  // Initialize system transaction
  async initializeSystem(
    wallet: WalletContextState,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .initialize()
        .accounts({
          authority: wallet.publicKey,
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Initialize system error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Register institution transaction
  async registerInstitution(
    wallet: WalletContextState,
    name: string,
    location: string,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .registerInstitution(name, location)
        .accounts({
          authority: wallet.publicKey,
          institution: institutionPDA,
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Register institution error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Issue certificate transaction
  async issueCertificate(
    wallet: WalletContextState,
    studentName: string,
    courseName: string,
    grade: string,
    certificateId: string,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);
      const [certificatePDA] = SolanaClient.getCertificatePDA(
        institutionPDA,
        certificateId,
      );
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .issueCertificate(studentName, courseName, grade, certificateId)
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Issue certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Verify certificate transaction
  async verifyCertificate(
    wallet: WalletContextState,
    certificateAddress: PublicKey,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .verifyCertificate()
        .accounts({
          verifier: wallet.publicKey,
          certificate: certificateAddress,
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Verify certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Revoke certificate transaction
  async revokeCertificate(
    wallet: WalletContextState,
    certificateAddress: PublicKey,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [institutionPDA] = SolanaClient.getInstitutionPDA(wallet.publicKey);

      const instruction = await this.program.methods
        .revokeCertificate()
        .accounts({
          revoker: wallet.publicKey,
          certificate: certificateAddress,
          institution: institutionPDA,
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Revoke certificate error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Verify institution transaction (admin only)
  async verifyInstitution(
    wallet: WalletContextState,
    institutionAddress: PublicKey,
  ): Promise<TransactionResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

      const instruction = await this.program.methods
        .verifyInstitution()
        .accounts({
          globalState: globalStatePDA,
          authority: wallet.publicKey,
          institution: institutionAddress,
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

      await this.connection.confirmTransaction(signature);

      return { signature, success: true };
    } catch (error) {
      console.error("Verify institution error:", error);
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get certificate PDA by institution and certificate ID
  static getCertificatePDA(
    institution: PublicKey,
    certificateId: string,
  ): [PublicKey, number] {
    return SolanaClient.getCertificatePDA(institution, certificateId);
  }

  // Get institution PDA by authority
  static getInstitutionPDA(authority: PublicKey): [PublicKey, number] {
    return SolanaClient.getInstitutionPDA(authority);
  }

  // Get global state PDA
  static getGlobalStatePDA(): [PublicKey, number] {
    return SolanaClient.getGlobalStatePDA();
  }
}

// Utility functions for transaction management
export function createTransactionManager(
  provider: AnchorProvider,
): TransactionManager {
  return new TransactionManager(provider);
}

// Error handling utility
export function handleTransactionError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const errorObj = error as { message?: string; logs?: string[] };
    if (errorObj.message) return errorObj.message;
    if (errorObj.logs) {
      const errorLog = errorObj.logs.find((log: string) =>
        log.includes("Error:"),
      );
      if (errorLog) return errorLog;
    }
  }
  return "Unknown transaction error";
}

// Transaction confirmation utility
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: web3.Commitment = "confirmed",
): Promise<boolean> {
  try {
    const confirmation = await connection.confirmTransaction(
      signature,
      commitment,
    );
    return !confirmation.value.err;
  } catch (err) {
    console.error("Transaction confirmation error:", err);
    return false;
  }
}

// Estimate transaction fee
export async function estimateTransactionFee(
  connection: Connection,
  transaction: Transaction,
): Promise<number | null> {
  try {
    const { feeCalculator } = await connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature * transaction.signatures.length;
  } catch (error) {
    console.error("Error estimating transaction fee:", error);
    return null;
  }
}

// Check if account exists
export async function checkAccountExists(
  connection: Connection,
  publicKey: PublicKey,
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

// Get transaction history for a wallet
export async function getTransactionHistory(
  connection: Connection,
  publicKey: PublicKey,
  limit: number = 10,
): Promise<string[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });
    return signatures.map((sig) => sig.signature);
  } catch (err) {
    console.error("Error getting transaction history:", err);
    return [];
  }
}
