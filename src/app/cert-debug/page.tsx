"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Input and Badge components will be used inline
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Eye,
  ExternalLink,
  Search,
  RefreshCw,
  Database,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Certificate {
  id: string;
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  certificate_id: string;
  institution_name: string;
  issued_by: string;
  issued_date: string;
  certificate_hash: string;
  is_revoked: boolean;
  verification_count: number;
  created_at: string;
}

export default function CertificateDebugPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState("");
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [testLoading, setTestLoading] = useState(false);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/certificates?limit=50");
      const result = await response.json();

      if (result.success) {
        setCertificates(result.data);
        toast.success(`Loaded ${result.data.length} certificates`);
      } else {
        toast.error("Failed to fetch certificates");
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Error fetching certificates");
    } finally {
      setLoading(false);
    }
  };

  const testCertificateById = async (id: string) => {
    if (!id.trim()) {
      toast.error("Please enter a certificate ID");
      return;
    }

    try {
      setTestLoading(true);
      const response = await fetch(`/api/certificates/${id}`);
      const result = await response.json();

      setTestResult(result);

      if (result.success) {
        toast.success("Certificate found successfully!");
      } else {
        toast.error(result.error || "Certificate not found");
      }
    } catch (error) {
      console.error("Error testing certificate:", error);
      setTestResult({ error: "Network error" });
      toast.error("Error testing certificate");
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-xl font-bold text-black dark:text-white hover:text-gray-600"
              >
                EduChain
              </Link>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                Debug Mode
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  Admin
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Certificate System Debug
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Debug and test certificate fetching functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificate Test Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Test Certificate by ID</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Enter certificate ID (UUID)"
                    value={testId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTestId(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <Button
                  onClick={() => testCertificateById(testId)}
                  disabled={testLoading}
                  className="w-full"
                >
                  {testLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Test Certificate
                    </>
                  )}
                </Button>

                {testResult && (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Test Result:</h4>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={fetchCertificates}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Certificates
                </Button>
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Certificates List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>All Certificates ({certificates.length})</span>
                </CardTitle>
                <Button
                  onClick={fetchCertificates}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Loading certificates...
                    </p>
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      No Certificates Found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500 mb-4">
                      Create some certificates from the dashboard to test the
                      system.
                    </p>
                    <Link href="/dashboard">
                      <Button>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-black dark:text-white">
                                {cert.student_name}
                              </h3>
                              {cert.is_revoked ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  Revoked
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Valid
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Course:</span>{" "}
                                {cert.course_name}
                              </div>
                              <div>
                                <span className="font-medium">Roll No:</span>{" "}
                                {cert.roll_no}
                              </div>
                              <div>
                                <span className="font-medium">Grade:</span>{" "}
                                {cert.grade}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Institution:
                                </span>{" "}
                                {cert.institution_name}
                              </div>
                              <div>
                                <span className="font-medium">Issued:</span>{" "}
                                {new Date(
                                  cert.issued_date,
                                ).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Verifications:
                                </span>{" "}
                                {cert.verification_count}
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <div className="mb-1">
                                  <span className="font-medium">ID:</span>{" "}
                                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                    {cert.id}
                                  </code>
                                </div>
                                <div>
                                  <span className="font-medium">Hash:</span>{" "}
                                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                    {cert.certificate_hash?.slice(0, 32)}...
                                  </code>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTestId(cert.id)}
                            >
                              <Search className="w-4 h-4" />
                            </Button>
                            <Link href={`/cert/${cert.id}`} target="_blank">
                              <Button size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
