import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { IDL, CertificateVerification } from "./idl";

export const PROGRAM_ID = new PublicKey(
  "BssezJKJhhZfQo6EWUHVrfonpdJba54ptgRyG4v5wzb3",
);
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

export interface GlobalStateAccount {
  authority: PublicKey;
  totalInstitutions: BN;
  totalCertificates: BN;
  totalVerifications: BN;
}

export interface InstitutionAccount {
  authority: PublicKey;
  name: string;
  location: string;
  isVerified: boolean;
  certificatesIssued: BN;
  createdAt: BN;
}

export interface CertificateAccount {
  institution: PublicKey;
  studentName: string;
  courseName: string;
  grade: string;
  certificateId: string;
  isRevoked: boolean;
  verificationCount: BN;
  issuedAt: BN;
}

export class SolanaClient {
  private connection: Connection;
  private program: Program<CertificateVerification> | null = null;

  constructor(rpcUrl: string = DEVNET_RPC_URL) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  // Initialize the program with a wallet provider
  initializeProgram(provider: AnchorProvider) {
    this.program = new Program(IDL, PROGRAM_ID, provider);
    return this.program;
  }

  // Get program instance
  getProgram() {
    if (!this.program) {
      throw new Error("Program not initialized. Call initializeProgram first.");
    }
    return this.program;
  }

