import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  createCertificateService,
  CertificateData,
  verifyCertificateById,
} from "@/lib/certificateService";
import { ServerWalletAdapter } from "@/lib/walletTypes";

// Create certificate (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      student_name,
      roll_no,
      course_name,
      grade,
      institution_name,
      issued_by,
      student_wallet,
      enable_blockchain = false,
      connection_url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com",
    } = body;

    // Validate required fields
    if (
      !student_name ||
      !roll_no ||
      !course_name ||
      !grade ||
      !institution_name ||
      !issued_by ||
      !student_wallet
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.log("API: Creating unified certificate for:", student_name);

    const certificateData: CertificateData = {
      studentName: student_name,
      rollNo: roll_no,
      courseName: course_name,
      grade,
      institutionName: institution_name,
      issuedBy: issued_by,
      studentWallet: student_wallet,
    };

    // Create provider if blockchain is enabled
    let provider: AnchorProvider | undefined;
    let serverWallet: ServerWalletAdapter | null = null;

    if (enable_blockchain) {
      try {
        const connection = new Connection(connection_url, "confirmed");
        serverWallet = new ServerWalletAdapter(issued_by);

        // Note: This is a server-side mock. In production, actual signing would happen client-side
        provider = new AnchorProvider(connection, serverWallet as any, {
          commitment: "confirmed",
        });
      } catch (error) {
        console.warn("Failed to create blockchain provider:", error);
      }
    }

    const certificateService = createCertificateService(provider);

    if (enable_blockchain && serverWallet) {
      // Attempt unified creation (both blockchain and database)
      console.log("Attempting unified certificate creation...");

      try {
        const result = await certificateService.createCertificate(
          certificateData,
          serverWallet as any,
        );

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: "Certificate created in both blockchain and database",
            data: result.certificate,
            blockchain_signature: result.blockchainSignature,
            sources: {
              supabase: true,
              blockchain: true,
            },
          });
        } else if (result.partialSuccess) {
          return NextResponse.json({
            success: true,
            message: "Certificate created with partial success",
            data: result.certificate,
            warning: result.error,
            partial_success: result.partialSuccess,
            sources: result.partialSuccess,
          });
        } else {
          throw new Error(result.error || "Unified creation failed");
        }
      } catch (unifiedError) {
        console.error("Unified creation failed:", unifiedError);
        return NextResponse.json(
          {
            error: "Unified certificate creation failed",
            details:
              unifiedError instanceof Error
                ? unifiedError.message
                : "Unknown error",
          },
          { status: 500 },
        );
      }
    } else {
      // Database-only creation
      console.log("Creating certificate in database only...");

      try {
        const result = await certificateService.createCertificate(
          certificateData,
          { connected: false } as any,
        );

        return NextResponse.json({
          success: true,
          message: "Certificate created in database",
          data: result.certificate,
          sources: {
            supabase: true,
            blockchain: false,
          },
        });
      } catch (dbError) {
        console.error("Database creation failed:", dbError);
        return NextResponse.json(
          {
            error: "Certificate creation failed",
            details:
              dbError instanceof Error ? dbError.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    console.error("API: Unified certificate creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Verify certificate (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get("certificate_id");
    const enableBlockchain = searchParams.get("enable_blockchain") === "true";
    const connectionUrl =
      searchParams.get("connection_url") ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.devnet.solana.com";

    if (!certificateId) {
      return NextResponse.json(
        { error: "Certificate ID is required" },
        { status: 400 },
      );
    }

    console.log("API: Verifying certificate:", certificateId);

    let provider: AnchorProvider | undefined;

    if (enableBlockchain) {
      try {
        const connection = new Connection(connectionUrl, "confirmed");
        // For verification, we don't need a real wallet
        const dummyWallet = new ServerWalletAdapter(
          "11111111111111111111111111111111",
        );

        provider = new AnchorProvider(connection, dummyWallet as never, {
          commitment: "confirmed",
        });
      } catch (error) {
        console.warn(
          "Failed to create blockchain provider for verification:",
          error,
        );
      }
    }

    const result = await verifyCertificateById(certificateId, provider);

    if (result.isValid) {
      return NextResponse.json({
        success: true,
        message: "Certificate verified",
        certificate: result.certificate,
        blockchain_data: result.blockchainData,
        verification_sources: result.verificationSources,
        is_valid: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Certificate verification failed",
          certificate: result.certificate,
          error: result.error,
          verification_sources: result.verificationSources,
          is_valid: false,
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("API: Certificate verification error:", error);
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Get certificates with blockchain status (for listing)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      issued_by,
      limit = 10,
      offset = 0,
      enable_blockchain = false,
      connection_url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com",
    } = body;

    console.log("API: Fetching certificates with blockchain status", {
      issued_by,
      limit,
      offset,
      enable_blockchain,
    });

    let provider: AnchorProvider | undefined;

    if (enable_blockchain && issued_by) {
      try {
        const connection = new Connection(connection_url, "confirmed");
        const wallet = new ServerWalletAdapter(issued_by);

        provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
      } catch (error) {
        console.warn("Failed to create blockchain provider:", error);
      }
    }

    const certificateService = createCertificateService(provider);
    const result = await certificateService.getCertificates(
      issued_by,
      limit,
      offset,
    );

    return NextResponse.json({
      success: true,
      certificates: result.certificates,
      total: result.total,
      blockchain_status: result.blockchainStatus,
      pagination: {
        offset,
        limit,
        total: result.total,
      },
      sources: {
        supabase: true,
        blockchain: enable_blockchain,
      },
    });
  } catch (error) {
    console.error(
      "API: Fetch certificates with blockchain status error:",
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch certificates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Revoke certificate (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      certificate_id,
      issued_by,
      reason,
      enable_blockchain = false,
      connection_url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com",
    } = body;

    if (!certificate_id || !issued_by) {
      return NextResponse.json(
        { error: "Certificate ID and issuer are required" },
        { status: 400 },
      );
    }

    console.log("API: Revoking certificate:", certificate_id);

    let provider: AnchorProvider | undefined;
    let wallet: WalletContextState | null = null;

    if (enable_blockchain) {
      try {
        const connection = new Connection(connection_url, "confirmed");
        wallet = new ServerWalletAdapter(issued_by) as any;

        provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
      } catch (error) {
        console.warn(
          "Failed to create blockchain provider for revocation:",
          error,
        );
      }
    }

    const certificateService = createCertificateService(provider);
    const result = await certificateService.revokeCertificate(
      certificate_id,
      wallet ||
        ({ publicKey: { toString: () => issued_by }, connected: false } as any),
      reason,
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Certificate revoked successfully",
        certificate: result.certificate,
        blockchain_signature: result.blockchainSignature,
      });
    } else {
      return NextResponse.json(
        {
          error: "Certificate revocation failed",
          details: result.error,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("API: Certificate revocation error:", error);
    return NextResponse.json(
      {
        error: "Revocation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
