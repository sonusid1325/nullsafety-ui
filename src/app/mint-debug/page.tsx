"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Network,
  Clock,
  Activity,
  Info,
} from "lucide-react";
import { Connection } from "@solana/web3.js";
import {
  checkNFTMinted,
  mintCertificateNFTEnhanced,
  CertificateNFTMetadata,
  diagnoseWalletConnectivity,
  testWalletSigning,
  getLastSigningSpeed,
  optimizeWalletForMinting,
} from "@/lib/mintCertificateNFT";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

interface DevnetStatus {
  isHealthy: boolean;
  slot: number;
  epoch: number;
  blockHeight: number;
  version: string;
  error?: string;
}

interface TransactionCheck {
  signature: string;
  status: string;
  confirmations: number;
  success: boolean;
  error?: string;
}

export default function MintDebugPage() {
  const { connected, publicKey, wallet } = useWallet();
  const [devnetStatus, setDevnetStatus] = useState<DevnetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMinting, setTestMinting] = useState(false);
  const [mintProgress, setMintProgress] = useState({ step: "", progress: 0 });
  const [checkingTx, setCheckingTx] = useState(false);
  const [txToCheck, setTxToCheck] = useState("");
  const [txResult, setTxResult] = useState<TransactionCheck | null>(null);
  const [nftCheck, setNftCheck] = useState({
    mint: "",
    wallet: "",
    result: null as {
      success: boolean;
      balance: number;
      error?: string;
    } | null,
    checking: false,
  });
  const [walletDiagnostics, setWalletDiagnostics] = useState<{
    isConnected: boolean;
    hasPublicKey: boolean;
    canSign: boolean;
    balance: number | null;
    errors: string[];
  } | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [signingTest, setSigningTest] = useState<{
    canSign: boolean;
    signingTime: number;
    error?: string;
    recommendedTimeouts?: {
      basic: number;
      metadata: number;
      fallback: number;
    };
  } | null>(null);
  const [testingSign, setTestingSign] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    success: boolean;
    improvements: string[];
    errors: string[];
    finalSigningSpeed?: number;
  } | null>(null);

  const getConnection = () => {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    return new Connection(rpcUrl, "confirmed");
  };

  const checkDevnetStatus = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🔍 Checking Devnet status...");
      const connection = getConnection();

      const [slot, epochInfo, blockHeight, version] = await Promise.all([
        connection.getSlot().catch(() => 0),
        connection.getEpochInfo().catch(() => null),
        connection.getBlockHeight().catch(() => 0),
        connection.getVersion().catch(() => ({ "solana-core": "unknown" })),
      ]);

      // Test a simple operation to verify connection health
      let isHealthy = false;
      try {
        await connection.getLatestBlockhash("confirmed");
        isHealthy = slot > 0;
      } catch {
        isHealthy = false;
      }

      setDevnetStatus({
        isHealthy,
        slot,
        epoch: epochInfo?.epoch || 0,
        blockHeight,
        version: version["solana-core"] || "unknown",
      });

      console.log("✅ Devnet status check complete");
    } catch (error) {
      console.error("❌ Failed to check devnet status:", error);
      setDevnetStatus({
        isHealthy: false,
        slot: 0,
        epoch: 0,
        blockHeight: 0,
        version: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const checkTransaction = async () => {
    if (!txToCheck.trim()) {
      toast.error("Please enter a transaction signature");
      return;
    }

    setCheckingTx(true);
    try {
      const connection = getConnection();
      const status = await connection.getSignatureStatus(txToCheck);

      setTxResult({
        signature: txToCheck,
        status: status.value?.confirmationStatus || "unknown",
        confirmations: status.value?.confirmations || 0,
        success: !status.value?.err,
        error: status.value?.err ? JSON.stringify(status.value.err) : undefined,
      });

      console.log("Transaction check result:", status);
    } catch (error) {
      console.error("Transaction check failed:", error);
      setTxResult({
        signature: txToCheck,
        status: "error",
        confirmations: 0,
        success: false,
        error: error instanceof Error ? error.message : "Check failed",
      });
    } finally {
      setCheckingTx(false);
    }
  };

  const checkNFTStatus = async () => {
    if (!nftCheck.mint.trim() || !nftCheck.wallet.trim()) {
      toast.error("Please enter both mint address and wallet address");
      return;
    }

    setNftCheck((prev) => ({ ...prev, checking: true }));
    try {
      const connection = getConnection();
      const result = await checkNFTMinted(
        connection,
        nftCheck.mint,
        nftCheck.wallet,
      );
      setNftCheck((prev) => ({ ...prev, result }));
    } catch (error) {
      console.error("NFT check failed:", error);
      setNftCheck((prev) => ({
        ...prev,
        result: {
          success: false,
          balance: 0,
          error: error instanceof Error ? error.message : "Check failed",
        },
      }));
    } finally {
      setNftCheck((prev) => ({ ...prev, checking: false }));
    }
  };

  const testQuickMint = async () => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    setTestMinting(true);
    setMintProgress({ step: "Starting...", progress: 0 });

    try {
      console.log("🧪 Starting enhanced test mint with fallbacks...");

      const testMetadata: CertificateNFTMetadata = {
        studentName: "Debug Test",
        rollNo: "DEBUG001",
        courseName: "Mint Testing",
        universityName: "Debug University",
        issuedDate: new Date().toISOString().split("T")[0],
        certificateHash: "debug-hash-" + Date.now(),
        certificateUrl: window.location.origin,
      };

      const result = await mintCertificateNFTEnhanced(
        wallet.adapter,
        publicKey.toString(),
        testMetadata,
        (step, progress) => {
          setMintProgress({ step, progress });
          console.log(`📊 Progress: ${progress}% - ${step}`);
        },
      );

      if (result.success) {
        toast.success("Enhanced mint successful! Check logs for details.");
        console.log("✅ Enhanced mint result:", result);

        // Auto-fill the NFT check fields
        setNftCheck({
          mint: result.nftAddress || "",
          wallet: publicKey.toString(),
          result: null,
          checking: false,
        });
      } else {
        toast.error(`Enhanced mint failed: ${result.error}`);
        console.error("❌ Enhanced mint failed:", result);
      }
    } catch (error) {
      console.error("💥 Enhanced mint error:", error);
      toast.error(
        `Enhanced mint error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setTestMinting(false);
      setMintProgress({ step: "", progress: 0 });
    }
  };

  const runWalletDiagnostics = async () => {
    if (!wallet) {
      toast.error("No wallet available");
      return;
    }

    setDiagnosisLoading(true);
    try {
      const diagnostics = await diagnoseWalletConnectivity(wallet.adapter);
      setWalletDiagnostics(diagnostics);

      if (diagnostics.errors.length === 0) {
        toast.success("Wallet diagnostics passed!");
      } else {
        toast.error(`Found ${diagnostics.errors.length} wallet issues`);
      }
    } catch (error) {
      console.error("Diagnostics failed:", error);
      toast.error("Failed to run diagnostics");
    } finally {
      setDiagnosisLoading(false);
    }
  };

  const runSigningTest = async () => {
    if (!wallet) {
      toast.error("No wallet available");
      return;
    }

    setTestingSign(true);
    try {
      const result = await testWalletSigning(wallet.adapter);
      setSigningTest(result);

      if (result.canSign) {
        if (result.signingTime > 3000) {
          toast.success(
            `Signing works but is slow (${result.signingTime}ms). Enhanced mint will use adaptive timeouts.`,
            { duration: 4000 },
          );
        } else {
          toast.success(`Signing test passed in ${result.signingTime}ms!`);
        }
      } else {
        toast.error(`Signing test failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Signing test failed:", error);
      toast.error("Failed to run signing test");
      setSigningTest({
        canSign: false,
        signingTime: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTestingSign(false);
    }
  };

  const runWalletOptimization = async () => {
    if (!wallet) {
      toast.error("No wallet available");
      return;
    }

    setOptimizing(true);
    setOptimizationResult(null);
    try {
      const result = await optimizeWalletForMinting(wallet.adapter);
      setOptimizationResult(result);

      if (result.success) {
        if (result.finalSigningSpeed && result.finalSigningSpeed > 3000) {
          toast.success(
            `Wallet optimized! Signing speed: ${result.finalSigningSpeed}ms. Enhanced mint will use adaptive timeouts.`,
            { duration: 5000 },
          );
        } else {
          toast.success(
            `Wallet optimization complete! Ready for fast minting.`,
          );
        }
      } else {
        toast.error(`Optimization failed: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error("Optimization failed:", error);
      toast.error("Failed to optimize wallet");
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    checkDevnetStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkDevnetStatus, 30000);
    return () => clearInterval(interval);
  }, [checkDevnetStatus]);

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
                  <Activity className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="text-xl font-medium text-black dark:text-white">
                  Mint Debug
                </span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Home
              </Link>
              <Link
                href="/collectables"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Collectables
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
            Mint Debug Console
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Diagnostic tools for troubleshooting NFT minting on Solana Devnet
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Devnet Status */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Network className="w-5 h-5" />
                  <span>Devnet Status</span>
                </CardTitle>
                <Button
                  onClick={checkDevnetStatus}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {devnetStatus ? (
                <>
                  <div className="flex items-center space-x-2">
                    {devnetStatus.isHealthy ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {devnetStatus.isHealthy ? "Healthy" : "Issues Detected"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current Slot:
                      </span>
                      <span className="font-mono">
                        {devnetStatus.slot.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Epoch:
                      </span>
                      <span className="font-mono">{devnetStatus.epoch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Block Height:
                      </span>
                      <span className="font-mono">
                        {devnetStatus.blockHeight.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Version:
                      </span>
                      <span className="font-mono text-xs">
                        {devnetStatus.version}
                      </span>
                    </div>
                  </div>

                  {devnetStatus.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded">
                      {devnetStatus.error}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Checking devnet status...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Test Mint */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Quick Test Mint</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test NFT minting with metadata that will appear in Phantom
                wallet collectables.
              </p>

              {connected ? (
                <>
                  <Button
                    onClick={testQuickMint}
                    disabled={testMinting}
                    className="w-full"
                  >
                    {testMinting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enhanced Minting...
                      </>
                    ) : (
                      "🎯 Test Enhanced NFT Mint"
                    )}
                  </Button>

                  {/* Progress Indicator */}
                  {testMinting && mintProgress.step && (
                    <div className="space-y-3 mt-4 p-3 bg-blue-50 dark:bg-blue-950/10 rounded-lg border">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                          {mintProgress.step}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono">
                          {Math.round(mintProgress.progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-900/20 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${mintProgress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Enhanced minting tries metadata first, then falls back
                        to basic NFT if needed
                      </p>
                      {mintProgress.step.includes("Signing") && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/10 p-2 rounded">
                          ⏳ If stuck here, it&apos;s likely a Phantom wallet
                          signing issue on Devnet. Enhanced mint uses adaptive
                          timeouts and will auto-skip metadata if needed.
                          {getLastSigningSpeed() && (
                            <div className="mt-1">
                              Your signing speed: {getLastSigningSpeed()}ms
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Connect wallet to test minting
                  </p>
                  <WalletMultiButton />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Checker */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5" />
                <span>Transaction Checker</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Transaction Signature:
                </label>
                <input
                  type="text"
                  value={txToCheck}
                  onChange={(e) => setTxToCheck(e.target.value)}
                  placeholder="Enter transaction signature..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white text-sm font-mono"
                />
              </div>

              <Button
                onClick={checkTransaction}
                disabled={checkingTx || !txToCheck.trim()}
                className="w-full"
              >
                {checkingTx ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Transaction"
                )}
              </Button>

              {txResult && (
                <div className="space-y-2 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`font-medium ${txResult.success ? "text-green-600" : "text-red-600"}`}
                    >
                      {txResult.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Confirmations:
                    </span>
                    <span className="font-mono">{txResult.confirmations}</span>
                  </div>
                  {txResult.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded break-all">
                      {txResult.error}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Diagnostics */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Wallet Diagnostics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check wallet connectivity and readiness for minting.
              </p>

              <Button
                onClick={runWalletDiagnostics}
                disabled={diagnosisLoading || !wallet}
                className="w-full"
              >
                {diagnosisLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  "🔍 Run Wallet Diagnostics"
                )}
              </Button>

              {walletDiagnostics && (
                <div className="space-y-3 text-sm border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Connected:
                      </span>
                      <span
                        className={
                          walletDiagnostics.isConnected
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {walletDiagnostics.isConnected ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Has Public Key:
                      </span>
                      <span
                        className={
                          walletDiagnostics.hasPublicKey
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {walletDiagnostics.hasPublicKey ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Can Sign:
                      </span>
                      <span
                        className={
                          walletDiagnostics.canSign
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {walletDiagnostics.canSign ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Balance:
                      </span>
                      <span className="font-mono">
                        {walletDiagnostics.balance !== null
                          ? `${(walletDiagnostics.balance / 1000000000).toFixed(4)} SOL`
                          : "Unknown"}
                      </span>
                    </div>
                  </div>

                  {walletDiagnostics.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600 dark:text-red-400">
                        Issues Found:
                      </h4>
                      <ul className="space-y-1">
                        {walletDiagnostics.errors.map((error, index) => (
                          <li
                            key={index}
                            className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded"
                          >
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signing Test */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Transaction Signing Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test wallet&apos;s ability to sign transactions (identifies
                signing timeout issues).
              </p>

              <Button
                onClick={runSigningTest}
                disabled={testingSign || !wallet}
                className="w-full"
              >
                {testingSign ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Signing...
                  </>
                ) : (
                  "🖊️ Test Transaction Signing"
                )}
              </Button>

              {signingTest && (
                <div className="space-y-3 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Can Sign:
                    </span>
                    <span
                      className={
                        signingTest.canSign ? "text-green-600" : "text-red-600"
                      }
                    >
                      {signingTest.canSign ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Signing Time:
                    </span>
                    <span className="font-mono">
                      {signingTest.signingTime}ms
                    </span>
                  </div>
                  {signingTest.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded">
                      {signingTest.error}
                    </div>
                  )}
                  {signingTest.canSign && signingTest.signingTime > 3000 && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/10 p-2 rounded">
                      ⚠️ Slow signing ({signingTest.signingTime}ms) - may cause
                      minting issues
                    </div>
                  )}
                  {signingTest.canSign && signingTest.signingTime <= 1000 && (
                    <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/10 p-2 rounded">
                      ✅ Fast signing - good for minting!
                    </div>
                  )}
                  {signingTest.recommendedTimeouts && (
                    <div className="mt-3">
                      <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Adaptive Timeouts (based on your signing speed):
                      </h6>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-950/10 p-2 rounded">
                          <div className="font-medium text-blue-800 dark:text-blue-200">
                            Basic
                          </div>
                          <div className="text-blue-600 dark:text-blue-400">
                            {Math.round(
                              signingTest.recommendedTimeouts.basic / 1000,
                            )}
                            s
                          </div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/10 p-2 rounded">
                          <div className="font-medium text-purple-800 dark:text-purple-200">
                            Metadata
                          </div>
                          <div className="text-purple-600 dark:text-purple-400">
                            {Math.round(
                              signingTest.recommendedTimeouts.metadata / 1000,
                            )}
                            s
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/10 p-2 rounded">
                          <div className="font-medium text-green-800 dark:text-green-200">
                            Fallback
                          </div>
                          <div className="text-green-600 dark:text-green-400">
                            {Math.round(
                              signingTest.recommendedTimeouts.fallback / 1000,
                            )}
                            s
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Enhanced mint will automatically use these timeouts for
                        your wallet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Optimization */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Wallet Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Optimize wallet performance for better signing speed and minting
                success.
              </p>

              <Button
                onClick={runWalletOptimization}
                disabled={optimizing || !wallet}
                className="w-full"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing Wallet...
                  </>
                ) : (
                  "⚡ Optimize Wallet for Minting"
                )}
              </Button>

              {optimizationResult && (
                <div className="space-y-3 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={
                        optimizationResult.success
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {optimizationResult.success ? "Success" : "Failed"}
                    </span>
                  </div>

                  {optimizationResult.finalSigningSpeed && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Final Signing Speed:
                      </span>
                      <span className="font-mono">
                        {optimizationResult.finalSigningSpeed}ms
                      </span>
                    </div>
                  )}

                  {optimizationResult.improvements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-600 dark:text-green-400">
                        Improvements:
                      </h4>
                      <ul className="space-y-1">
                        {optimizationResult.improvements.map(
                          (improvement, index) => (
                            <li
                              key={index}
                              className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/10 p-2 rounded"
                            >
                              ✓ {improvement}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {optimizationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600 dark:text-red-400">
                        Issues Found:
                      </h4>
                      <ul className="space-y-1">
                        {optimizationResult.errors.map((error, index) => (
                          <li
                            key={index}
                            className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded"
                          >
                            ⚠ {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* NFT Checker */}
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>NFT Ownership Checker</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NFT Mint Address:</label>
                <input
                  type="text"
                  value={nftCheck.mint}
                  onChange={(e) =>
                    setNftCheck((prev) => ({ ...prev, mint: e.target.value }))
                  }
                  placeholder="Enter NFT mint address..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Address:</label>
                <input
                  type="text"
                  value={nftCheck.wallet}
                  onChange={(e) =>
                    setNftCheck((prev) => ({ ...prev, wallet: e.target.value }))
                  }
                  placeholder="Enter wallet address..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white text-sm font-mono"
                />
              </div>

              <Button
                onClick={checkNFTStatus}
                disabled={
                  nftCheck.checking ||
                  !nftCheck.mint.trim() ||
                  !nftCheck.wallet.trim()
                }
                className="w-full"
              >
                {nftCheck.checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check NFT Ownership"
                )}
              </Button>

              {nftCheck.result && (
                <div className="space-y-2 text-sm border-t pt-4">
                  <div className="flex items-center space-x-2">
                    {nftCheck.result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {nftCheck.result.success ? "NFT Found" : "NFT Not Found"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Balance:
                    </span>
                    <span className="font-mono">{nftCheck.result.balance}</span>
                  </div>
                  {nftCheck.result.error && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/10 p-2 rounded">
                      {nftCheck.result.error}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting Section */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>NFT Minting Troubleshooting Guide</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {/* Enhanced Minting Process */}
            <div className="bg-blue-50 dark:bg-blue-950/10 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-blue-800 dark:text-blue-200">
                🚀 Enhanced Minting Process (Recommended)
              </h4>
              <p className="text-blue-700 dark:text-blue-300 mb-2">
                The Enhanced NFT Mint uses multiple fallback strategies:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>
                  <strong>Strategy 1:</strong> Full mint with metadata (for
                  Phantom wallet visibility)
                </li>
                <li>
                  <strong>Strategy 2:</strong> Basic mint without metadata (if
                  metadata fails)
                </li>
                <li>
                  <strong>Strategy 3:</strong> Simple fallback (single
                  transaction, fastest)
                </li>
              </ol>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                This approach maximizes success rate and automatically handles
                most issues.
              </p>
            </div>

            {/* Common Issues */}
            <div>
              <h4 className="font-medium mb-3">🔧 Common Issues & Solutions</h4>
              <div className="space-y-4">
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Transaction Stuck at &quot;Signing&quot; or &quot;Waiting
                    for confirmation&quot;
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                    <li>
                      <strong>Stuck at signing:</strong> Common Phantom/Devnet
                      issue - enhanced mint uses adaptive timeouts and
                      auto-skips metadata
                    </li>
                    <li>
                      Run Transaction Signing Test to measure your wallet&apos;s
                      speed
                    </li>
                    <li>
                      <strong>Slow signing (&gt;3000ms):</strong> Enhanced mint
                      automatically increases timeouts based on your
                      wallet&apos;s performance
                    </li>
                    <li>
                      Devnet can be slow - wait up to 2-3 minutes for
                      confirmation
                    </li>
                    <li>
                      Check Devnet status above (should show
                      &quot;Healthy&quot;)
                    </li>
                    <li>
                      Enhanced mint automatically retries with intelligent
                      fallbacks
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200">
                    Wallet Signing Performance (Slow Signing &gt; 3000ms)
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                    <li>
                      <strong>Refresh Phantom:</strong> Close and reopen Phantom
                      extension
                    </li>
                    <li>
                      <strong>Clear cache:</strong> Go to Phantom Settings →
                      Advanced → Reset Account (keeps wallet, clears cache)
                    </li>
                    <li>
                      <strong>Switch networks:</strong> Change to Mainnet then
                      back to Devnet
                    </li>
                    <li>
                      <strong>Browser restart:</strong> Close all browser tabs
                      and restart
                    </li>
                    <li>
                      <strong>Try incognito mode:</strong> Test with fresh
                      browser session
                    </li>
                    <li>
                      Enhanced mint automatically adjusts timeouts for slow
                      wallets
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-400 pl-4">
                  <h5 className="font-medium text-red-800 dark:text-red-200">
                    NFT Not Appearing in Phantom Wallet
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                    <li>
                      Only NFTs with metadata appear in Phantom collectables
                    </li>
                    <li>Use Enhanced mint (tries metadata first)</li>
                    <li>
                      Basic NFTs still exist but won&apos;t show in wallet UI
                    </li>
                    <li>
                      Check NFT ownership section to verify minting success
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-400 pl-4">
                  <h5 className="font-medium text-orange-800 dark:text-orange-200">
                    Page Becomes Unresponsive
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                    <li>Enhanced mint shows progress to prevent UI freezing</li>
                    <li>Uses non-blocking confirmation polling</li>
                    <li>Automatic timeout and retry logic</li>
                    <li>Refresh page if completely stuck</li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-medium text-purple-800 dark:text-purple-200">
                    Wallet Connection Issues
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1">
                    <li>Run Wallet Diagnostics above</li>
                    <li>Ensure you have at least 0.01 SOL for basic minting</li>
                    <li>Try disconnecting and reconnecting wallet</li>
                    <li>Make sure Phantom is set to Devnet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div>
              <h4 className="font-medium mb-3">✅ Best Practices</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950/10 p-3 rounded">
                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Before Minting
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300 text-xs">
                    <li>Check Devnet status is &quot;Healthy&quot;</li>
                    <li>Run wallet diagnostics</li>
                    <li>Test signing speed first</li>
                    <li>Optimize wallet if signing is slow</li>
                    <li>Ensure sufficient SOL balance</li>
                    <li>Use Enhanced mint for best results</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/10 p-3 rounded">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    During Minting
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300 text-xs">
                    <li>Don&apos;t close browser tab</li>
                    <li>Watch progress indicator</li>
                    <li>Be patient with confirmations</li>
                    <li>Wait for adaptive timeouts</li>
                    <li>Don&apos;t retry immediately if stuck</li>
                  </ul>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/10 p-3 rounded">
                  <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                    For Slow Signing
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-orange-700 dark:text-orange-300 text-xs">
                    <li>Refresh Phantom wallet first</li>
                    <li>Enhanced mint uses longer timeouts</li>
                    <li>Expect auto-fallback to basic NFT</li>
                    <li>Try browser restart if very slow</li>
                    <li>Basic NFTs still work fully</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Debug Steps */}
            <div>
              <h4 className="font-medium mb-3">🔍 Debug Steps</h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>
                  <strong>Check Devnet Status:</strong> Verify network health
                  above
                </li>
                <li>
                  <strong>Test Signing Speed:</strong> Run signing test to
                  measure wallet performance
                </li>
                <li>
                  <strong>Optimize Wallet:</strong> If signing is slow, run
                  wallet optimization
                </li>
                <li>
                  <strong>Run Wallet Diagnostics:</strong> Ensure wallet is
                  properly connected
                </li>
                <li>
                  <strong>Try Enhanced Mint:</strong> Use the recommended
                  minting approach with adaptive timeouts
                </li>
                <li>
                  <strong>Monitor Progress:</strong> Watch the progress
                  indicator for updates
                </li>
                <li>
                  <strong>Check Transaction:</strong> Use transaction signature
                  to verify status
                </li>
                <li>
                  <strong>Verify NFT:</strong> Check ownership even if
                  confirmation seems stuck
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Quick Help Section */}
        <Card className="mt-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle>Quick Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">
                If minting gets stuck at &quot;waiting for confirmation&quot;:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Check if Devnet status shows &quot;Healthy&quot;</li>
                <li>
                  Try the &quot;Enhanced NFT Mint&quot; for automatic fallbacks
                </li>
                <li>Use Transaction Checker with your transaction signature</li>
                <li>Check NFT ownership even if confirmation seems stuck</li>
                <li>Devnet can be slow - transactions may take 1-5 minutes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Emergency Recovery:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>
                  <strong>Page frozen:</strong> Refresh and check transaction
                  status
                </li>
                <li>
                  <strong>All strategies fail:</strong> Check Devnet status and
                  try later
                </li>
                <li>
                  <strong>NFT missing from Phantom:</strong> Check ownership -
                  it might be a basic NFT without metadata
                </li>
                <li>
                  <strong>Wallet issues:</strong> Disconnect/reconnect and run
                  diagnostics
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
