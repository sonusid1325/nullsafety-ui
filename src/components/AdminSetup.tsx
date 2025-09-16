"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  XCircle,
  Settings,
  Zap,
  AlertCircle,
  Loader2,
  Crown,
  Database,
  Key,
  ExternalLink,
  Copy,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast, { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { useGlobalState, useWalletUtils } from "@/lib/anchor/hooks";
import { useTransactions } from "@/lib/anchor/useTransactions";
import { SolanaClient, PROGRAM_ID } from "@/lib/anchor/client";

// System admin wallet addresses (replace with actual admin addresses)
const SYSTEM_ADMIN_WALLETS = [
  // Add your admin wallet addresses here
  "BYQ7mNMX1UWjaC4yZ9KQFRsNSTyTf84FrkpgcpKorcky",
  "REPLACE_WITH_ACTUAL_ADMIN_WALLET_2",
];

interface SystemInfo {
  programId: string;
  globalStatePDA: string;
  rpcEndpoint: string;
  network: string;
  explorerUrl: string;
}

export function AdminSetup() {
  const { connected, publicKey } = useWallet();
  const { balance, requestAirdrop } = useWalletUtils();

  // Blockchain state
  const { globalState, loading: globalStateLoading } = useGlobalState();

  // Transaction hooks
  const {
    loading: transactionLoading,
    initializeSystem,
    error: transactionError,
    clearError,
  } = useTransactions();

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [adminWallets, setAdminWallets] =
    useState<string[]>(SYSTEM_ADMIN_WALLETS);
  const [newAdminWallet, setNewAdminWallet] = useState("");

  // Check if current wallet is admin
  const isAdmin =
    publicKey && SYSTEM_ADMIN_WALLETS.includes(publicKey.toString());

  // Set up system info
  useEffect(() => {
    const [globalStatePDA] = SolanaClient.getGlobalStatePDA();

    setSystemInfo({
      programId: PROGRAM_ID.toString(),
      globalStatePDA: globalStatePDA.toString(),
      rpcEndpoint: "https://api.devnet.solana.com",
      network: "Devnet",
      explorerUrl: `https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`,
    });
  }, []);

  // Check if system is initialized
  useEffect(() => {
    setIsInitialized(globalState !== null);
  }, [globalState]);

  // Handle system initialization
  const handleInitializeSystem = async () => {
    if (!isAdmin) {
      toast.error("Only system administrators can initialize the system");
      return;
    }

    try {
      const result = await initializeSystem();
      if (result.success) {
        setIsInitialized(true);
        toast.success("System initialized successfully!");
      }
    } catch (err) {
      console.error("System initialization error:", err);
      toast.error("Failed to initialize system");
    }
  };

  // Handle SOL airdrop for devnet testing
  const handleRequestAirdrop = async () => {
    try {
      const signature = await requestAirdrop();
      toast.success(
        `Airdrop requested! Signature: ${signature.slice(0, 8)}...`,
      );
    } catch {
      toast.error("Airdrop failed. Please try again later.");
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Format balance display
  const formatBalance = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4);
  };

  // Add new admin wallet
  const handleAddAdminWallet = () => {
    if (!newAdminWallet.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    try {
      new PublicKey(newAdminWallet.trim()); // Validate address format
      if (!adminWallets.includes(newAdminWallet.trim())) {
        setAdminWallets([...adminWallets, newAdminWallet.trim()]);
        setNewAdminWallet("");
        toast.success(
          "Admin wallet added (update your code with this address)",
        );
      } else {
        toast.error("Wallet already in admin list");
      }
    } catch {
      toast.error("Invalid wallet address format");
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <Crown className="h-16 w-16 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              System Administration
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-md">
              Connect your admin wallet to access system administration features
            </p>
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <XCircle className="h-16 w-16 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Access Denied
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-md">
              This wallet is not authorized for system administration
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              Connected: {publicKey?.toString()}
            </p>
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <Toaster position="top-right" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <Crown className="mr-3 h-8 w-8 text-purple-600" />
              System Administration
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Admin Wallet: {publicKey?.toString().slice(0, 8)}...
              {publicKey?.toString().slice(-8)}
            </p>
            {balance !== null && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Balance: {formatBalance(balance)} SOL
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRequestAirdrop}
                  className="ml-2 p-0 h-auto"
                >
                  Request Airdrop
                </Button>
              </p>
            )}
          </div>
          <WalletMultiButton />
        </div>

        {/* Error Alert */}
        {transactionError && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              {transactionError}
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* System Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    System Initialized
                  </span>
                  {globalStateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant={isInitialized ? "default" : "secondary"}>
                      {isInitialized ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <XCircle className="mr-1 h-3 w-3" />
                      )}
                      {isInitialized ? "Initialized" : "Not Initialized"}
                    </Badge>
                  )}
                </div>

                {isInitialized && globalState && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Institutions:</span>
                      <span className="font-medium">
                        {globalState.totalInstitutions.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Certificates:</span>
                      <span className="font-medium">
                        {globalState.totalCertificates.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Verifications:</span>
                      <span className="font-medium">
                        {globalState.totalVerifications.toString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Network
                  </span>
                  <Badge variant="outline">
                    <Zap className="mr-1 h-3 w-3" />
                    Devnet
                  </Badge>
                </div>

                {systemInfo && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        RPC:
                      </span>
                      <p className="font-mono text-xs break-all">
                        {systemInfo.rpcEndpoint}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isInitialized && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The system needs to be initialized before institutions can
                    register or issue certificates.
                    <Button
                      onClick={handleInitializeSystem}
                      disabled={transactionLoading}
                      className="ml-4"
                      size="sm"
                    >
                      {transactionLoading && (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      )}
                      Initialize System
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        {systemInfo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Program ID</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm break-all">
                    {systemInfo.programId}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(systemInfo.programId, "Program ID")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a
                    href={systemInfo.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              <div>
                <Label>Global State PDA</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm break-all">
                    {systemInfo.globalStatePDA}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        systemInfo.globalStatePDA,
                        "Global State PDA",
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a
                    href={`https://explorer.solana.com/address/${systemInfo.globalStatePDA}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              <div>
                <Label>RPC Endpoint</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
                    {systemInfo.rpcEndpoint}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(systemInfo.rpcEndpoint, "RPC Endpoint")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Wallets Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Admin Wallets Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Admin Wallets</Label>
              <div className="mt-2 space-y-2">
                {adminWallets.map((wallet, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded"
                  >
                    <div className="font-mono text-sm break-all">
                      {wallet}
                      {wallet === publicKey?.toString() && (
                        <Badge className="ml-2" variant="default">
                          Current
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(wallet, "Wallet Address")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="new-admin-wallet">Add New Admin Wallet</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="new-admin-wallet"
                  value={newAdminWallet}
                  onChange={(e) => setNewAdminWallet(e.target.value)}
                  placeholder="Enter wallet address..."
                  className="font-mono"
                />
                <Button onClick={handleAddAdminWallet}>Add</Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Note: Adding wallets here only updates the local list. Update
                your code to make changes permanent.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => window.open("/dashboard", "_blank")}
                variant="outline"
                className="h-12"
              >
                <Zap className="w-4 h-4 mr-2" />
                Unified Dashboard
              </Button>

              <Button
                onClick={() => window.open("/verify", "_blank")}
                variant="outline"
                className="h-12"
              >
                <Shield className="w-4 h-4 mr-2" />
                Verify Certificate
              </Button>

              <Button
                onClick={() =>
                  window.open(systemInfo?.explorerUrl || "", "_blank")
                }
                variant="outline"
                className="h-12"
                disabled={!systemInfo}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Program on Explorer
              </Button>

              <Button
                onClick={handleRequestAirdrop}
                variant="outline"
                className="h-12"
              >
                <Zap className="mr-2 h-4 w-4" />
                Request SOL Airdrop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Ensure your wallet has sufficient SOL for transactions (use
                &quot;Request Airdrop&quot; for devnet testing)
              </li>
              <li>
                If the system is not initialized, click &quot;Initialize
                System&quot; to set up the global state
              </li>
              <li>
                Once initialized, institutions can register using the blockchain
                dashboard
              </li>
              <li>
                Registered institutions can issue certificates on the blockchain
              </li>
              <li>
                Anyone can verify certificates using the verification portal
              </li>
              <li>
                Update the SYSTEM_ADMIN_WALLETS array in the code to add
                permanent admin access
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
