import { NextRequest, NextResponse } from "next/server";
import { createPrivateKeyTransactionManager } from "@/lib/anchor/private-key-transactions";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issuedBy = searchParams.get('issuedBy');

    if (!issuedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "issuedBy parameter is required"
        },
        { status: 400 }
      );
    }

    console.log("🔄 Starting blockchain sync for issuer:", issuedBy);

    // Create private key transaction manager
    const txManager = createPrivateKeyTransactionManager();

    // Verify the issuer matches our private key public key
    const ourPublicKey = txManager.getPublicKey().toString();
    if (issuedBy !== ourPublicKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Can only sync certificates for the configured private key"
        },
        { status: 403 }
      );
    }

    // Get all certificates from blockchain
    console.log("⛓️  Fetching certificates from blockchain...");
    const blockchainCertificates = await txManager.getAllCertificates();

    console.log(`📊 Found ${blockchainCertificates.length} certificates on blockchain`);

    // Get all certificates from database for this issuer
    console.log("💾 Fetching certificates from database...");
    const { data: dbCertificates, error: dbError } = await supabase
      .from('certificates')
      .select('*')
      .eq('issued_by', issuedBy);

    if (dbError) {
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    console.log(`📊 Found ${dbCertificates?.length || 0} certificates in database`);

    // Create sync status map
    const syncStatus: { [key: string]: boolean } = {};
    const blockchainMap = new Map();

    // Build blockchain certificate map
    blockchainCertificates.forEach(cert => {
      blockchainMap.set(cert.data.certificateId, cert);
    });

    // Check sync status for each database certificate
    const syncResults = (dbCertificates || []).map(dbCert => {
      const isOnBlockchain = blockchainMap.has(dbCert.certificate_id);
      syncStatus[dbCert.certificate_id] = isOnBlockchain;

      return {
        certificateId: dbCert.certificate_id,
        studentName: dbCert.student_name,
        courseName: dbCert.course_name,
        grade: dbCert.grade,
        databaseId: dbCert.id,
        isOnBlockchain: isOnBlockchain,
        blockchainAddress: isOnBlockchain
          ? blockchainMap.get(dbCert.certificate_id).address.toString()
          : null,
        certificateHash: dbCert.certificate_hash,
        createdAt: dbCert.created_at
      };
    });

    // Find certificates that exist on blockchain but not in database
    const blockchainOnlyIds = blockchainCertificates
      .filter(bcCert => !dbCertificates?.some(dbCert => dbCert.certificate_id === bcCert.data.certificateId))
      .map(bcCert => bcCert.data.certificateId);

    // Statistics
    const totalDatabase = dbCertificates?.length || 0;
    const totalBlockchain = blockchainCertificates.length;
    const synced = syncResults.filter(r => r.isOnBlockchain).length;
    const databaseOnly = syncResults.filter(r => !r.isOnBlockchain).length;
    const blockchainOnly = blockchainOnlyIds.length;

    console.log("📊 Sync Statistics:");
    console.log(`   Total in database: ${totalDatabase}`);
    console.log(`   Total on blockchain: ${totalBlockchain}`);
    console.log(`   Synced certificates: ${synced}`);
    console.log(`   Database only: ${databaseOnly}`);
    console.log(`   Blockchain only: ${blockchainOnly}`);

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalDatabase,
          totalBlockchain,
          synced,
          databaseOnly,
          blockchainOnly,
          syncPercentage: totalDatabase > 0 ? Math.round((synced / totalDatabase) * 100) : 0
        },
        certificates: syncResults,
        blockchainOnlyCertificates: blockchainOnlyIds,
        syncStatus,
        issuerPublicKey: ourPublicKey,
        lastSyncAt: new Date().toISOString()
      },
      message: `Sync completed: ${synced}/${totalDatabase} certificates are synced with blockchain`
    });

  } catch (error) {
    console.error("❌ Blockchain sync error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("SOLANA_PRIVATE_KEY")) {
        return NextResponse.json(
          {
            success: false,
            error: "Private key not configured. Please add SOLANA_PRIVATE_KEY to your environment variables."
          },
          { status: 500 }
        );
      }

      if (error.message.includes("network") || error.message.includes("connection")) {
        return NextResponse.json(
          {
            success: false,
            error: "Network error: Unable to connect to Solana devnet. Check your internet connection."
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

// POST endpoint to force sync specific certificates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { certificateIds, issuedBy } = body;

    if (!certificateIds || !Array.isArray(certificateIds) || !issuedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "certificateIds array and issuedBy are required"
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Force syncing ${certificateIds.length} specific certificates...`);

    const txManager = createPrivateKeyTransactionManager();

    // Verify issuer
    if (issuedBy !== txManager.getPublicKey().toString()) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Can only sync certificates for the configured private key"
        },
        { status: 403 }
      );
    }

    const results: any[] = [];

    for (const certId of certificateIds) {
      try {
        const blockchainCert = await txManager.getCertificate(certId);
        results.push({
          certificateId: certId,
          found: !!blockchainCert,
          address: blockchainCert?.address.toString() || null,
          data: blockchainCert?.data || null
        });
      } catch (error) {
        results.push({
          certificateId: certId,
          found: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const found = results.filter(r => r.found).length;

    return NextResponse.json({
      success: true,
      data: {
        total: certificateIds.length,
        found: found,
        missing: certificateIds.length - found,
        results: results
      },
      message: `Force sync completed: ${found}/${certificateIds.length} certificates found on blockchain`
    });

  } catch (error) {
    console.error("❌ Force sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
