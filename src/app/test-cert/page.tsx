"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import {
  Award,
  Plus,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function TestCertPage() {
  const { connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [createdCertId, setCreatedCertId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_name: "John Doe",
    roll_no: "2024001",
    course_name: "Computer Science Degree",
    grade: "A+",
    institution_name: "Test University",
  });

  const createTestCertificate = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);

      const certificateData = {
        ...formData,
        certificate_id: `TEST-CERT-${Date.now()}`,
        issued_by: publicKey.toString(),
        issued_date: new Date().toISOString().split("T")[0],
        certificate_hash: `test-hash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        is_revoked: false,
      };

      // Try direct insertion first
      const { data, error } = await supabase
        .from("certificates")
        .insert([certificateData])
        .select()
        .single();

      if (error) {
        console.error("Direct insertion failed:", error);

        // Try API route as fallback
        const response = await fetch("/api/certificates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(certificateData),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setCreatedCertId(result.data.id);
          toast.success("Test certificate created successfully via API!");
        } else {
          throw new Error(result.error || "API creation failed");
        }
      } else {
        setCreatedCertId(data.id);
        toast.success("Test certificate created successfully!");
      }
    } catch (error) {
      console.error("Error creating certificate:", error);
      toast.error(
        `Failed to create certificate: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const generateRandomData = () => {
    const students = [
      "Alice Johnson",
      "Bob Smith",
      "Charlie Brown",
      "Diana Prince",
      "Eve Wilson",
    ];
    const courses = [
      "Computer Science Degree",
      "Data Science Certificate",
      "Web Development Bootcamp",
      "Blockchain Fundamentals",
      "AI/ML Specialization",
    ];
    const grades = ["A+", "A", "A-", "B+", "B"];
    const institutions = [
      "Tech University",
      "Digital Academy",
      "Innovation Institute",
      "Cyber College",
      "Future University",
    ];

    setFormData({
      student_name: students[Math.floor(Math.random() * students.length)],
      roll_no: `2024${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, "0")}`,
      course_name: courses[Math.floor(Math.random() * courses.length)],
      grade: grades[Math.floor(Math.random() * grades.length)],
      institution_name:
        institutions[Math.floor(Math.random() * institutions.length)],
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Test Certificate Creator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quick tool to create test certificates for debugging the certificate
            system
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
                    Connect your wallet to create test certificates
                  </p>
                  <WalletMultiButton />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Certificate Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student Name
                </label>
                <Input
                  value={formData.student_name}
                  onChange={(e) =>
                    setFormData({ ...formData, student_name: e.target.value })
                  }
                  placeholder="Enter student name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Roll Number
                </label>
                <Input
                  value={formData.roll_no}
                  onChange={(e) =>
                    setFormData({ ...formData, roll_no: e.target.value })
                  }
                  placeholder="Enter roll number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Name
                </label>
                <Input
                  value={formData.course_name}
                  onChange={(e) =>
                    setFormData({ ...formData, course_name: e.target.value })
                  }
                  placeholder="Enter course name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade
                </label>
                <Input
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: e.target.value })
                  }
                  placeholder="Enter grade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Institution Name
                </label>
                <Input
                  value={formData.institution_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      institution_name: e.target.value,
                    })
                  }
                  placeholder="Enter institution name"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={generateRandomData}
                  variant="outline"
                  className="flex-1"
                >
                  Random Data
                </Button>
                <Button
                  onClick={createTestCertificate}
                  disabled={!connected || loading}
                  className="flex-1"
                >
                  {loading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Certificate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Result</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {createdCertId ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      Certificate Created Successfully!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                      Certificate ID: {createdCertId}
                    </p>
                    <div className="flex space-x-2">
                      <Link href={`/cert/${createdCertId}`} target="_blank">
                        <Button size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Certificate
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCertId);
                          toast.success("Certificate ID copied!");
                        }}
                      >
                        Copy ID
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Fill out the form and create a test certificate to see the
                    result here.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Quick Links
                </h4>
                <div className="space-y-2">
                  <Link href="/cert-debug" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Certificate Debug Tool
                    </Button>
                  </Link>
                  <Link href="/collectables" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View All Certificates
                    </Button>
                  </Link>
                  <Link href="/verify" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Verify Certificates
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <h4>How to test the certificate system:</h4>
              <ol>
                <li>Connect your wallet using the button above</li>
                <li>Fill out the certificate form or use Random Data</li>
                <li>Click Create Certificate to generate a test certificate</li>
                <li>
                  Use the View Certificate link to see the full certificate page
                </li>
                <li>
                  Visit the Certificate Debug Tool to see all certificates
                </li>
                <li>Test the verification system on the Verify page</li>
              </ol>

              <h4>Available endpoints:</h4>
              <ul>
                <li>
                  <code>/api/certificates</code> - List all certificates
                </li>
                <li>
                  <code>/api/certificates/[id]</code> - Get specific certificate
                </li>
                <li>
                  <code>/cert/[id]</code> - View certificate page
                </li>
                <li>
                  <code>/cert-debug</code> - Debug tool
                </li>
                <li>
                  <code>/verify</code> - Certificate verification
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
