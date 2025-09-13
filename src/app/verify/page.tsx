"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import {
  Search,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Award,
  Calendar,
  Building,
  User,
  Hash,
  Shield,
  Zap,
  Database,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  verifyCertificateById,
  VerificationResult,
} from "@/lib/certificateService";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { createMockWallet } from "@/lib/walletTypes";
import toast, { Toaster } from "react-hot-toast";

export default function UnifiedVerifyPage() {
  const walletContext = useWallet();
  const { connected, wallet } = walletContext;
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [blockchainEnabled, setBlockchainEnabled] = useState(true);

  const verifyCertificate = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a certificate ID");
      return;
    }

    try {
      setLoading(true);
      setVerificationResult(null);

      let provider: AnchorProvider | undefined;

      if (blockchainEnabled) {
        try {
          const connection = new Connection(
            process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
              "https://api.devnet.solana.com",
            "confirmed",
          );

          // Create mock wallet for verification
          if (walletContext) {
            const mockWallet = createMockWallet(walletContext);
            if (!mockWallet) {
              throw new Error("Failed to create wallet interface");
            }

            provider = new AnchorProvider(connection, mockWallet as never, {
              commitment: "confirmed",
            });
          }
        } catch (error) {
          console.warn("Failed to create blockchain provider:", error);
          setBlockchainEnabled(false);
        }
      }

      const result = await verifyCertificateById(
        searchQuery.trim(),
        provider,
        walletContext,
      );

      setVerificationResult(result);

      if (result.isValid) {
        toast.success("Certificate verified successfully!");
      } else {
        toast.error("Certificate verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed");
      setVerificationResult({
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        verificationSources: { supabase: false, blockchain: false },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      verifyCertificate();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white dark:text-black" />
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Certificate Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Verify certificates using our unified system that checks both
            blockchain and database records
          </p>
        </div>

        {!connected && (
          <Card className="mb-8 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
                <div className="text-center">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    Enhanced Verification Available
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Connect your wallet for blockchain verification and
                    transaction recording
                  </p>
                  <WalletMultiButton />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blockchain Status */}
        <div className="mb-6 flex items-center justify-center">
          <Badge
            variant={blockchainEnabled ? "default" : "secondary"}
            className={`${
              blockchainEnabled
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : ""
            } px-4 py-2`}
          >
            {blockchainEnabled ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Blockchain + Database Verification
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Database Only Verification
              </>
            )}
          </Badge>
          {!blockchainEnabled && (
            <Button
              variant="link"
              className="ml-2 text-sm"
              onClick={() => setBlockchainEnabled(true)}
            >
              Enable Blockchain
            </Button>
          )}
        </div>

        {/* Search Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Verify Certificate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Certificate ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter certificate ID (e.g., CERT-1234567890-abc)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                />
                <Button
                  onClick={verifyCertificate}
                  disabled={loading || !searchQuery.trim()}
                  className="px-6"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Example: CERT-1735659600000-abc123def
            </div>
          </CardContent>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {verificationResult.isValid ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <span>
                  {verificationResult.isValid
                    ? "Certificate Verified"
                    : "Verification Failed"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationResult.isValid && verificationResult.certificate ? (
                <div className="space-y-6">
                  {/* Verification Sources */}
                  <div className="flex items-center justify-center space-x-4">
                    <Badge
                      variant={
                        verificationResult.verificationSources.supabase
                          ? "default"
                          : "secondary"
                      }
                      className={
                        verificationResult.verificationSources.supabase
                          ? "bg-gray-100 text-gray-800 dark:bg-black dark:text-white border dark:border-gray-600"
                          : ""
                      }
                    >
                      <Database className="w-3 h-3 mr-1" />
                      Database{" "}
                      {verificationResult.verificationSources.supabase
                        ? "✓"
                        : "✗"}
                    </Badge>
                    <Badge
                      variant={
                        verificationResult.verificationSources.blockchain
                          ? "default"
                          : "secondary"
                      }
                      className={
                        verificationResult.verificationSources.blockchain
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : ""
                      }
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Blockchain{" "}
                      {verificationResult.verificationSources.blockchain
                        ? "✓"
                        : "✗"}
                    </Badge>
                  </div>

                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Student Name
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {verificationResult.certificate.student_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Hash className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Roll Number
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {verificationResult.certificate.roll_no}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Award className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Course & Grade
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {verificationResult.certificate.course_name}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Grade: {verificationResult.certificate.grade}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Building className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Institution
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {verificationResult.certificate.institution_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Issue Date
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {new Date(
                              verificationResult.certificate.issued_date,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Hash className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Certificate ID
                          </p>
                          <p className="font-mono text-sm text-black dark:text-white break-all">
                            {verificationResult.certificate.certificate_id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-800 dark:text-green-200">
                        Certificate Status: Valid & Active
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      <p>
                        ✅ Certificate exists in database
                        {verificationResult.verificationSources.blockchain &&
                          " and blockchain"}
                      </p>
                      <p>✅ Certificate is not revoked</p>
                      <p>
                        ✅ Verification count:{" "}
                        {verificationResult.certificate.verification_count || 0}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center space-x-4">
                    <a
                      href={`/cert/${verificationResult.certificate.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Certificate
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                    Certificate Not Found or Invalid
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {!verificationResult.verificationSources.supabase && (
                      <p>❌ Not found in database</p>
                    )}
                    {!verificationResult.verificationSources.blockchain && (
                      <p>❌ Not found on blockchain</p>
                    )}
                    {verificationResult.error && (
                      <p className="text-red-500">
                        Error: {verificationResult.error}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Please check the certificate ID and try again
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>How Verification Works</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-black dark:text-white mb-2">
                  Database Verification
                </h4>
                <ul className="space-y-1">
                  <li>• Checks certificate existence</li>
                  <li>• Validates revocation status</li>
                  <li>• Records verification count</li>
                  <li>• Fast and reliable</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-black dark:text-white mb-2">
                  Blockchain Verification
                </h4>
                <ul className="space-y-1">
                  <li>• Immutable on-chain record</li>
                  <li>• Cryptographic proof</li>
                  <li>• Decentralized validation</li>
                  <li>• Maximum security</li>
                </ul>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 rounded p-3 mt-4">
              <p className="text-gray-800 dark:text-white text-sm">
                <strong>Best Practice:</strong> A certificate is considered
                fully verified when it exists in both the database and
                blockchain with matching information.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
