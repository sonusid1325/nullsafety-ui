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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentManagement } from "@/components/StudentManagement";

interface CertificateFormData {
  roll_no: string;
  course_name: string;
  grade: string;
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
    roll_no: "",
    course_name: "",
    grade: "",
  });
  const [studentData, setStudentData] = useState<{
    name: string;
    wallet_address: string;
  } | null>(null);
  const [fetchingStudent, setFetchingStudent] = useState(false);

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

  const fetchStudentByRollNo = useCallback(async () => {
    if (!formData.roll_no || !institution?.id) return;

    try {
      setFetchingStudent(true);
      const { data, error } = await supabase
        .from("students")
        .select("name, wallet_address")
        .eq("institution_id", institution.id)
        .eq("roll_no", formData.roll_no)
        .single();

      if (error || !data) {
        setStudentData(null);
        return;
      }

      setStudentData(data);
    } catch (error) {
      console.error("Error fetching student:", error);
      setStudentData(null);
    } finally {
      setFetchingStudent(false);
    }
  }, [formData.roll_no, institution?.id]);

  // Auto-fetch student when roll_no changes
  React.useEffect(() => {
    if (formData.roll_no && institution?.id) {
      const timeoutId = setTimeout(() => {
        fetchStudentByRollNo();
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      setStudentData(null);
    }
  }, [formData.roll_no, institution?.id, fetchStudentByRollNo]);

  const handleCreateCertificate = async () => {
    if (!publicKey || !institution || !wallet) return;

    try {
      setCreating(true);

      // Fetch student details if not already fetched
      if (!studentData && formData.roll_no) {
        await fetchStudentByRollNo();
        if (!studentData) {
          toast.error("Student not found with this roll number");
          return;
        }
      }

      if (!studentData) {
        toast.error("Please select a valid student");
        return;
      }

      const certificateData: CertificateData = {
        studentName: studentData.name,
        rollNo: formData.roll_no,
        courseName: formData.course_name,
        grade: formData.grade,
        institutionName: institution.name,
        issuedBy: publicKey.toString(),
        studentWallet: studentData.wallet_address,
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
          toast.success("Certificate created successfully!");
        } else {
          toast.error(
            result.error || "Failed to create certificate on blockchain",
          );
        }
      } else {
        // Database-only creation
        try {
          const { error } = await supabase.from("certificates").insert({
            student_name: certificateData.studentName,
            roll_no: certificateData.rollNo,
            course_name: certificateData.courseName,
            grade: certificateData.grade,
            certificate_id: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            institution_name: certificateData.institutionName,
            issued_by: certificateData.issuedBy,
            student_wallet: certificateData.studentWallet,
            issued_date: new Date().toISOString().split("T")[0],
            certificate_hash: `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          });

          if (error) throw error;
          toast.success("Certificate created successfully (Database only)!");
        } catch (dbError) {
          console.error("Database certificate creation failed:", dbError);
          throw new Error(
            "Failed to create certificate: " + (dbError as Error).message,
          );
        }
      }

      setIsCreateModalOpen(false);
      setFormData({
        roll_no: "",
        course_name: "",
        grade: "",
      });
      setStudentData(null);
      fetchCertificatesWithBlockchainStatus();
    } catch (error) {
      console.error("Error creating certificate:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create certificate",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSyncBlockchain = async () => {
    if (!publicKey || !wallet) return;

    try {
      setSyncing(true);
      toast.loading("Syncing with blockchain...", { id: "sync" });

      // Refresh certificates with blockchain status
      await fetchCertificatesWithBlockchainStatus();

      toast.success("Blockchain sync completed!", { id: "sync" });
    } catch (error) {
      console.error("Error syncing blockchain:", error);
      toast.error("Failed to sync with blockchain", { id: "sync" });
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Award className="h-16 w-16 mx-auto mb-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-black dark:text-white mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Connect your wallet to access your dashboard and manage
              certificates.
            </p>
            <WalletMultiButton className="!bg-black !text-white hover:!bg-gray-800 dark:!bg-white dark:!text-black dark:hover:!bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-black dark:text-white" />
            <p className="text-black dark:text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {userType === "university"
                  ? `Welcome, ${institution?.name || "University"}`
                  : userType === "student"
                    ? "Your blockchain certificates"
                    : "Certificate verification system"}
              </p>
            </div>
            <WalletMultiButton className="!bg-black !text-white hover:!bg-gray-800 dark:!bg-white dark:!text-black dark:hover:!bg-gray-200" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Certificates
              </CardTitle>
              <Award className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {certificates.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Verified Count
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {certificates.reduce(
                  (sum, cert) => sum + (cert.verification_count || 0),
                  0,
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
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

        {/* University Dashboard Content */}
        {userType === "university" && (
          <Tabs defaultValue="certificates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="certificates" className="space-y-6">
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
                    <DialogContent className="sm:max-w-md bg-white dark:bg-black border border-gray-200 dark:border-gray-600">
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
                            Roll Number
                          </label>
                          <input
                            type="text"
                            placeholder="Enter student roll number"
                            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            value={formData.roll_no}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                roll_no: e.target.value,
                              })
                            }
                          />
                          {fetchingStudent && (
                            <p className="text-xs text-gray-500 mt-1">
                              Searching for student...
                            </p>
                          )}
                          {formData.roll_no &&
                            !fetchingStudent &&
                            studentData && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded border">
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  ✓ Student found: {studentData.name}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                                  {studentData.wallet_address}
                                </p>
                              </div>
                            )}
                          {formData.roll_no &&
                            !fetchingStudent &&
                            !studentData && (
                              <p className="text-xs text-red-500 mt-1">
                                Student not found with this roll number
                              </p>
                            )}
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
                              setFormData({
                                ...formData,
                                grade: e.target.value,
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
                            !formData.roll_no ||
                            !formData.course_name ||
                            !studentData ||
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
                </div>
              </div>

              {/* Blockchain Status Alert */}
              {!blockchainEnabled && (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    Blockchain integration is disabled. Certificates will only
                    be stored in the database.
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
                <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                        No certificates yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Get started by creating your first certificate
                      </p>
                      <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Issue Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {certificates.map((certificate) => (
                    <Card
                      key={certificate.id}
                      className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black"
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
                              !certificate.certificate_hash.startsWith(
                                "db-",
                              ) && (
                                <a
                                  href={getSolscanUrl(
                                    certificate.certificate_hash,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
                                  title="View transaction on Solscan"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(
                              certificate.created_at,
                            ).toLocaleDateString()}
                          </p>

                          <div className="flex items-center space-x-2">
                            <Link href={`/cert/${certificate.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 border-gray-300 dark:border-gray-600 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-black"
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
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <StudentManagement institution={institution!} />
            </TabsContent>
          </Tabs>
        )}

        {/* Student/Public Dashboard Content */}
        {userType !== "university" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-black dark:text-white">
                  {userType === "student" ? "My Certificates" : "Certificates"}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {userType === "student"
                    ? "View certificates issued to your wallet"
                    : "Connect your wallet to view certificates"}
                </p>
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
              <Card className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
                <CardContent className="py-16">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                      No certificates yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {userType === "student"
                        ? "No certificates have been issued to your wallet yet"
                        : "Connect your wallet to view certificates"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((certificate) => (
                  <Card
                    key={certificate.id}
                    className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-black"
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
                                href={getSolscanUrl(
                                  certificate.certificate_hash,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
                                title="View transaction on Solscan"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(
                            certificate.created_at,
                          ).toLocaleDateString()}
                        </p>

                        <div className="flex items-center space-x-2">
                          <Link href={`/cert/${certificate.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 border-gray-300 dark:border-gray-600 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-black"
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
        )}
      </div>
    </div>
  );
}
