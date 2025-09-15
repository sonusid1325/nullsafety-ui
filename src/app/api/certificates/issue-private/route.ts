import { NextRequest, NextResponse } from "next/server";
import { createPrivateKeyTransactionManager, generateCertificateId } from "@/lib/anchor/private-key-transactions";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      studentName,
      courseName,
      grade,
      certificateId,
      institutionName = "EduChain Demo Institution",
      location = "Blockchain University"
    } = body;

    // Validate required fields
    if (!studentName || !courseName || !grade) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: studentName, courseName, grade"
        },
        { status: 400 }
      );
    }

    // Generate certificate ID if not provided
    const finalCertificateId = certificateId || generateCertificateId(studentName, courseName);

    // Create transaction manager with private key
    const txManager = createPrivateKeyTransactionManager();

    console.log("🚀 Starting certificate issuance process...");
    console.log("📋 Certificate Details:", {
      studentName,
      courseName,
      grade,
      certificateId: finalCertificateId
    });

    // Check if institution setup is needed (first time)
    const institution = await txManager.getInstitution();
    if (!institution) {
      console.log("🏫 Setting up institution for first time...");
      const setupSuccess = await txManager.setupInstitution(institutionName, location);
      if (!setupSuccess) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to setup institution"
          },
          { status: 500 }
        );
      }
    }

    // Issue the certificate
    const result = await txManager.issueCertificate({
      studentName,
      courseName,
      grade,
      certificateId: finalCertificateId
    });

    if (result.success) {
      // Get certificate data for response
      const certificateData = await txManager.getCertificate(finalCertificateId);

      return NextResponse.json({
        success: true,
        data: {
          certificateId: finalCertificateId,
          transactionSignature: result.signature,
          transactionUrl: result.transactionUrl,
          certificateAddress: certificateData?.address.toString(),
          studentName,
          courseName,
          grade,
          issuedAt: new Date().toISOString(),
          issuerPublicKey: txManager.getPublicKey().toString()
        },
        message: "Certificate issued successfully on blockchain"
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          certificateId: finalCertificateId
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("❌ API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      // Return all certificates for this institution
      const txManager = createPrivateKeyTransactionManager();
      const certificates = await txManager.getAllCertificates();

      return NextResponse.json({
        success: true,
        data: {
          total: certificates.length,
          certificates: certificates.map(cert => ({
            address: cert.address.toString(),
            ...cert.data
          })),
          issuerPublicKey: txManager.getPublicKey().toString()
        }
      });
    }

    // Get specific certificate
    const txManager = createPrivateKeyTransactionManager();
    const certificate = await txManager.getCertificate(certificateId);

    if (!certificate) {
      return NextResponse.json(
        {
          success: false,
          error: "Certificate not found"
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        certificateId,
        address: certificate.address.toString(),
        ...certificate.data,
        issuerPublicKey: txManager.getPublicKey().toString()
      }
    });

  } catch (error) {
    console.error("❌ API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

// Batch certificate issuance
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { certificates } = body;

    if (!Array.isArray(certificates) || certificates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid certificates array"
        },
        { status: 400 }
      );
    }

    // Validate each certificate
    for (const cert of certificates) {
      if (!cert.studentName || !cert.courseName || !cert.grade) {
        return NextResponse.json(
          {
            success: false,
            error: "Each certificate must have studentName, courseName, and grade"
          },
          { status: 400 }
        );
      }
    }

    const txManager = createPrivateKeyTransactionManager();

    // Ensure institution is set up
    const institution = await txManager.getInstitution();
    if (!institution) {
      const setupSuccess = await txManager.setupInstitution("EduChain Demo Institution", "Blockchain University");
      if (!setupSuccess) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to setup institution"
          },
          { status: 500 }
        );
      }
    }

    // Process certificates with generated IDs
    const processedCertificates = certificates.map(cert => ({
      ...cert,
      certificateId: cert.certificateId || generateCertificateId(cert.studentName, cert.courseName)
    }));

    // Issue certificates in batch
    const results = await txManager.batchIssueCertificates(processedCertificates);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: true,
      data: {
        total: certificates.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((result, index) => ({
          certificateId: processedCertificates[index].certificateId,
          studentName: processedCertificates[index].studentName,
          success: result.success,
          transactionSignature: result.signature,
          transactionUrl: result.transactionUrl,
          error: result.error
        })),
        issuerPublicKey: txManager.getPublicKey().toString()
      },
      message: `Batch processing complete: ${successful.length}/${certificates.length} certificates issued successfully`
    });

  } catch (error) {
    console.error("❌ Batch API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
