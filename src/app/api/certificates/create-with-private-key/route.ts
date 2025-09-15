import { NextRequest, NextResponse } from "next/server";
import {
  createPrivateKeyTransactionManager,
  generateCertificateId,
} from "@/lib/anchor/private-key-transactions";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      studentName,
      rollNo,
      courseName,
      grade,
      institutionName,
      issuedBy,
      studentWallet,
    } = body;

    // Validate required fields
    if (
      !studentName ||
      !rollNo ||
      !courseName ||
      !grade ||
      !institutionName ||
      !issuedBy ||
      !studentWallet
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    console.log("🚀 Starting certificate creation process...");
    console.log("📋 Certificate Details:", {
      studentName,
      rollNo,
      courseName,
      grade,
      institutionName,
      issuedBy,
      studentWallet,
    });

    // Create private key transaction manager
    const txManager = createPrivateKeyTransactionManager();

    // Check if institution setup is needed (first time)
    const institutionData = await txManager.getInstitution();
    if (!institutionData) {
      console.log("🏫 Setting up institution for first time...");
      const setupSuccess = await txManager.setupInstitution(
        institutionName,
        "Blockchain Campus" // Default location
      );
      if (!setupSuccess) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to setup institution on blockchain",
          },
          { status: 500 }
        );
      }
    }

    // Generate certificate ID
    const certificateId = generateCertificateId(studentName, courseName);
    console.log(`🔖 Generated certificate ID: ${certificateId}`);

    // Issue certificate on blockchain
    console.log("⛓️  Issuing certificate on blockchain...");
    const blockchainResult = await txManager.issueCertificate({
      studentName,
      courseName,
      grade,
      certificateId,
    });

    if (!blockchainResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: blockchainResult.error || "Failed to create certificate on blockchain",
          certificateId,
        },
        { status: 400 }
      );
    }

    console.log("✅ Certificate issued on blockchain");
    console.log(`🔗 Transaction: ${blockchainResult.transactionUrl}`);

    // Store certificate in database with blockchain transaction hash
    console.log("💾 Storing certificate in database...");
    const { data: dbResult, error: dbError } = await supabase
      .from("certificates")
      .insert({
        student_name: studentName,
        roll_no: rollNo,
        course_name: courseName,
        grade: grade,
        certificate_id: certificateId,
        institution_name: institutionName,
        issued_by: issuedBy,
        student_wallet: studentWallet,
        issued_date: new Date().toISOString().split("T")[0],
        certificate_hash: blockchainResult.signature, // Use transaction signature as hash
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database storage failed:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: `Database certificate storage failed: ${dbError.message}`,
          certificateId,
          blockchainTransaction: blockchainResult.signature,
          blockchainUrl: blockchainResult.transactionUrl,
        },
        { status: 500 }
      );
    }

    console.log("✅ Certificate stored in database");
    console.log(`📋 Certificate hash: ${blockchainResult.signature}`);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        certificateId: certificateId,
        databaseId: dbResult.id,
        transactionSignature: blockchainResult.signature,
        transactionUrl: blockchainResult.transactionUrl,
        studentName,
        courseName,
        grade,
        issuedAt: new Date().toISOString(),
        issuerPublicKey: txManager.getPublicKey().toString(),
        certificateHash: blockchainResult.signature,
      },
      message: "Certificate created successfully on blockchain and database",
    });
  } catch (error) {
    console.error("❌ Certificate creation error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("SOLANA_PRIVATE_KEY")) {
        return NextResponse.json(
          {
            success: false,
            error: "Private key not configured. Please add SOLANA_PRIVATE_KEY to your environment variables.",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("insufficient funds")) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient SOL balance for transaction. Please request an airdrop for devnet testing.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check if private key is available
    const privateKey = process.env.SOLANA_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({
        status: "error",
        message: "SOLANA_PRIVATE_KEY not configured"
      });
    }

    // Try to create transaction manager (basic validation)
    const txManager = createPrivateKeyTransactionManager();
    const balance = await txManager.getBalance();

    return NextResponse.json({
      status: "ready",
      message: "Certificate creation service is ready",
      publicKey: txManager.getPublicKey().toString(),
      balance: balance,
      network: "devnet"
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
