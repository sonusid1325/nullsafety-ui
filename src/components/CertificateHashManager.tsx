"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Hash,
  Download,
  Search,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  UnifiedCertificateService,
  CertificateData,
} from "@/lib/certificateService";
import {
  generateDeterministicHash,
  generateQRCodeData,
  isValidHashFormat,
  type CertificateHashData,
} from "@/lib/certificateHashUtils";
import { BlockchainCertificateData } from "@/lib/anchor/enhanced-transactions";
import { WalletInterface } from "@/lib/walletTypes";
import type { VerificationResult } from "@/lib/certificateService";

interface CertificateHashManagerProps {
  certificateService: UnifiedCertificateService;
}

interface BatchVerificationResult {
  verified: string[];
  failed: string[];
  revoked: string[];
  notFound: string[];
}

export default function CertificateHashManager({
  certificateService,
}: CertificateHashManagerProps) {
  const walletContext = useWallet();
  const { connected, publicKey, signTransaction, signAllTransactions } =
    walletContext;

  // State for certificate creation
  const [certificateData, setCertificateData] = useState<CertificateData>({
    studentName: "",
    rollNo: "",
    courseName: "",
    grade: "",
    institutionName: "",
    issuedBy: "",
    studentWallet: "",
  });

  // State for hash verification
  const [verificationData, setVerificationData] = useState({
    certificateId: "",
    institutionAddress: "",
    providedHash: "",
  });

  // State for batch operations
  const [batchHashes, setBatchHashes] = useState("");
  const [batchResults, setBatchResults] =
    useState<BatchVerificationResult | null>(null);

  // State for blockchain certificates
  const [blockchainCerts, setBlockchainCerts] = useState<
    BlockchainCertificateData[]
  >([]);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBatchVerifying, setIsBatchVerifying] = useState(false);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);

  // Results
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    certificate?: unknown;
    blockchainSignature?: string;
    certificateHash?: string;
    error?: string;
  } | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [generatedHash, setGeneratedHash] = useState("");

  // Generate hash for current certificate data
  useEffect(() => {
    if (certificateData.studentName && certificateData.courseName) {
      const hashData: CertificateHashData = {
        certificateId: certificateData.certificateId || "TEMP-ID",
        studentName: certificateData.studentName,
        studentWallet: certificateData.studentWallet,
        courseName: certificateData.courseName,
        grade: certificateData.grade,
        institutionName: certificateData.institutionName,
        issuedBy: certificateData.issuedBy,
        issuedDate: new Date().toISOString().split("T")[0],
      };

      const hash = generateDeterministicHash(hashData);
      setGeneratedHash(hash);
    }
  }, [certificateData]);

  // Handle certificate creation with hash storage
  const handleCreateCertificate = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    try {
      const walletInterface: WalletInterface = {
        publicKey,
        connected: true,
        signTransaction,
        signAllTransactions:
          signAllTransactions ||
          (async (txs) => {
            const signedTxs = [];
            for (const tx of txs) {
              signedTxs.push(await signTransaction(tx));
            }
            return signedTxs;
          }),
      };

      const result = await certificateService.createCertificate(
        certificateData,
        walletInterface,
      );

      setCreationResult(result);

      if (result.success) {
        toast.success("Certificate created and hash stored on blockchain!");

        // Generate QR code data
        if (result.certificateHash && publicKey) {
          const qrData = generateQRCodeData(
            certificateData.certificateId ||
              result.certificate?.certificate_id ||
              "",
            publicKey.toBase58(),
            result.certificateHash,
          );
          console.log("QR Code Data:", qrData);
        }
      } else {
        toast.error(`Certificate creation failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Certificate creation error:", error);
      toast.error("Failed to create certificate");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle hash verification
  const handleVerifyHash = async () => {
    if (!verificationData.certificateId || !verificationData.providedHash) {
      toast.error("Please provide certificate ID and hash");
      return;
    }

    if (!isValidHashFormat(verificationData.providedHash)) {
      toast.error("Invalid hash format. Must be 64 character hex string");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await certificateService.verifyCertificate(
        verificationData.certificateId,
        connected ? walletContext : undefined,
        verificationData.providedHash,
      );

      setVerificationResult(result);

      if (result.isValid) {
        toast.success("Certificate hash verified successfully!");
      } else {
        toast.error(`Hash verification failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Hash verification error:", error);
      toast.error("Hash verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle batch verification
  const handleBatchVerification = async () => {
    if (!batchHashes.trim()) {
      toast.error("Please provide certificate data for batch verification");
      return;
    }

    setIsBatchVerifying(true);
    try {
      const lines = batchHashes.trim().split("\n");
      const certificates = lines
        .map((line) => {
          const [certificateId, hash, institution] = line
            .split(",")
            .map((s) => s.trim());
          return {
            certificateId,
            hash,
            institutionPublicKey: new PublicKey(
              institution || publicKey?.toBase58() || "",
            ),
          };
        })
        .filter((cert) => cert.certificateId && cert.hash);

      const results =
        await certificateService.batchVerifyCertificateHashes(certificates);
      setBatchResults(results);

      toast.success(
        `Batch verification complete: ${results.verified.length} verified, ${results.failed.length} failed`,
      );
    } catch (error) {
      console.error("Batch verification error:", error);
      toast.error("Batch verification failed");
    } finally {
      setIsBatchVerifying(false);
    }
  };

  // Load institution certificates
  const loadInstitutionCertificates = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoadingCerts(true);
    try {
      const certs =
        await certificateService.getInstitutionCertificatesWithHashes(
          publicKey,
        );
      setBlockchainCerts(certs);
      toast.success(`Loaded ${certs.length} certificates from blockchain`);
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setIsLoadingCerts(false);
    }
  };

  // Export certificate data
  const exportCertificateData = () => {
    const data = {
      certificates: blockchainCerts,
      exportDate: new Date().toISOString(),
      institution: publicKey?.toBase58(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificates-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Certificate data exported");
  };

  if (!connected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Connect Wallet Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please connect your Solana wallet to manage certificate hashes on
              the blockchain.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-6 w-6" />
            Certificate Hash Manager
          </CardTitle>
          <CardDescription>
            Create, verify, and manage certificate hashes on the Solana
            blockchain
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Create Certificate</TabsTrigger>
          <TabsTrigger value="verify">Verify Hash</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="manage">Manage Certificates</TabsTrigger>
        </TabsList>

        {/* Create Certificate Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Certificate with Blockchain Hash</CardTitle>
              <CardDescription>
                Enter certificate details to generate and store the hash on
                Solana
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    value={certificateData.studentName}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        studentName: e.target.value,
                      })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="rollNo">Roll Number</Label>
                  <Input
                    id="rollNo"
                    value={certificateData.rollNo}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        rollNo: e.target.value,
                      })
                    }
                    placeholder="2024001"
                  />
                </div>
                <div>
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input
                    id="courseName"
                    value={certificateData.courseName}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        courseName: e.target.value,
                      })
                    }
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={certificateData.grade}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        grade: e.target.value,
                      })
                    }
                    placeholder="A+"
                  />
                </div>
                <div>
                  <Label htmlFor="institutionName">Institution Name</Label>
                  <Input
                    id="institutionName"
                    value={certificateData.institutionName}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        institutionName: e.target.value,
                      })
                    }
                    placeholder="University of Technology"
                  />
                </div>
                <div>
                  <Label htmlFor="issuedBy">Issued By</Label>
                  <Input
                    id="issuedBy"
                    value={certificateData.issuedBy}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        issuedBy: e.target.value,
                      })
                    }
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="studentWallet">Student Wallet Address</Label>
                  <Input
                    id="studentWallet"
                    value={certificateData.studentWallet}
                    onChange={(e) =>
                      setCertificateData({
                        ...certificateData,
                        studentWallet: e.target.value,
                      })
                    }
                    placeholder="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
                  />
                </div>
              </div>

              {generatedHash && (
                <Alert>
                  <Hash className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Generated Hash:</strong>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                      {generatedHash}
                    </code>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCreateCertificate}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating
                  ? "Creating Certificate..."
                  : "Create Certificate on Blockchain"}
              </Button>

              {creationResult && (
                <Alert
                  className={
                    creationResult.success
                      ? "border-green-500"
                      : "border-red-500"
                  }
                >
                  {creationResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {creationResult.success ? (
                      <div>
                        <p>
                          <strong>Success!</strong> Certificate created
                          successfully.
                        </p>
                        {creationResult.blockchainSignature && (
                          <p>
                            <strong>Blockchain Signature:</strong>{" "}
                            <code>{creationResult.blockchainSignature}</code>
                          </p>
                        )}
                        {creationResult.certificateHash && (
                          <p>
                            <strong>Certificate Hash:</strong>{" "}
                            <code>{creationResult.certificateHash}</code>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>
                        <strong>Error:</strong> {creationResult.error}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Hash Tab */}
        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verify Certificate Hash</CardTitle>
              <CardDescription>
                Verify a certificate hash against the Solana blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="certificateId">Certificate ID</Label>
                <Input
                  id="certificateId"
                  value={verificationData.certificateId}
                  onChange={(e) =>
                    setVerificationData({
                      ...verificationData,
                      certificateId: e.target.value,
                    })
                  }
                  placeholder="CERT-2024-001"
                />
              </div>
              <div>
                <Label htmlFor="institutionAddress">
                  Institution Address (optional)
                </Label>
                <Input
                  id="institutionAddress"
                  value={verificationData.institutionAddress}
                  onChange={(e) =>
                    setVerificationData({
                      ...verificationData,
                      institutionAddress: e.target.value,
                    })
                  }
                  placeholder="Leave empty to use your wallet address"
                />
              </div>
              <div>
                <Label htmlFor="providedHash">Certificate Hash to Verify</Label>
                <Input
                  id="providedHash"
                  value={verificationData.providedHash}
                  onChange={(e) =>
                    setVerificationData({
                      ...verificationData,
                      providedHash: e.target.value,
                    })
                  }
                  placeholder="Enter 64-character hex hash"
                />
              </div>

              <Button
                onClick={handleVerifyHash}
                disabled={isVerifying}
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                {isVerifying ? "Verifying..." : "Verify Hash on Blockchain"}
              </Button>

              {verificationResult && (
                <Alert
                  className={
                    verificationResult.isValid
                      ? "border-green-500"
                      : "border-red-500"
                  }
                >
                  {verificationResult.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {verificationResult.isValid ? (
                      <div>
                        <p>
                          <strong>Hash Verified Successfully!</strong>
                        </p>
                        {verificationResult.blockchainData?.certificateHash && (
                          <p>
                            <strong>On-chain Hash:</strong>{" "}
                            <code>
                              {
                                verificationResult.blockchainData
                                  .certificateHash
                              }
                            </code>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>
                        <strong>Hash Verification Failed</strong>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Operations Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Hash Verification</CardTitle>
              <CardDescription>
                Verify multiple certificate hashes at once. Enter one
                certificate per line in format:
                certificateId,hash,institutionAddress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batchHashes">
                  Certificate Data (CSV format)
                </Label>
                <Textarea
                  id="batchHashes"
                  value={batchHashes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setBatchHashes(e.target.value)
                  }
                  placeholder={`CERT-2024-001,a1b2c3d4e5f6...,9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
CERT-2024-002,b2c3d4e5f6a1...,8VzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`}
                  rows={6}
                />
              </div>

              <Button
                onClick={handleBatchVerification}
                disabled={isBatchVerifying}
                className="w-full"
              >
                {isBatchVerifying ? "Verifying..." : "Batch Verify Hashes"}
              </Button>

              {batchResults && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Badge variant="default">
                      {batchResults.verified.length} Verified
                    </Badge>
                    <Badge variant="destructive">
                      {batchResults.failed.length} Failed
                    </Badge>
                    <Badge variant="secondary">
                      {batchResults.revoked.length} Revoked
                    </Badge>
                    <Badge variant="outline">
                      {batchResults.notFound.length} Not Found
                    </Badge>
                  </div>

                  {batchResults.verified.length > 0 && (
                    <Alert className="border-green-500">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        <strong>Verified:</strong>{" "}
                        {batchResults.verified.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {batchResults.failed.length > 0 && (
                    <Alert className="border-red-500">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <strong>Failed:</strong>{" "}
                        {batchResults.failed.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Certificates Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Institution Certificates</CardTitle>
              <CardDescription>
                View and manage all certificates issued by your institution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={loadInstitutionCertificates}
                  disabled={isLoadingCerts}
                  className="flex-1"
                >
                  {isLoadingCerts ? "Loading..." : "Load Certificates"}
                </Button>
                <Button
                  onClick={exportCertificateData}
                  variant="outline"
                  disabled={blockchainCerts.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              {blockchainCerts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Found {blockchainCerts.length} certificates on blockchain
                  </p>

                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {blockchainCerts.map((cert, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p>
                              <strong>ID:</strong> {cert.certificateId}
                            </p>
                            <p>
                              <strong>Student:</strong> {cert.studentName}
                            </p>
                            <p>
                              <strong>Course:</strong> {cert.courseName}
                            </p>
                            <p>
                              <strong>Grade:</strong> {cert.grade}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge
                              variant={
                                cert.isRevoked ? "destructive" : "default"
                              }
                            >
                              {cert.isRevoked ? "Revoked" : "Active"}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              Verified: {cert.verificationCount.toString()}{" "}
                              times
                            </p>
                          </div>
                        </div>
                        {cert.certificateHash && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Hash:</p>
                            <code className="text-xs bg-gray-100 p-1 rounded block break-all">
                              {cert.certificateHash}
                            </code>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
