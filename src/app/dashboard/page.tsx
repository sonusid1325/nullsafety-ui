"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Award,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  Users,
  Zap,
  Database,
  AlertTriangle,
  RefreshCw,
  Settings,
  ExternalLink,
} from "lucide-react";
import { supabase, Certificate, Institution } from "@/lib/supabase";
import {
  createCertificateService,
  CertificateData,
} from "@/lib/certificateService";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { createMockWallet } from "@/lib/walletTypes";
// Removed hash generation imports since we'll use transaction signature as hash
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CertificateFormData {
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  student_wallet: string;
}

// Utility function to get correct Solscan cluster URL
const getSolscanUrl = (transactionId: string): string => {
  const isMainnet = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("mainnet");
  const cluster = isMainnet ? "mainnet-beta" : "devnet";
  return `https://solscan.io/tx/${transactionId}?cluster=${cluster}`;
};

interface CertificateWithBlockchainStatus extends Certificate {
  blockchainStatus?: boolean;
  blockchainSignature?: string;
}

export default function DashboardPage() {
  const walletContext = useWallet();
  const { connected, publicKey, wallet } = walletContext;
  const [certificates, setCertificates] = useState<
    CertificateWithBlockchainStatus[]
  >([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [userType, setUserType] = useState<"university" | "student" | "public">(
    "public",
  );
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [blockchainEnabled, setBlockchainEnabled] = useState(true);
  const [, setBlockchainStatus] = useState<{
    [key: string]: boolean;
  }>({});
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CertificateFormData>({
    student_name: "",
    roll_no: "",
    course_name: "",
    grade: "",
    student_wallet: "",
  });

  const checkUserType = useCallback(async () => {
    if (!publicKey) {
      setInstitution(null);
      setUserType("public");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("authority_wallet", publicKey.toString())
        .single();

      if (error || !data) {
        setInstitution(null);
        setUserType("student");
      } else {
        setInstitution(data);
        setUserType("university");
      }
    } catch (error) {
      console.error("Error checking user type:", error);
      setInstitution(null);
      setUserType("student");
    }
  }, [publicKey]);

  const fetchInstitutionData = useCallback(async () => {
    if (!publicKey) return;

    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("authority_wallet", publicKey.toString())
        .single();

      if (error) {
        console.error("Institution not found:", error);
        return;
      }

      setInstitution(data);
    } catch (error) {
      console.error("Error fetching institution:", error);
    }
  }, [publicKey]);

  const fetchCertificatesFromDatabase = useCallback(async () => {
    if (!publicKey) return;

    let query = supabase.from("certificates").select("*");

    if (userType === "university") {
      // Universities see certificates they issued
      query = query.eq("issued_by", publicKey.toString());
    } else if (userType === "student") {
      // Students see certificates issued to them
      query = query.eq("student_wallet", publicKey.toString());
    } else {
      // Public users see no certificates in dashboard
      setCertificates([]);
      return;
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    const certificatesWithStatus = (data || []).map((cert) => ({
      ...cert,
      blockchainStatus: false, // No blockchain check in fallback mode
    }));

    setCertificates(certificatesWithStatus);
  }, [publicKey, userType]);

  const fetchCertificatesWithBlockchainStatus = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      if (blockchainEnabled) {
        // Use unified service to get certificates with blockchain status
        try {
          const connection = new Connection(
            process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
              "https://api.devnet.solana.com",
            "confirmed",
          );

          // Create a mock wallet for the service (actual signing happens client-side)
          if (!walletContext) {
            throw new Error("Wallet not connected");
          }

          const mockWallet = createMockWallet(walletContext);
          if (!mockWallet) {
            throw new Error("Failed to create wallet interface");
          }

          const provider = new AnchorProvider(connection, mockWallet as never, {
            commitment: "confirmed",
          });

          const certificateService = createCertificateService(provider);
          const result = await certificateService.getCertificates(
            publicKey.toString(),
            50, // Get more certificates
            0,
          );

          const certificatesWithStatus = result.certificates.map((cert) => ({
            ...cert,
            blockchainStatus:
              result.blockchainStatus[cert.certificate_id] || false,
          }));

          setCertificates(certificatesWithStatus);
          setBlockchainStatus(result.blockchainStatus);
        } catch (blockchainError) {
          console.warn(
            "Blockchain fetch failed, using database only:",
            blockchainError,
          );
          setBlockchainEnabled(false);
          // Fall back to database only
          await fetchCertificatesFromDatabase();
        }
      } else {
        await fetchCertificatesFromDatabase();
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, [
    publicKey,
    blockchainEnabled,
    walletContext,
    fetchCertificatesFromDatabase,
  ]);

  useEffect(() => {
    if (connected && publicKey) {
      checkUserType();
      fetchInstitutionData();
    } else {
      setInstitution(null);
      setCertificates([]);
      setUserType("public");
    }
  }, [connected, publicKey, checkUserType, fetchInstitutionData]);

  useEffect(() => {
    if (connected && publicKey && userType !== "public") {
      fetchCertificatesWithBlockchainStatus();
    } else {
      setCertificates([]);
    }
  }, [connected, publicKey, userType, fetchCertificatesWithBlockchainStatus]);

  const handleCreateCertificate = async () => {
    if (!publicKey || !institution || !wallet) return;

    try {
      setCreating(true);

      const certificateData: CertificateData = {
        studentName: formData.student_name,
        rollNo: formData.roll_no,
        courseName: formData.course_name,
        grade: formData.grade,
        institutionName: institution.name,
        issuedBy: publicKey.toString(),
        studentWallet: formData.student_wallet,
      };

      if (blockchainEnabled) {
        // Use unified service for blockchain + database creation
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            "https://api.devnet.solana.com",
          "confirmed",
        );

        if (!walletContext) {
          throw new Error("Wallet not connected");
        }

        const mockWallet = createMockWallet(walletContext);
        if (!mockWallet) {
          throw new Error("Failed to create wallet interface");
        }

        const provider = new AnchorProvider(connection, mockWallet as never, {
          commitment: "confirmed",
        });

        const certificateService = createCertificateService(provider);
        const result = await certificateService.createCertificate(
          certificateData,
          mockWallet,
        );

        if (result.success) {
          toast.success(
            `Certificate created! Transaction ID stored as hash. Click Solscan link to verify on blockchain.`,
            { duration: 10000 },
          );
          console.log(
            "✅ Certificate created with blockchain transaction ID as hash:",
            {
              transactionSignature: result.blockchainSignature,
              certificateHash: result.certificateHash,
              blockchainAddress: result.blockchainAddress?.toBase58(),
              solscanUrl: result.blockchainSignature
                ? getSolscanUrl(result.blockchainSignature)
                : null,
            },
          );
        } else if (result.partialSuccess?.supabase) {
          toast.success(
            "Certificate created in database. Blockchain sync pending.",
            {
              duration: 5000,
              icon: "⚠️",
            },
          );
        } else {
          throw new Error(result.error || "Certificate creation failed");
        }
      } else {
        // Database-only creation - use a placeholder since no blockchain transaction exists
        const certificateId = `CERT-${Date.now()}`;
        const issuedDate = new Date().toISOString().split("T")[0];

        // For database-only mode, create a unique identifier that mimics a transaction signature
        const placeholderHash = `db-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

        const certificateDbData = {
          student_name: formData.student_name,
          roll_no: formData.roll_no,
          course_name: formData.course_name,
          grade: formData.grade,
          certificate_id: certificateId,
          institution_name: institution.name,
          issued_by: publicKey.toString(),
          student_wallet: formData.student_wallet,
          issued_date: issuedDate,
          certificate_hash: placeholderHash,
          is_revoked: false,
        };

        const { error } = await supabase
          .from("certificates")
          .insert([certificateDbData]);

        if (error) {
          if (
            error.code === "23505" &&
            error.message.includes("certificate_hash")
          ) {
            throw new Error(
              "Certificate ID conflict detected. Please try again.",
            );
          }
          throw error;
        }

        console.log("✅ Certificate created in database-only mode:", {
          certificateId,
          placeholderHash,
          mode: "database-only",
        });

        toast.success(
          `Certificate created in database-only mode. Enable blockchain to get transaction ID as hash.`,
        );
      }

      setIsCreateModalOpen(false);
      setFormData({
        student_name: "",
        roll_no: "",
        course_name: "",
        grade: "",
        student_wallet: "",
      });

      // Refresh certificates list
      await fetchCertificatesWithBlockchainStatus();
    } catch (error) {
      console.error("Error creating certificate:", error);
      toast.error(
        `Failed to create certificate: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSyncBlockchain = async () => {
    if (!publicKey || !wallet) return;

    try {
      setSyncing(true);
      toast.loading("Syncing certificates to blockchain...", { id: "sync" });

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.devnet.solana.com",
        "confirmed",
      );

      if (!walletContext) {
        throw new Error("Wallet not connected");
      }

      const mockWallet = createMockWallet(walletContext);
      if (!mockWallet) {
        throw new Error("Failed to create wallet interface");
      }

      const provider = new AnchorProvider(connection, mockWallet as never, {
        commitment: "confirmed",
      });

      const certificateService = createCertificateService(provider);
      const result = await certificateService.syncCertificates(mockWallet);

      toast.success(`Synced ${result.synced} certificates to blockchain!`, {
        id: "sync",
      });

      if (result.errors.length > 0) {
        console.warn("Sync errors:", result.errors);

        // Check if the error is related to initialization
        const hasInitializationError = result.errors.some(
          (error) =>
            error.includes("not initialized") || error.includes("Initialize"),
        );

        if (hasInitializationError) {
          toast.error(
            "Blockchain system not initialized. Please visit Admin Setup to initialize the system first.",
            { duration: 10000 },
          );
        } else {
          toast.error(`${result.errors.length} certificates failed to sync`, {
            duration: 5000,
          });
        }
      }

      // Refresh certificates to show updated blockchain status
      await fetchCertificatesWithBlockchainStatus();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(
        `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { id: "sync" },
      );
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Card className="w-96 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                {userType === "university"
                  ? "Institution Dashboard"
                  : userType === "student"
                    ? "My Certificates"
                    : "NullSafety Dashboard"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {userType === "university"
                  ? "Manage and issue certificates for your institution"
                  : userType === "student"
                    ? "View certificates issued to your wallet"
                    : "Connect your wallet to access certificate features"}
              </p>
              <WalletMultiButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!institution && !loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Card className="max-w-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Register Your University
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your wallet is not associated with any registered institution.
                Please register your university to start issuing certificates.
              </p>
              <div className="flex flex-col space-y-3">
                <Link href="/register-university">
                  <Button className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Register University
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 dark:border-gray-700"
                  >
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Certificates
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {certificates.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {certificates.filter((cert) => !cert.is_revoked).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Certificates
              </CardTitle>
              <Award className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {certificates.filter((cert) => !cert.is_revoked).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                This Month
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {
                  certificates.filter(
                    (cert) =>
                      new Date(cert.created_at).getMonth() ===
                      new Date().getMonth(),
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Certificates */}
        <div className="space-y-6">
          {/* Create Certificate */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white">
                Certificates
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and issue blockchain certificates
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Blockchain Status Toggle */}
              <div className="flex items-center space-x-2">
                <Badge
                  variant={blockchainEnabled ? "default" : "secondary"}
                  className={
                    blockchainEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : ""
                  }
                >
                  {blockchainEnabled ? (
                    <>
                      <Zap className="w-3 h-3 mr-1" />
                      Blockchain Active
                    </>
                  ) : (
                    <>
                      <Database className="w-3 h-3 mr-1" />
                      Database Only
                    </>
                  )}
                </Badge>

                {blockchainEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncBlockchain}
                    disabled={syncing}
                    className="border-gray-300 dark:border-gray-700"
                  >
                    {syncing ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Sync
                  </Button>
                )}

                {blockchainEnabled && (
                  <Link href="/admin-setup">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-700"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Admin Setup
                    </Button>
                  </Link>
                )}
              </div>

              {/* Create Certificate Modal */}
              {userType === "university" && (
                <Dialog
                  open={isCreateModalOpen}
                  onOpenChange={setIsCreateModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                      disabled={creating}
                    >
                      {creating ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Certificate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <DialogHeader>
                      <DialogTitle className="text-black dark:text-white">
                        Create New Certificate
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Issue a new blockchain certificate for a student.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-black dark:text-white">
                          Student Name
                        </label>
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          value={formData.student_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              student_name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-black dark:text-white">
                          Roll Number
                        </label>
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          value={formData.roll_no}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roll_no: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-black dark:text-white">
                          Course Name
                        </label>
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          value={formData.course_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              course_name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-black dark:text-white">
                          Grade
                        </label>
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          value={formData.grade}
                          onChange={(e) =>
                            setFormData({ ...formData, grade: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-black dark:text-white">
                          Student Wallet Address
                        </label>
                        <input
                          type="text"
                          placeholder="Enter student's wallet address"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          value={formData.student_wallet}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              student_wallet: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="border-gray-300 dark:border-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateCertificate}
                        className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                        disabled={
                          !formData.student_name ||
                          !formData.course_name ||
                          !formData.student_wallet ||
                          creating
                        }
                      >
                        {creating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>Create Certificate</>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Blockchain Status Alert */}
          {!blockchainEnabled && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Blockchain integration is disabled. Certificates will only be
                stored in the database.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2 text-orange-800 dark:text-orange-200 underline"
                  onClick={() => setBlockchainEnabled(true)}
                >
                  Enable blockchain
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Certificates List */}
          {certificates.length === 0 ? (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                    No certificates yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {userType === "university"
                      ? "Get started by creating your first certificate"
                      : userType === "student"
                        ? "No certificates have been issued to your wallet yet"
                        : "Connect your wallet to view certificates"}
                  </p>
                  {userType === "university" && (
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Issue Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <Card
                  key={certificate.id}
                  className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium text-black dark:text-white">
                          {certificate.student_name}
                        </CardTitle>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {certificate.roll_no}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {certificate.is_revoked ? (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                        )}
                        {/* Blockchain Status Indicator */}
                        {blockchainEnabled && (
                          <div className="ml-2">
                            {certificate.blockchainStatus ? (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                              >
                                <Zap className="w-2 h-2 mr-1" />
                                Chain
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300"
                              >
                                <Database className="w-2 h-2 mr-1" />
                                DB
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {certificate.course_name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Grade: {certificate.grade}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p
                          className="text-xs text-gray-500 dark:text-gray-500 font-mono"
                          title={`Transaction ID (used as certificate hash): ${certificate.certificate_hash}`}
                        >
                          Hash/TX:{" "}
                          {certificate.certificate_hash?.substring(0, 16)}
                          ...
                        </p>
                        {certificate.certificate_hash &&
                          !certificate.certificate_hash.startsWith("db-") && (
                            <a
                              href={getSolscanUrl(certificate.certificate_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                              title="View transaction on Solscan"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(certificate.created_at).toLocaleDateString()}
                      </p>

                      <div className="flex items-center space-x-2">
                        <Link href={`/cert/${certificate.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
