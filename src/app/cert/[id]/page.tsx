"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { supabase, Certificate } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CertificatePage() {
  const params = useParams();
  const certificateRef = useRef<HTMLDivElement>(null);

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const fetchCertificate = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching certificate with ID:", params.id);

      // First try direct Supabase query
      try {
        const { data: certData, error: certError } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", params.id)
          .single();

        if (certError) {
          if (certError.code === "PGRST116") {
            toast.error("Certificate not found");
            return;
          }
          throw certError;
        }

        console.log("Certificate data (direct query):", certData);

        // Try to fetch matching institution data based on institution_name
        if (certData.institution_name) {
          const { data: institutionData } = await supabase
            .from("institutions")
            .select("name, logo_url")
            .eq("name", certData.institution_name)
            .single();

          if (institutionData) {
            // Add institution data to certificate
            const enrichedCertData = {
              ...certData,
              institutions: institutionData,
            };
            setCertificate(enrichedCertData);
          } else {
            setCertificate(certData);
          }
        } else {
          setCertificate(certData);
        }
        return;
      } catch (supabaseError) {
        console.warn(
          "Direct Supabase query failed, trying API:",
          supabaseError,
        );

        // Fallback to API route
        const response = await fetch(`/api/certificates/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Certificate not found");
            return;
          }
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiResult = await response.json();
        if (apiResult.success) {
          console.log("Certificate data (API):", apiResult.data);
          setCertificate(apiResult.data);
        } else {
          throw new Error(apiResult.error || "API request failed");
        }
      }
    } catch (error) {
      console.error("Error fetching certificate:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to load certificate: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchCertificate();
    }
  }, [params.id, fetchCertificate]);

  useEffect(() => {
    // Generate QR code for certificate URL
    const generateQRCode = async () => {
      try {
        const certificateUrl = `https://explorer.solana.com/tx/${certificate?.certificate_hash}?cluster=devnet`;
        const qrDataUrl = await QRCode.toDataURL(certificateUrl, {
          width: 128,
          margin: 2,
          color: {
            dark: "#FFFFFF",
            light: "#000000",
          },
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    if (typeof window !== "undefined" && certificate?.certificate_hash) {
      generateQRCode();
    }
  }, [certificate]);

  const downloadAsPNG = async () => {
    if (!certificateRef.current) return;

    try {
      setDownloading("png");

      // Add print class to optimize for download
      certificateRef.current.classList.add("print-mode");

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });

      // Remove print class
      certificateRef.current.classList.remove("print-mode");

      const link = document.createElement("a");
      link.download = `certificate-${certificate?.student_name?.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success("Certificate downloaded as PNG!");
    } catch (error) {
      console.error("Error downloading PNG:", error);
      toast.error("Failed to download PNG");
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsPDF = async () => {
    if (!certificateRef.current) return;

    try {
      setDownloading("pdf");

      // Add print class to optimize for download
      certificateRef.current.classList.add("print-mode");

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });

      // Remove print class
      certificateRef.current.classList.remove("print-mode");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(
        `certificate-${certificate?.student_name?.replace(/\s+/g, "-")}.pdf`,
      );

      toast.success("Certificate downloaded as PDF!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  };

  const shareCertificate = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${certificate?.student_name}`,
          text: `Check out this certificate for ${certificate?.course_name}`,
          url: url,
        });
      } catch (error) {
        // User cancelled sharing
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Certificate link copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error("Failed to copy link");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading certificate...
          </p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Certificate Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The certificate you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-black dark:text-white">
                EduChain
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificate Display */}
          <div className="lg:col-span-2">
            <div
              ref={certificateRef}
              className="bg-black border-2 border-white/20 rounded-lg shadow-2xl p-12 relative overflow-hidden"
            >
              <style jsx>{`
                .print-mode {
                  position: relative !important;
                  box-shadow: none !important;
                  transform: scale(1) !important;
                }
              `}</style>
              {/* Certificate Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {certificate.institutions?.logo_url && (
                    <Image
                      src={certificate.institutions.logo_url}
                      alt="Institution Logo"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-white border-b border-white/30 pb-2">
                      {certificate.institutions?.name ||
                        certificate.institution_name}
                    </h1>
                    <p className="text-gray-200 text-lg mt-2 font-light">
                      Certificate of Achievement
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="text-center space-y-8 border border-white/10 rounded-lg p-8 bg-gray-950/50">
                <div className="border-l-4 border-white/40 pl-6">
                  <p className="text-xl text-gray-100 mb-3 font-light uppercase tracking-wide">
                    This is to certify that
                  </p>
                  <h2 className="text-5xl font-bold text-white mb-3 tracking-wide text-shadow-lg border-b-2 border-white/20 pb-2 inline-block">
                    {certificate.student_name}
                  </h2>
                  <p className="text-gray-200 text-lg font-medium">
                    Roll No:{" "}
                    <span className="font-mono bg-white/10 px-2 py-1 rounded border border-white/20">
                      {certificate.roll_no}
                    </span>
                  </p>
                </div>

                <div className="border-r-4 border-white/40 pr-6">
                  <p className="text-xl text-gray-100 mb-3 font-light uppercase tracking-wide">
                    has successfully completed the course
                  </p>
                  <h3 className="text-3xl font-bold text-white mb-3 border border-white/30 p-4 rounded bg-gray-900/50">
                    {certificate.course_name}
                  </h3>
                  <p className="text-gray-200 text-lg">
                    Grade:{" "}
                    <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full border border-white/30">
                      {certificate.grade}
                    </span>
                  </p>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-white/20">
                  {/* QR Code on the left */}
                  <div className="flex items-center space-x-4">
                    {qrCodeUrl && (
                      // This div acts as the QR code container. The text and image within it are centered.
                      <div className="border p-10 border-white/20 rounded bg-gray-900/30">
                        <Image
                          src={qrCodeUrl}
                          alt="Certificate QR Code"
                          width={100}
                          height={100}
                          className="w-20 h-20"
                        />
                        <p className="text-xs text-gray-300 text-center mt-2 uppercase tracking-wider">
                          QR Verify
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Date and Certificate ID on the right */}
                  <div className="flex flex-col space-y-4">
                    <div className="border border-white/20 p-2 rounded bg-gray-900/30">
                      <p className="text-sm text-gray-300 uppercase tracking-wider">
                        Issue Date
                      </p>
                      <p className="font-bold text-white text-lg">
                        {new Date(certificate.issued_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="border border-white/20 p-4 rounded bg-gray-900/30">
                      <p className="text-sm text-gray-300 uppercase tracking-wider">
                        Certificate ID
                      </p>
                      <p className="font-bold text-white font-mono text-sm">
                        {certificate.certificate_hash?.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-6 left-6 w-20 h-20 border-t-4 border-l-4 border-white/40 opacity-60"></div>
              <div className="absolute top-6 right-6 w-20 h-20 border-t-4 border-r-4 border-white/40 opacity-60"></div>
              <div className="absolute bottom-6 left-6 w-20 h-20 border-b-4 border-l-4 border-white/40 opacity-60"></div>
              <div className="absolute bottom-6 right-6 w-20 h-20 border-b-4 border-r-4 border-white/40 opacity-60"></div>

              {/* Additional decorative lines */}
              <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-white/20 via-transparent to-white/20"></div>
              <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-white/20 via-transparent to-white/20"></div>
              <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-white/20 via-transparent to-white/20"></div>
              <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-white/20 via-transparent to-white/20"></div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Verification Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Blockchain Status
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    Verified ✓
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Institution
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    Verified ✓
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Revocation Status
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    Valid ✓
                  </span>
                </div>

                {certificate.certificate_hash && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Certificate Hash
                    </p>
                    <p className="text-xs font-mono bg-black border border-white/30 p-3 rounded break-all text-gray-200">
                      {certificate.certificate_hash}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Download Options */}
                <div className="space-y-2">
                  <Button
                    onClick={downloadAsPNG}
                    disabled={downloading === "png"}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading === "png" ? "Downloading..." : "Download PNG"}
                  </Button>

                  <Button
                    onClick={downloadAsPDF}
                    disabled={downloading === "pdf"}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading === "pdf" ? "Downloading..." : "Download PDF"}
                  </Button>
                </div>

                {/* Share */}
                <Button
                  onClick={shareCertificate}
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Certificate
                </Button>

                {/* View on Blockchain */}
                {certificate.certificate_hash && (
                  <a
                    href={`https://explorer.solana.com/tx/${certificate.certificate_hash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Blockchain
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Certificate Info */}
            <Card>
              <CardHeader>
                <CardTitle>Certificate Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Student Name
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {certificate.student_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Roll Number
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {certificate.roll_no}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Course
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {certificate.course_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Grade
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {certificate.grade}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Issue Date
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {new Date(certificate.issued_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Institution
                  </label>
                  <p className="text-sm text-black dark:text-white">
                    {certificate.institutions?.name ||
                      certificate.institution_name}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
