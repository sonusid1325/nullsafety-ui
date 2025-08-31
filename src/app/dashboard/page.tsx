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
  });

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

  const fetchCertificates = useCallback(async () => {
    if (!publicKey) return;

    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("issued_by", publicKey.toString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchInstitutionData();
      fetchCertificates();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, fetchInstitutionData, fetchCertificates]);

  const handleCreateCertificate = async () => {
    if (!publicKey || !institution) return;

    try {
      const certificateData = {
        ...formData,
        certificate_id: `CERT-${Date.now()}`,
        institution_name: institution.name,
        issued_by: publicKey.toString(),
        issued_date: new Date().toISOString(),
        certificate_hash: `hash-${Date.now()}`, // In production, generate proper hash
        is_revoked: false,
      };

      const { error } = await supabase
        .from("certificates")
        .insert([certificateData]);

      if (error) throw error;

      toast.success("Certificate created successfully!");
      setIsCreateModalOpen(false);
      setFormData({
        student_name: "",
        roll_no: "",
        course_name: "",
        grade: "",
      });
      fetchCertificates();
    } catch (error) {
      console.error("Error creating certificate:", error);
      toast.error("Failed to create certificate");
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
                NullSafety Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your wallet to access the certificate dashboard
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

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                <Award className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-black dark:text-white">
                  NullSafety Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {institution?.name || "Certificate Management"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Home
              </Link>
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

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

            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                  <Plus className="w-4 h-4 mr-2" />
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
                        setFormData({ ...formData, roll_no: e.target.value })
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
                    disabled={!formData.student_name || !formData.course_name}
                  >
                    Create Certificate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

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
                    Get started by creating your first certificate
                  </p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Certificate
                  </Button>
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
