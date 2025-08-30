"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Award,
  ExternalLink,
  Eye,
  Calendar,
  User,
  GraduationCap,
  Building,
  Hash,
  Loader2,
} from "lucide-react";
import { supabase, Certificate } from "@/lib/supabase";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  mintCertificateNFT,
  mintSimpleNFT,
  CertificateNFTMetadata,
  verifyNFTForPhantom,
} from "@/lib/mintCertificateNFT";

interface OwnedCertificate extends Certificate {
  tokenAccount?: string;
  balance?: number;
  phantomCompatible?: boolean;
  metadataAccount?: string;
}

export default function CollectablesPage() {
  const { connected, publicKey, wallet } = useWallet();
  const [ownedCertificates, setOwnedCertificates] = useState<
    OwnedCertificate[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMinting, setTestMinting] = useState(false);
  const [simpleMinting, setSimpleMinting] = useState(false);

  // Get RPC connection
  const getConnection = () => {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    return new Connection(rpcUrl, "confirmed");
  };

  // Fetch certificates owned by the connected wallet
  const fetchOwnedCertificates = useCallback(async () => {
    if (!connected || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching certificates for wallet:", publicKey.toString());

      // Get all certificates that have been minted as NFTs and belong to this wallet
      const { data: allCertificates, error: fetchError } = await supabase
        .from("certificates")
        .select("*")
        .not("nft_mint", "is", null)
        .eq("student_wallet", publicKey.toString());

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!allCertificates || allCertificates.length === 0) {
        console.log("No certificates found for this wallet");
        setOwnedCertificates([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${allCertificates.length} certificates in database`);

      // Verify NFT ownership on-chain
      const connection = getConnection();
      const verifiedCertificates: OwnedCertificate[] = [];

      for (const cert of allCertificates) {
        try {
          if (!cert.nft_mint) continue;

          const mintPubkey = new PublicKey(cert.nft_mint);
          const tokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            publicKey,
          );

          // Check if the token account exists and has balance
          const accountInfo =
            await connection.getTokenAccountBalance(tokenAccount);

          if (accountInfo.value.uiAmount && accountInfo.value.uiAmount > 0) {
            // Verify NFT is compatible with Phantom wallet
            const phantomVerification = await verifyNFTForPhantom(
              connection,
              cert.nft_mint,
            );

            verifiedCertificates.push({
              ...cert,
              tokenAccount: tokenAccount.toString(),
              balance: accountInfo.value.uiAmount,
              phantomCompatible: phantomVerification.isValid,
              metadataAccount: phantomVerification.metadataAccount,
            });
            console.log(`✅ Verified ownership of certificate: ${cert.id}`);
            console.log(
              `👻 Phantom compatible: ${phantomVerification.isValid}`,
            );
          }
        } catch (error) {
          console.log(
            `❌ Could not verify ownership of certificate ${cert.id}:`,
            error,
          );
          // Still include the certificate but mark as potentially not owned
          verifiedCertificates.push({
            ...cert,
            balance: 0,
            phantomCompatible: false,
          });
        }
      }

      console.log(`Verified ${verifiedCertificates.length} owned certificates`);
      setOwnedCertificates(verifiedCertificates);
    } catch (error) {
      console.error("Error fetching owned certificates:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch certificates";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchOwnedCertificates();
    } else {
      setOwnedCertificates([]);
    }
  }, [connected, publicKey, fetchOwnedCertificates]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Test minting function for debugging
  const testMint = async () => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    setTestMinting(true);
    try {
      console.log("🧪 Starting test mint...");

      const testMetadata: CertificateNFTMetadata = {
        studentName: "Test Student",
        rollNo: "TEST001",
        courseName: "Debug Testing Course",
        universityName: "Test University",
        issuedDate: new Date().toISOString().split("T")[0],
        certificateHash: "test-hash-" + Date.now(),
        certificateUrl: window.location.origin + "/collectables",
      };

      const result = await mintCertificateNFT(
        wallet.adapter,
        publicKey.toString(), // Mint to self for testing
        testMetadata,
      );

      if (result.success) {
        toast.success(`Test NFT minted! Address: ${result.nftAddress}`);
        console.log("✅ Test mint successful:", result);

        // Refresh the collectables list
        await fetchOwnedCertificates();
      } else {
        toast.error(`Test mint failed: ${result.error}`);
        console.error("❌ Test mint failed:", result.error);
      }
    } catch (error) {
      console.error("💥 Test mint error:", error);
      toast.error(
        `Test mint error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setTestMinting(false);
    }
  };

  // Simple test minting (no metadata, for debugging)
  const testSimpleMint = async () => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    setSimpleMinting(true);
    try {
      console.log("🧪 Starting simple test mint...");

      const result = await mintSimpleNFT(
        wallet.adapter,
        publicKey.toString(),
        (step, progress) => {
          console.log(`Progress: ${progress}% - ${step}`);
        },
      );

      if (result.success) {
        toast.success(`Simple NFT minted! Address: ${result.nftAddress}`);
        console.log("✅ Simple mint successful:", result);
        await fetchOwnedCertificates();
      } else {
        toast.error(`Simple mint failed: ${result.error}`);
        console.error("❌ Simple mint failed:", result.error);
      }
    } catch (error) {
      console.error("💥 Simple mint error:", error);
      toast.error(
        `Simple mint error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSimpleMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                  <Award className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="text-xl font-medium text-black dark:text-white">
                  NullSafety
                </span>
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / My Collectables
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Dashboard
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            My Certificate Collectables
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your NFT certificates stored on Solana blockchain
          </p>
        </div>

        {!connected ? (
          // Not Connected State
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardContent className="text-center py-16">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Connect your Solana wallet to view your NFT certificate
                collectables.
              </p>
              <WalletMultiButton />
            </CardContent>
          </Card>
        ) : loading ? (
          // Loading State
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardContent className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading your certificate collectables...
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          // Error State
          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/10">
            <CardContent className="text-center py-16">
              <div className="text-red-500 mb-4">
                <ExternalLink className="w-8 h-8 mx-auto" />
              </div>
              <h2 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">
                Error Loading Collectables
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button
                onClick={fetchOwnedCertificates}
                variant="outline"
                className="border-red-300 dark:border-red-700"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : ownedCertificates.length === 0 ? (
          // Empty State
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardContent className="text-center py-16">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                No Certificate Collectables
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                You don&apos;t have any NFT certificates yet. When institutions
                mint certificates to your wallet, they&apos;ll appear here.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Connected wallet: {publicKey?.toString().slice(0, 8)}...
                {publicKey?.toString().slice(-8)}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Certificates Grid
          <>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Found{" "}
                  <span className="font-medium text-black dark:text-white">
                    {ownedCertificates.length}
                  </span>{" "}
                  certificate{ownedCertificates.length !== 1 ? "s" : ""}
                </p>
                <Button
                  onClick={fetchOwnedCertificates}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 dark:border-gray-700"
                >
                  Refresh
                </Button>
                <Button
                  onClick={testMint}
                  disabled={testMinting || !connected}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                >
                  {testMinting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "🧪 Test Mint"
                  )}
                </Button>
                <Button
                  onClick={testSimpleMint}
                  disabled={simpleMinting || !connected}
                  variant="outline"
                  size="sm"
                  className="border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                >
                  {simpleMinting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Simple...
                    </>
                  ) : (
                    "⚡ Simple Mint"
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownedCertificates.map((certificate) => (
                <Card
                  key={certificate.id}
                  className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-black dark:text-white" />
                        <CardTitle className="text-sm font-medium text-black dark:text-white">
                          NFT Certificate
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-1">
                        {certificate.balance && certificate.balance > 0 ? (
                          <div
                            className="w-2 h-2 bg-green-500 rounded-full"
                            title="Verified ownership"
                          />
                        ) : (
                          <div
                            className="w-2 h-2 bg-yellow-500 rounded-full"
                            title="Ownership pending verification"
                          />
                        )}
                        {certificate.phantomCompatible ? (
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full"
                            title="Phantom wallet compatible"
                          />
                        ) : (
                          <div
                            className="w-2 h-2 bg-red-500 rounded-full"
                            title="Not visible in Phantom - missing metadata"
                          />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-black dark:text-white">
                          {certificate.student_name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {certificate.course_name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {certificate.institution_name ||
                            "Unknown Institution"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatDate(certificate.issued_date)}
                        </span>
                      </div>

                      {certificate.grade && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Grade: {certificate.grade}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 space-y-2">
                      {!certificate.phantomCompatible &&
                        certificate.nft_mint && (
                          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded border border-red-200 dark:border-red-800">
                            ⚠️ This NFT may not appear in Phantom wallet due to
                            missing metadata
                          </div>
                        )}

                      <div className="flex space-x-2">
                        <Link
                          href={`/cert/${certificate.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs border-gray-300 dark:border-gray-700"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Certificate
                          </Button>
                        </Link>

                        {certificate.nft_mint && (
                          <a
                            href={`https://solscan.io/token/${certificate.nft_mint}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs border-gray-300 dark:border-gray-700"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View NFT
                            </Button>
                          </a>
                        )}
                      </div>

                      {certificate.nft_mint && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 font-mono break-all">
                          {certificate.nft_mint}
                        </div>
                      )}

                      {certificate.metadataAccount && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          👻 Phantom Compatible - Metadata:{" "}
                          {certificate.metadataAccount.slice(0, 8)}...
                          {certificate.metadataAccount.slice(-8)}
                        </div>
                      )}

                      {certificate.metadataAccount && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          👻 Phantom Compatible - Metadata:{" "}
                          {certificate.metadataAccount.slice(0, 8)}...
                          {certificate.metadataAccount.slice(-8)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
