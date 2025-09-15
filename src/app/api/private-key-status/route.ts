import { NextResponse } from "next/server";
import { PrivateKeyUtils } from "@/lib/anchor/private-key-transactions";

export async function GET() {
  try {
    const privateKey = process.env.SOLANA_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({
        isAvailable: false,
        message: "SOLANA_PRIVATE_KEY environment variable is not set"
      });
    }

    if (privateKey.length < 32) {
      return NextResponse.json({
        isAvailable: false,
        message: "SOLANA_PRIVATE_KEY appears to be invalid (too short)"
      });
    }

    // Validate the private key format
    const isValid = PrivateKeyUtils.validatePrivateKey(privateKey);

    if (!isValid) {
      return NextResponse.json({
        isAvailable: false,
        message: "SOLANA_PRIVATE_KEY format is invalid"
      });
    }

    // Get the public key to show which wallet this corresponds to
    const publicKey = PrivateKeyUtils.getPublicKeyFromPrivate(privateKey);

    return NextResponse.json({
      isAvailable: true,
      message: "Private key is configured and valid",
      publicKey: publicKey
    });

  } catch (error) {
    console.error("Private key status check error:", error);

    return NextResponse.json({
      isAvailable: false,
      message: "Error checking private key: " + (error instanceof Error ? error.message : "Unknown error")
    });
  }
}
