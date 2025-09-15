"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, Zap } from "lucide-react";
import { toast } from "react-hot-toast";

interface CertificateResult {
  certificateId: string;
  studentName: string;
  success: boolean;
  transactionSignature?: string;
  transactionUrl?: string;
  error?: string;
}

interface SingleCertificateForm {
  studentName: string;
  courseName: string;
  grade: string;
}

export default function PrivateKeyCertificateDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CertificateResult[]>([]);

  // Single certificate form
  const [singleForm, setSingleForm] = useState<SingleCertificateForm>({
    studentName: "",
    courseName: "",
    grade: ""
  });

  // Batch certificates form
  const [batchText, setBatchText] = useState("");
  const [batchResults, setBatchResults] = useState<any>(null);

  // Sample data
  const sampleCertificates = [
    { studentName: "Alice Johnson", courseName: "Blockchain Fundamentals", grade: "A+" },
    { studentName: "Bob Smith", courseName: "Smart Contract Development", grade: "A" },
    { studentName: "Carol Davis", courseName: "DeFi Protocol Design", grade: "B+" },
    { studentName: "David Wilson", courseName: "Cryptocurrency Trading", grade: "A-" },
    { studentName: "Eva Martinez", courseName: "NFT Development", grade: "A+" }
  ];

  const loadSampleData = () => {
    setBatchText(JSON.stringify(sampleCertificates, null, 2));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/certificates/issue-private", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(singleForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Certificate issued successfully!");
        setResults(prev => [...prev, {
          certificateId: data.data.certificateId,
          studentName: data.data.studentName,
          success: true,
          transactionSignature: data.data.transactionSignature,
          transactionUrl: data.data.transactionUrl
        }]);
        setSingleForm({ studentName: "", courseName: "", grade: "" });
      } else {
        toast.error(data.error || "Failed to issue certificate");
        setResults(prev => [...prev, {
          certificateId: data.certificateId || "unknown",
          studentName: singleForm.studentName,
          success: false,
          error: data.error
        }]);
      }
    } catch (error) {
      toast.error("Network error occurred");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const certificates = JSON.parse(batchText);

      const response = await fetch("/api/certificates/issue-private", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ certificates })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Batch complete: ${data.data.successful}/${data.data.total} certificates issued`);
        setBatchResults(data.data);
      } else {
        toast.error(data.error || "Batch processing failed");
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        toast.error("Network error occurred");
      }
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const openTransaction = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Private Key Certificate Demo</h1>
        <p className="text-muted-foreground text-lg">
          Issue blockchain certificates automatically using private key authentication
        </p>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Zap className="w-4 h-4 mr-1" />
          Devnet Mode
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Single Certificate Form */}
        <Card>
          <CardHeader>
            <CardTitle>Single Certificate Issuance</CardTitle>
            <CardDescription>
              Issue one certificate at a time using your private key
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name</Label>
                <Input
                  id="studentName"
                  value={singleForm.studentName}
                  onChange={(e) => setSingleForm(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder="Enter student full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name</Label>
                <Input
                  id="courseName"
                  value={singleForm.courseName}
                  onChange={(e) => setSingleForm(prev => ({ ...prev, courseName: e.target.value }))}
                  placeholder="Enter course name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={singleForm.grade}
                  onChange={(e) => setSingleForm(prev => ({ ...prev, grade: e.target.value }))}
                  placeholder="Enter grade (e.g., A+, B, C)"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Issuing Certificate...
                  </>
                ) : (
                  "Issue Certificate"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Batch Certificate Form */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Certificate Issuance</CardTitle>
            <CardDescription>
              Issue multiple certificates at once using JSON format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batchText">Certificates JSON</Label>
                <Textarea
                  id="batchText"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Enter JSON array of certificates..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={loadSampleData}>
                  Load Sample Data
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Processing Batch...
                    </>
                  ) : (
                    "Issue Batch"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {(results.length > 0 || batchResults) && (
        <div className="space-y-6">
          <Separator />

          <h2 className="text-2xl font-bold">Results</h2>

          {/* Single Certificate Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Single Certificate Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{result.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {result.certificateId}
                          </p>
                          {result.error && (
                            <p className="text-sm text-red-600">{result.error}</p>
                          )}
                        </div>
                      </div>

                      {result.success && result.transactionUrl && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.transactionSignature || "")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTransaction(result.transactionUrl)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch Results */}
          {batchResults && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Processing Results</CardTitle>
                <CardDescription>
                  {batchResults.successful} of {batchResults.total} certificates issued successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <Badge variant="outline" className="text-green-600">
                      ✅ Successful: {batchResults.successful}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      ❌ Failed: {batchResults.failed}
                    </Badge>
                    <Badge variant="outline">
                      📊 Total: {batchResults.total}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {batchResults.results.map((result: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{result.studentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.certificateId}
                            </p>
                            {result.error && (
                              <p className="text-xs text-red-600">{result.error}</p>
                            )}
                          </div>
                        </div>

                        {result.success && result.transactionUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTransaction(result.transactionUrl)}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>1. Environment Setup:</strong> Make sure your <code>SOLANA_PRIVATE_KEY</code> is set in <code>.env.local</code></p>
            <p><strong>2. Single Certificate:</strong> Fill out the form and click "Issue Certificate"</p>
            <p><strong>3. Batch Certificates:</strong> Use JSON format with array of certificate objects</p>
            <p><strong>4. View Results:</strong> Click the external link icon to view transactions on Solana Explorer</p>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-2">JSON Format Example:</p>
            <pre className="text-xs">
{`[
  {
    "studentName": "John Doe",
    "courseName": "Web3 Development",
    "grade": "A+"
  }
]`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
