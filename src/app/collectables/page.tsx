"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Badge component will be used inline
import { Navbar } from "@/components/Navbar";
import {
  Award,
  Calendar,
  GraduationCap,
  School,
  User,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Building,
  Hash,
} from "lucide-react";
import { supabase, Certificate, Institution } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

interface UserCertificate extends Certificate {
  institutions?: {
    name: string;
    logo_url?: string;
  };
}

export default function CertificatesPage() {
  const { connected, publicKey } = useWallet();
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"university" | "student" | "public">(
    "public",
  );

  const checkInstitutionStatus = useCallback(async () => {
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
        setUserType(data.is_verified ? "university" : "student");
      }
    } catch (error) {
      console.error("Error checking institution status:", error);
      setInstitution(null);
      setUserType("student");
    }
  }, [publicKey]);

  useEffect(() => {
    checkInstitutionStatus();
  }, [checkInstitutionStatus]);

  const fetchUserCertificates = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      let query = supabase.from("certificates").select("*");

      if (userType === "university") {
        // University sees certificates they issued
        query = query.eq("issued_by", publicKey.toString());
      } else if (userType === "student") {
        // For students, filter by their wallet address
        query = query
          .eq("student_wallet", publicKey.toString())
          .eq("is_revoked", false);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCertificates(data || []);

      const message =
        userType === "university"
          ? `Loaded ${data?.length || 0} certificates issued by your institution`
          : `Loaded ${data?.length || 0} certificates`;

      if (data && data.length > 0) {
        toast.success(message);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, [publicKey, userType]);

  const fetchPublicCertificates = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch recent public certificates for showcase
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("is_revoked", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setCertificates(data || []);

      if (data && data.length > 0) {
        toast.success(
          `Found ${data.length} public certificate${data.length === 1 ? "" : "s"}`,
        );
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) {
      fetchUserCertificates();
    } else {
      fetchPublicCertificates();
    }
  }, [connected, fetchUserCertificates, fetchPublicCertificates]);

  const getPageTitle = () => {
    if (userType === "university") return "Your Institution's Certificates";
    if (userType === "student") return "Certificate Gallery";
    return "Public Certificates";
  };

  const getPageDescription = () => {
    if (userType === "university")
      return "Manage and view certificates issued by your institution";
    if (userType === "student")
      return "Browse and verify certificates on the blockchain";
    return "Explore verified certificates issued by institutions";
  };

  const CertificateCard = ({
    certificate,
  }: {
    certificate: UserCertificate;
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
              <School className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {certificate.course_name}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {certificate.institution_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {certificate.is_revoked ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Revoked
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {certificate.student_name}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Grade: {certificate.grade}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(certificate.issued_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Roll: {certificate.roll_no}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Hash className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Certificate Hash:
            </span>
          </div>
          <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block break-all">
            {certificate.certificate_hash}
          </code>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Verified: {certificate.verification_count || 0} times
          </div>
          <div className="flex space-x-2">
            <Link href={`/cert/${certificate.id}`} target="_blank">
              <Button size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {getPageDescription()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {userType === "university" && (
                <Link href="/dashboard">
                  <Button>
                    <Award className="w-4 h-4 mr-2" />
                    Issue Certificate
                  </Button>
                </Link>
              )}
              <Button
                onClick={
                  connected ? fetchUserCertificates : fetchPublicCertificates
                }
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* User Status Banner */}
          {connected && (
            <div className="mt-6">
              {userType === "university" && institution && (
                <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">
                          University Account: {institution.name}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          You can issue and manage certificates for your
                          institution
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {userType === "student" && (
                <Card className="border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                          Student Account
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Browse and verify certificates. Connect with your
                          student wallet to view certificates issued to you.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Not Connected Banner */}
          {!connected && (
            <Card className="mt-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                        Connect Your Wallet
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Connect your wallet to view personalized certificates
                        and access role-based features
                      </p>
                    </div>
                  </div>
                  <WalletMultiButton />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Certificates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Loading certificates...
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Please wait while we fetch the certificates
            </p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Certificates Found
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              {userType === "university"
                ? "You haven't issued any certificates yet. Start by creating your first certificate."
                : "No certificates are currently available to display."}
            </p>
            {userType === "university" && (
              <Link href="/dashboard">
                <Button>
                  <Award className="w-4 h-4 mr-2" />
                  Issue Your First Certificate
                </Button>
              </Link>
            )}
            {!connected && (
              <div className="space-y-3">
                <WalletMultiButton />
                <p className="text-sm text-gray-500">
                  Connect your wallet to access personalized features
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {certificates.length} certificate
                {certificates.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {certificates.filter((c) => !c.is_revoked).length} Valid
                </span>
                {certificates.some((c) => c.is_revoked) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {certificates.filter((c) => c.is_revoked).length} Revoked
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
