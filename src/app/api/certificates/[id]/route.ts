import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Certificate ID is required" },
        { status: 400 }
      );
    }

    console.log("API: Fetching certificate with ID:", id);

    // Fetch certificate data
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .single();

    if (certError) {
      console.error("API: Certificate fetch error:", certError);

      if (certError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Certificate not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Database error", details: certError },
        { status: 500 }
      );
    }

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    console.log("API: Certificate found:", certificate.certificate_id);

    // Try to fetch matching institution data
    let enrichedCertificate = certificate;

    if (certificate.institution_name) {
      const { data: institution, error: instError } = await supabase
        .from("institutions")
        .select("name, logo_url")
        .eq("name", certificate.institution_name)
        .single();

      if (!instError && institution) {
        enrichedCertificate = {
          ...certificate,
          institutions: institution,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedCertificate,
    });

  } catch (error) {
    console.error("API: Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { verifier_wallet } = body;

    console.log("API: Recording certificate verification for ID:", id);

    // Record the verification
    const { data, error } = await supabase
      .from("certificate_verifications")
      .insert([
        {
          certificate_id: id,
          verifier_wallet: verifier_wallet || null,
          ip_address: request.headers.get("x-forwarded-for") ||
                     request.headers.get("x-real-ip") ||
                     "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        },
      ])
      .select();

    if (error) {
      console.error("API: Verification recording error:", error);
      return NextResponse.json(
        { error: "Failed to record verification", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification recorded",
      data,
    });

  } catch (error) {
    console.error("API: Verification recording error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
