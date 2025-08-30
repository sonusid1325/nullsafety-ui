"use client";

import React, { useEffect, useState } from "react";
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
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { supabase, Certificate, Institution } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface CertificateFormData {
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  student_wallet: string;
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CertificateFormData>({
    student_name: "",
    roll_no: "",
    course_name: "",
    grade: "",
    student_wallet: "",
  });

  const fetchInstitutionData = async () => {
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
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchInstitutionData();
      fetchCertificates();
    }
  }, [connected, publicKey]);

  const fetchCertificates = async () => {
    if (!publicKey) return;

    try {
      // First get institution
      const { data: institutionData } = await supabase
        .from("institutions")
        .select("name")
        .eq("authority_wallet", publicKey.toString())
        .single();

      if (institutionData) {
        const { data, error } = await supabase
          .from("certificates")
          .select("*")
          .eq("institution_name", institutionData.name)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCertificates(data || []);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = async () => {
    if (!institution || !publicKey) {
      toast.error("Institution not found");
      return;
    }

    try {
      // Generate certificate hash (in production, use proper hashing)
      const certificateHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      const certificateData = {
        ...formData,
        institution_name: institution.name,
        issued_by: publicKey.toString(),
        issued_date: new Date().toISOString().split("T")[0],
        certificate_hash: certificateHash,
        is_revoked: false,
      };

      const { error } = await supabase
        .from("certificates")
        .insert([certificateData])
        .select()
        .single();

      if (error) throw error;

      toast.success("Certificate created successfully!");
      setIsCreateModalOpen(false);
      setFormData({
        student_name: "",
        roll_no: "",
        course_name: "",
        grade: "",
        student_wallet: "",
      });

      // Refresh certificates list
      fetchCertificates();
    } catch (error) {
      console.error("Error creating certificate:", error);
      toast.error("Failed to create certificate");
    }
  };

  const handleRevokeCertificate = async (certificateId: string) => {
    try {
      const { error } = await supabase
        .from("certificates")
        .update({ is_revoked: true })
        .eq("id", certificateId);

      if (error) throw error;

      toast.success("Certificate revoked successfully");
      fetchCertificates();
    } catch (error) {
      console.error("Error revoking certificate:", error);
      toast.error("Failed to revoke certificate");
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-96 dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Award className="mx-auto h-12 w-12 text-blue-500" />
              <h2 className="text-xl font-semibold dark:text-white">
                Institution Dashboard
              </h2>
              <p className="text-muted-foreground dark:text-gray-400">
                Connect your wallet to access the certificate management
                dashboard
              </p>
              <WalletMultiButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-96 dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold dark:text-white">
                Institution Not Found
              </h2>
              <p className="text-muted-foreground dark:text-gray-400">
                Your wallet is not associated with any registered institution.
                Please contact support to register your institution.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {institution.name} Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage certificates and institution settings
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  institution.is_verified
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {institution.is_verified ? "Verified" : "Pending Verification"}
              </div>
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Certificates
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificates.length}</div>
              <p className="text-xs text-muted-foreground">
                Issued certificates
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Certificates
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {certificates.filter((cert) => !cert.is_revoked).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Valid certificates
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                NFT Certificates
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {certificates.filter((cert) => cert.nft_mint).length}
              </div>
              <p className="text-xs text-muted-foreground">Minted as NFTs</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">
            Certificates
          </h2>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Issue Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Issue New Certificate</DialogTitle>
                <DialogDescription>
                  Create a new certificate for a student. This will be stored on
                  the blockchain.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-200">
                    Student Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.student_name}
                    onChange={(e) =>
                      setFormData({ ...formData, student_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-200">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.roll_no}
                    onChange={(e) =>
                      setFormData({ ...formData, roll_no: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-200">
                    Course Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.course_name}
                    onChange={(e) =>
                      setFormData({ ...formData, course_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-200">
                    Grade
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-200">
                    Student Wallet Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="For NFT minting"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
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
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCertificate}>
                  Issue Certificate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Certificates List */}
        <div className="grid gap-4">
          {certificates.length === 0 ? (
            <Card className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground dark:text-gray-400">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <p>No certificates issued yet.</p>
                  <p className="text-sm">
                    Create your first certificate to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            certificates.map((certificate) => (
              <Card key={certificate.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold dark:text-white">
                          {certificate.student_name}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          (Roll: {certificate.roll_no})
                        </span>
                        {certificate.is_revoked ? (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 dark:text-gray-300">
                        {certificate.course_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Grade: {certificate.grade} • Issued:{" "}
                        {certificate.issued_date}
                      </p>

                      {certificate.nft_mint && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-purple-600">Minted as NFT</span>
                          <a
                            href={`https://solscan.io/token/${certificate.nft_mint}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link href={`/cert/${certificate.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>

                      {!certificate.is_revoked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRevokeCertificate(certificate.id)
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
