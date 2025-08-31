"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Input and Badge components will be used inline for now
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
} from "lucide-react";
import { supabase, Certificate } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

export default function VerifyPage() {
  const { connected, publicKey } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"id" | "wallet" | "hash">(
    "wallet",
  );
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] =
    useState<Certificate | null>(null);

  const searchCertificates = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from("certificates").select("*");

      switch (searchType) {
        case "id":
          query = query.eq("id", searchQuery.trim());
          break;
        case "wallet":
          query = query.eq("issued_by", searchQuery.trim());
          break;
        case "hash":
          query = query.eq("certificate_hash", searchQuery.trim());
          break;
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      setCertificates(data || []);

      if (data && data.length > 0) {
        toast.success(`Found ${data.length} certificate(s)`);
      } else {
        toast("No certificates found");
      }
    } catch (error) {
      console.error("Error searching certificates:", error);
      toast.error("Error searching certificates");
    } finally {
      setLoading(false);
    }
  };

  const viewCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
  };

  const verifyCertificate = async (certificateId: string) => {
    try {
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verifier_wallet: publicKey?.toString() || null,
        }),
      });

      if (response.ok) {
        toast.success("Certificate verification recorded!");
      }
    } catch (error) {
      console.error("Error recording verification:", error);
    }
  };

  const searchMyCertificates = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setSearchQuery(publicKey.toString());
    setSearchType("wallet");
    await searchCertificates();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Certificate Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verify certificates by wallet address, certificate ID, or blockchain
            hash
          </p>
        </div>

        {!connected && (
          <Card className="mb-8 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Connect your wallet to view certificates issued to your
                    wallet address.
                  </p>
                  <WalletMultiButton />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Search Certificates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Type
                  </label>
                  <select
                    value={searchType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setSearchType(e.target.value as "id" | "wallet" | "hash")
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="wallet">Wallet Address</option>
                    <option value="id">Certificate ID</option>
                    <option value="hash">Blockchain Hash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {searchType === "wallet" && "Wallet Address"}
                    {searchType === "id" && "Certificate ID"}
                    {searchType === "hash" && "Blockchain Hash"}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      searchType === "wallet"
                        ? "Enter wallet address..."
                        : searchType === "id"
                          ? "Enter certificate ID..."
                          : "Enter blockchain hash..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button
                  onClick={searchCertificates}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Searching..." : "Search Certificates"}
                </Button>

                {connected && (
                  <Button
                    onClick={searchMyCertificates}
                    variant="outline"
                    className="w-full"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    My Certificates
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="/cert-debug" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Debug Tool
                  </Button>
                </a>
                <a
                  href="https://solscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Solscan
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {certificates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Search Results ({certificates.length} certificates)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-black dark:text-white">
                                {cert.student_name}
                              </h3>
                              {cert.is_revoked ? (
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center space-x-2">
                                <Award className="w-4 h-4" />
                                <span>{cert.course_name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>Roll: {cert.roll_no}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4" />
                                <span>{cert.institution_name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(
                                    cert.issued_date,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-2">
                                <Hash className="w-3 h-3" />
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                                  {cert.certificate_hash?.slice(0, 32)}...
                                </code>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => viewCertificate(cert)}
                            >
                              View Details
                            </Button>
                            <a
                              href={`/cert/${cert.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Open
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certificate Details Modal */}
            {selectedCertificate && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Certificate Details</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCertificate(null)}
                    >
                      ×
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Student Name
                        </label>
                        <p className="text-black dark:text-white">
                          {selectedCertificate.student_name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Roll Number
                        </label>
                        <p className="text-black dark:text-white">
                          {selectedCertificate.roll_no}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Course
                        </label>
                        <p className="text-black dark:text-white">
                          {selectedCertificate.course_name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Grade
                        </label>
                        <p
                          className="text-black
 dark:text-white"
                        >
                          {selectedCertificate.grade}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Institution
                        </label>
                        <p className="text-black dark:text-white">
                          {selectedCertificate.institution_name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Issue Date
                        </label>
                        <p className="text-black dark:text-white">
                          {new Date(
                            selectedCertificate.issued_date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Certificate Hash
                      </label>
                      <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                        {selectedCertificate.certificate_hash}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Issued By (Wallet Address)
                      </label>
                      <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                        {selectedCertificate.issued_by}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        {selectedCertificate.is_revoked ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">
                              Certificate Revoked
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">
                              Certificate Valid
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <a
                          href={`/cert/${selectedCertificate.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            onClick={() =>
                              verifyCertificate(selectedCertificate.id)
                            }
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Full Certificate
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty State */}
            {!loading && certificates.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No Search Results
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    Search for certificates using wallet address, certificate
                    ID, or blockchain hash.
                  </p>
                  {connected && (
                    <Button onClick={searchMyCertificates} variant="outline">
                      <Award className="w-4 h-4 mr-2" />
                      View My Certificates
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
