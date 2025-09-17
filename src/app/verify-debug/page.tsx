"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";

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
  student_wallet?: string;
  nft_mint?: string;
  verification_count: number;
  created_at: string;
  updated_at: string;
}

export default function VerifyDebugPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<Certificate | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">(
    "checking",
  );

  useEffect(() => {
    checkDatabaseConnection();
    loadCertificates();
  }, []);

  const checkDatabaseConnection = async () => {
    try {
      const { error } = await supabase
        .from("certificates")
        .select("count(*)")
        .limit(1);

      if (error) {
        console.error("Database connection error:", error);
        setDbStatus("error");
      } else {
        setDbStatus("connected");
      }
    } catch (error) {
      console.error("Database connection error:", error);
      setDbStatus("error");
    }
  };

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading certificates:", error);
        toast.error("Failed to load certificates");
        setCertificates([]);
      } else {
        setCertificates(data || []);
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast.error("Failed to load certificates");
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const searchCertificate = async () => {
    if (!searchId.trim()) {
      toast.error("Please enter a certificate ID");
      return;
    }

    setSearchLoading(true);
    setSearchResult(null);

    try {
      let foundCert = null;

      // Try searching by certificate_id first
      const { data: cert1, error: searchError } = await supabase
        .from("certificates")
        .select("*")
        .eq("certificate_id", searchId.trim())
        .single();

      if (cert1) {
        foundCert = cert1;
      } else if (searchError && searchError.code === "PGRST116") {
        // Not found by certificate_id, try by primary key id
        const { data: cert2, error: errorById } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", searchId.trim())
          .single();

        if (cert2) {
          foundCert = cert2;
        } else if (errorById && errorById.code === "PGRST116") {
          // Try case-insensitive search
          const { data: cert3, error: errorByIlike } = await supabase
            .from("certificates")
            .select("*")
            .ilike("certificate_id", searchId.trim())
            .single();

          if (cert3) {
            foundCert = cert3;
          } else if (errorByIlike && errorByIlike.code === "PGRST116") {
            toast.error("Certificate not found");
            return;
          } else if (errorByIlike) {
            throw errorByIlike;
          }
        } else if (errorById) {
          throw errorById;
        }
      } else if (searchError) {
        throw searchError;
      }

      if (!foundCert) {
        toast.error("Certificate not found");
        return;
      }

      setSearchResult(foundCert);
      toast.success("Certificate found!");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const testVerificationAPI = async (certificateId: string) => {
    try {
      const testData = {
        student_name: "Test Student",
        roll_no: "TEST123",
        course_name: "Test Course",
        grade: "A",
        certificate_id: certificateId,
        institution_name: "Test Institution",
        issued_date: "2024-01-01",
      };

      const response = await fetch("/api/certificates/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("API test successful");
        console.log("Verification result:", result);
      } else {
        toast.error("API test failed");
        console.error("Verification error:", result);
      }
    } catch (error) {
      toast.error("API test error");
      console.error("API test error:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500">
            Connected
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Certificate Verification Debug
            </h1>
            <p className="text-muted-foreground mt-2">
              Debug tools for certificate database and verification system
            </p>
          </div>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(dbStatus)}
                  <span>Database Connection</span>
                </div>
                {getStatusBadge(dbStatus)}
              </div>
              {dbStatus === "connected" && (
                <p className="text-sm text-muted-foreground mt-2">
                  Found {certificates.length} certificates (showing last 10)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Search Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Certificate
              </CardTitle>
              <CardDescription>
                Enter a certificate ID or UUID to search the database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search-id">Certificate ID or UUID</Label>
                  <Input
                    id="search-id"
                    placeholder="Enter certificate ID..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchCertificate()}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={searchCertificate} disabled={searchLoading}>
                    {searchLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {searchResult && (
                <div className="mt-4 p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Found Certificate:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>ID:</strong> {searchResult.id}
                    </div>
                    <div>
                      <strong>Certificate ID:</strong>{" "}
                      {searchResult.certificate_id}
                    </div>
                    <div>
                      <strong>Student:</strong> {searchResult.student_name}
                    </div>
                    <div>
                      <strong>Roll No:</strong> {searchResult.roll_no}
                    </div>
                    <div>
                      <strong>Course:</strong> {searchResult.course_name}
                    </div>
                    <div>
                      <strong>Grade:</strong> {searchResult.grade}
                    </div>
                    <div>
                      <strong>Institution:</strong>{" "}
                      {searchResult.institution_name}
                    </div>
                    <div>
                      <strong>Issued Date:</strong> {searchResult.issued_date}
                    </div>
                    <div>
                      <strong>Revoked:</strong>{" "}
                      {searchResult.is_revoked ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Verifications:</strong>{" "}
                      {searchResult.verification_count}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        testVerificationAPI(searchResult.certificate_id)
                      }
                    >
                      Test Verification API
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificates List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Certificates</CardTitle>
              <CardDescription>
                Last 10 certificates in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading certificates...</div>
              ) : certificates.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No certificates found in the database. Make sure
                    certificates are properly inserted.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Certificate ID</th>
                        <th className="text-left p-2">Student Name</th>
                        <th className="text-left p-2">Institution</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Grade</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Verifications</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((cert) => (
                        <tr
                          key={cert.id}
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="p-2 font-mono text-xs">
                            {cert.certificate_id}
                          </td>
                          <td className="p-2">{cert.student_name}</td>
                          <td className="p-2">{cert.institution_name}</td>
                          <td className="p-2">{cert.course_name}</td>
                          <td className="p-2">{cert.grade}</td>
                          <td className="p-2">
                            {cert.is_revoked ? (
                              <Badge variant="destructive">Revoked</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500">
                                Valid
                              </Badge>
                            )}
                          </td>
                          <td className="p-2">{cert.verification_count}</td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                testVerificationAPI(cert.certificate_id)
                              }
                            >
                              Test
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sample OCR Data Format */}
          <Card>
            <CardHeader>
              <CardTitle>Sample OCR Data Format</CardTitle>
              <CardDescription>
                Expected format for certificate data extraction. Note:
                certificate_id is used for database lookup only and is not
                included in authenticity comparison.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(
                  {
                    student_name: "John Doe",
                    roll_no: "2021001",
                    course_name: "Computer Science",
                    grade: "A+",
                    certificate_id: "CERT-2024-001", // Used for database lookup, not compared
                    institution_name: "Example University",
                    issued_date: "2024-01-15",
                  },
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