  // Derive PDA addresses
  static getGlobalStatePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      PROGRAM_ID,
    );
  }

  static getInstitutionPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("institution"), authority.toBuffer()],
      PROGRAM_ID,
    );
  }

  static getCertificatePDA(
    institution: PublicKey,
    certificateId: string,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("certificate"),
        institution.toBuffer(),
        Buffer.from(certificateId),
      ],
      PROGRAM_ID,
    );
  }

  // Initialize the system (only once)
  async initializeSystem(authority: web3.Keypair) {
    const program = this.getProgram();
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          authority: authority.publicKey,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error initializing system:", error);
      throw error;
    }
  }

  // Register a new institution
  async registerInstitution(
    authority: web3.Keypair,
    name: string,
    location: string,
  ) {
    const program = this.getProgram();
    const [institutionPDA] = SolanaClient.getInstitutionPDA(
      authority.publicKey,
    );
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const tx = await program.methods
        .registerInstitution(name, location)
        .accounts({
          authority: authority.publicKey,
          institution: institutionPDA,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error registering institution:", error);
      throw error;
    }
  }

  // Issue a certificate
  async issueCertificate(
    issuer: web3.Keypair,
    studentName: string,
    courseName: string,
    grade: string,
    certificateId: string,
  ) {
    const program = this.getProgram();
    const [institutionPDA] = SolanaClient.getInstitutionPDA(issuer.publicKey);
    const [certificatePDA] = SolanaClient.getCertificatePDA(
      institutionPDA,
      certificateId,
    );
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const tx = await program.methods
        .issueCertificate(studentName, courseName, grade, certificateId)
        .accounts({
          issuer: issuer.publicKey,
          institution: institutionPDA,
          certificate: certificatePDA,
          globalState: globalStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  }

  // Verify a certificate
  async verifyCertificate(
    verifier: web3.Keypair,
    certificateAddress: PublicKey,
  ) {
    const program = this.getProgram();
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const tx = await program.methods
        .verifyCertificate()
        .accounts({
          verifier: verifier.publicKey,
          certificate: certificateAddress,
          globalState: globalStatePDA,
        })
        .signers([verifier])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error verifying certificate:", error);
      throw error;
    }
  }

  // Revoke a certificate
  async revokeCertificate(
    revoker: web3.Keypair,
    certificateAddress: PublicKey,
  ) {
    const program = this.getProgram();
    const [institutionPDA] = SolanaClient.getInstitutionPDA(revoker.publicKey);

    try {
      const tx = await program.methods
        .revokeCertificate()
        .accounts({
          revoker: revoker.publicKey,
          certificate: certificateAddress,
          institution: institutionPDA,
        })
        .signers([revoker])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error revoking certificate:", error);
      throw error;
    }
  }

  // Verify an institution (only global authority)
  async verifyInstitution(
    authority: web3.Keypair,
    institutionAddress: PublicKey,
  ) {
    const program = this.getProgram();
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const tx = await program.methods
        .verifyInstitution()
        .accounts({
          globalState: globalStatePDA,
          authority: authority.publicKey,
          institution: institutionAddress,
        })
        .signers([authority])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error verifying institution:", error);
      throw error;
    }
  }

  // Fetch accounts
  async getGlobalState(): Promise<GlobalStateAccount | null> {
    const program = this.getProgram();
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    try {
      const globalState =
        await program.account.globalState.fetch(globalStatePDA);
      return globalState as GlobalStateAccount;
    } catch {
      console.log("Global state not found or not initialized");
      return null;
    }
  }

  async getInstitution(
    authority: PublicKey,
  ): Promise<InstitutionAccount | null> {
    const program = this.getProgram();
    const [institutionPDA] = SolanaClient.getInstitutionPDA(authority);

    try {
      const institution =
        await program.account.institution.fetch(institutionPDA);
      return institution as InstitutionAccount;
    } catch {
      console.log("Institution not found");
      return null;
    }
  }

  async getCertificate(
    certificateAddress: PublicKey,
  ): Promise<CertificateAccount | null> {
    const program = this.getProgram();

    try {
      const certificate =
        await program.account.certificate.fetch(certificateAddress);
      return certificate as CertificateAccount;
    } catch {
      console.log("Certificate not found");
      return null;
    }
  }

  async getCertificateByInstitutionAndId(
    institution: PublicKey,
    certificateId: string,
  ): Promise<CertificateAccount | null> {
    const [certificatePDA] = SolanaClient.getCertificatePDA(
      institution,
      certificateId,
    );
    return this.getCertificate(certificatePDA);
  }

  // Get all certificates for an institution
  async getCertificatesForInstitution(
    institutionAuthority: PublicKey,
  ): Promise<CertificateAccount[]> {
    const program = this.getProgram();
    const [institutionPDA] =
      SolanaClient.getInstitutionPDA(institutionAuthority);

    try {
      const certificates = await program.account.certificate.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: institutionPDA.toBase58(),
          },
        },
      ]);

      return certificates.map((cert) => cert.account as CertificateAccount);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      return [];
    }
  }

  // Get all institutions
  async getAllInstitutions(): Promise<
    (InstitutionAccount & { publicKey: PublicKey })[]
  > {
    const program = this.getProgram();

    try {
      const institutions = await program.account.institution.all();
      return institutions.map((inst) => ({
        ...(inst.account as InstitutionAccount),
        publicKey: inst.publicKey,
      }));
    } catch (error) {
      console.error("Error fetching institutions:", error);
      return [];
    }
  }

  // Get all certificates
  async getAllCertificates(): Promise<
    (CertificateAccount & { publicKey: PublicKey })[]
  > {
    const program = this.getProgram();

    try {
      const certificates = await program.account.certificate.all();
      return certificates.map((cert) => ({
        ...(cert.account as CertificateAccount),
        publicKey: cert.publicKey,
      }));
    } catch (error) {
      console.error("Error fetching certificates:", error);
      return [];
    }
  }

  // Utility methods
  async requestAirdrop(
    publicKey: PublicKey,
    lamports: number = LAMPORTS_PER_SOL,
  ) {
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  async getBalance(publicKey: PublicKey) {
    return await this.connection.getBalance(publicKey);
  }

  // Event listener setup
  addEventListener(
    eventName:
      | "SystemInitialized"
      | "InstitutionRegistered"
      | "CertificateIssued"
      | "CertificateVerified"
      | "CertificateRevoked"
      | "InstitutionVerified",
    callback: (event: unknown) => void,
  ) {
    const program = this.getProgram();

    const listenerId = program.addEventListener(eventName, (event, slot) => {
      callback({ ...event, slot });
    });
    return listenerId;
  }

  removeEventListener(listenerId: number) {
    const program = this.getProgram();
    program.removeEventListener(listenerId);
  }
}

// Create a singleton instance
export const solanaClient = new SolanaClient();
