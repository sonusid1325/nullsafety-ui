import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createCertificateService,
  CertificateData,
} from "@/lib/certificateService";
import { WalletContextState } from "@solana/wallet-adapter-react";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const issued_by = searchParams.get("issued_by");

    console.log("API: Fetching certificates list", {
      limit,
      offset,
      issued_by,
    });

    let query = supabase
      .from("certificates")
      .select("*")
      .order("created_at", { ascending: false });

    if (issued_by) {
      query = query.eq("issued_by", issued_by);
    }

    const {
      data: certificates,
      error,
      count,
    } = await query.range(offset, offset + limit - 1).limit(limit);

    if (error) {
      console.error("API: Certificates fetch error:", error);
      return NextResponse.json(
        { error: "Database error", details: error },
        { status: 500 },
      );
    }

    console.log(`API: Found ${certificates?.length || 0} certificates`);

    return NextResponse.json({
      success: true,
      data: certificates || [],
      pagination: {
        offset,
        limit,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("API: Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

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
      wallet_data, // Optional wallet data for blockchain integration
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

    console.log("API: Creating unified certificate for student:", student_name);

    const certificateData: CertificateData = {
      studentName: student_name,
      rollNo: roll_no,
      courseName: course_name,
      grade,
      institutionName: institution_name,
      issuedBy: issued_by,
      studentWallet: student_wallet,
    };

    // Create certificate service (without blockchain if no wallet data)
    const certificateService = createCertificateService();

    if (wallet_data && wallet_data.publicKey) {
      // If wallet data is provided, attempt blockchain integration
      try {
        const mockWallet = {
          publicKey: { toString: () => wallet_data.publicKey },
          connected: true,
          signTransaction: null, // This would need to be handled client-side
        } as unknown as WalletContextState;

        const result = await certificateService.createCertificate(
          certificateData,
          mockWallet,
        );

        if (result.success) {
          console.log("API: Certificate created in both systems");
          return NextResponse.json({
            success: true,
            message: "Certificate created in both database and blockchain",
            data: result.certificate,
            blockchain_signature: result.blockchainSignature,
          });
        } else if (result.partialSuccess) {
          console.warn("API: Partial certificate creation:", result.error);
          return NextResponse.json({
            success: true,
            message: "Certificate created with partial blockchain integration",
            data: result.certificate,
            warning: result.error,
            partial_success: result.partialSuccess,
          });
        } else {
          throw new Error(result.error || "Certificate creation failed");
        }
      } catch {
        console.warn(
          "API: Blockchain integration failed, falling back to database only",
        );
        // Fall through to database-only creation
      }
    }

    // Fallback to database-only creation
    const certificateDbData = {
      student_name,
      roll_no,
      course_name,
      grade,
      certificate_id: `CERT-${Date.now()}`,
      institution_name,
      issued_by,
      issued_date: new Date().toISOString().split("T")[0],
      certificate_hash: `hash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      is_revoked: false,
    };

    const { data, error } = await supabase
      .from("certificates")
      .insert([certificateDbData])
      .select()
      .single();

    if (error) {
      console.error("API: Certificate creation error:", error);
      return NextResponse.json(
        { error: "Failed to create certificate", details: error },
        { status: 500 },
      );
    }

    console.log("API: Certificate created with ID:", data.id);

    return NextResponse.json({
      success: true,
      message: "Certificate created successfully (database only)",
      data,
      blockchain_status: "not_integrated",
    });
  } catch (error) {
    console.error("API: Certificate creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
