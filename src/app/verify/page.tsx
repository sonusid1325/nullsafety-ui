"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileImage,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  ExtractedCertificateData,
  VerificationResult,
  FieldComparison,
  validateImageFile,
  formatFieldName,
  createFieldComparison,
} from "@/lib/certificateVerification";

export default function VerifyPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [fieldComparison, setFieldComparison] = useState<FieldComparison[]>([]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate the file using utility function
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || "Invalid file");
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Reset previous results
      setVerificationResult(null);
      setFieldComparison([]);
      setProcessingStep("");
    }
  };

  const handleVerifyCertificate = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Extracting data from image...");
    setVerificationResult(null);
    setFieldComparison([]);

    try {
      // Step 1: Extract data using Gemini OCR
      const formData = new FormData();
      formData.append("image", selectedImage);

      const ocrResponse = await fetch("/api/ocr/extract", {
        method: "POST",
        body: formData,
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to extract data from image");
      }

      const extractedData = await ocrResponse.json();
      console.log("Extracted data:", extractedData);

      setProcessingStep("Verifying against database...");

      // Step 2: Verify against database
      const verifyResponse = await fetch("/api/certificates/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(extractedData),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to verify certificate");
      }

      const result = await verifyResponse.json();
      setVerificationResult(result);

      // Create field comparison for detailed display
      const comparison = createFieldComparison(
        result.extractedData,
        result.databaseData,
      );
      setFieldComparison(comparison);

      // Show success message
      if (result.isValid && !result.isRevoked) {
        toast.success("Certificate verified successfully!");
      } else if (result.isRevoked) {
        toast.error("Certificate has been revoked!");
      } else {
        toast.error("Certificate verification failed!");
      }
    } catch (error) {
      console.error("Verification error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during verification";
      toast.error(errorMessage);
      setProcessingStep("");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const getStatusIcon = (status: string, isRevoked: boolean) => {
    if (isRevoked) return <XCircle className="h-5 w-5 text-red-500" />;
    if (status === "authentic")
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === "altered")
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status: string, isRevoked: boolean) => {
    if (isRevoked) return <Badge variant="destructive">Revoked</Badge>;
    if (status === "authentic")
      return (
        <Badge variant="default" className="bg-green-500">
          Authentic
        </Badge>
      );
    if (status === "altered")
      return (
        <Badge variant="default" className="bg-orange-500">
          Altered
        </Badge>
      );
    return <Badge variant="destructive">Fake</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Certificate Verification</h1>
          <p className="text-muted-foreground mt-2">
            Upload a certificate image to verify its authenticity
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Certificate
            </CardTitle>
            <CardDescription>
              Select an image of the certificate you want to verify (JPG, PNG,
              WebP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="certificate-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Certificate preview"
                      width={800}
                      height={600}
                      className="max-h-60 max-w-full object-contain rounded-lg"
                      style={{ width: "auto", height: "auto" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileImage className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or WebP (MAX. 10MB)
                      </p>
                    </div>
                  )}
                  <input
                    id="certificate-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>

              {selectedImage && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleVerifyCertificate}
                    disabled={isProcessing}
                    className="px-8"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        {processingStep || "Processing..."}
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Verify Certificate
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(
                    verificationResult.status,
                    verificationResult.isRevoked,
                  )}
                  Verification Results
                </div>
                {getStatusBadge(
                  verificationResult.status,
                  verificationResult.isRevoked,
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Alert */}
              <Alert
                className={
                  verificationResult.isRevoked
                    ? "border-red-500"
                    : verificationResult.status === "authentic"
                      ? "border-green-500"
                      : verificationResult.status === "altered"
                        ? "border-orange-500"
                        : "border-red-500"
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {verificationResult.message}
                </AlertDescription>
              </Alert>

              {/* Verification Stats */}
              {verificationResult.databaseData && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This certificate has been verified{" "}
                    <strong>{verificationResult.verificationCount}</strong>{" "}
                    times
                  </p>
                </div>
              )}

              {/* Comparison Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Comparison</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Certificate ID is used for lookup and not compared for
                  authenticity verification.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                          Field
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                          Extracted Data
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                          Database Data
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                          Match
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldComparison.map((comparison) => (
                        <tr
                          key={comparison.field}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium">
                            {formatFieldName(comparison.field)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            <span
                              className={
                                comparison.extracted ? "" : "text-gray-400"
                              }
                            >
                              {comparison.extracted || "Not extracted"}
                            </span>
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            <span
                              className={
                                comparison.database ? "" : "text-gray-400"
                              }
                            >
                              {comparison.database || "Not found"}
                            </span>
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                            {comparison.database ? (
                              comparison.matches ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Information */}
              {verificationResult.status === "authentic" &&
                !verificationResult.isRevoked &&
                verificationResult.databaseData && (
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      ✓ Certificate is Authentic
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      This certificate is completely authentic. All extracted
                      data matches the database records perfectly (100% match).
                    </p>
                  </div>
                )}

              {verificationResult.status === "altered" &&
                !verificationResult.isRevoked &&
                verificationResult.databaseData && (
                  <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      ⚠️ Certificate Appears Altered
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      This certificate exists in our database but some
                      information appears to have been modified.
                      {verificationResult.matchPercentage && (
                        <>
                          {" "}
                          {verificationResult.matchPercentage}% of extracted
                          data matches the original records.
                        </>
                      )}
                    </p>
                  </div>
                )}

              {verificationResult.isRevoked && (
                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    ⚠ Certificate Revoked
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    This certificate exists in our database but has been revoked
                    and is no longer valid.
                  </p>
                </div>
              )}

              {verificationResult.status === "fake" &&
                !verificationResult.isRevoked && (
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      ✗ Certificate is Fake
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {verificationResult.databaseData
                        ? "This certificate exists in our database but the extracted data shows significant discrepancies. This certificate is likely fake or severely corrupted."
                        : "This certificate could not be found in our database. It is fake or not issued by a registered institution."}
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
