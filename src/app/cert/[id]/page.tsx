"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "@/components/ui/dialog";
import {
  Download,
  Share2,
  Award,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { supabase, Certificate } from "@/lib/supabase";
import {
  mintCertificateNFT,
  generateCertificateImageFromDOM,
  uploadCertificateImage,
  CertificateNFTMetadata,
} from "@/lib/mintCertificateNFT";
import toast, { Toaster } from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CertificatePage() {
  const params = useParams();
  const { connected, publicKey, wallet } = useWallet();
  const certificateRef = useRef<HTMLDivElement>(null);

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState<{
    signature: string;
    nftAddress: string;
  } | null>(null);

  const certificateId = params.id as string;

  const fetchCertificate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", certificateId)
        .single();

      if (error) throw error;

      setCertificate(data);
    } catch (error) {
      console.error("Error fetching certificate:", error);
      toast.error("Certificate not found");
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    fetchCertificate();
  }, [certificateId, fetchCertificate]);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${certificate?.student_name}`,
          text: `View ${certificate?.student_name}&apos;s certificate for ${certificate?.course_name}`,
          url,
        });
      } catch {
        // Fallback to clipboard
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Certificate link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `certificate-${certificate?.student_name}-${certificate?.course_name}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success("Certificate downloaded as PNG!");
    } catch {
      toast.error("Failed to download certificate");
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(
        `certificate-${certificate?.student_name}-${certificate?.course_name}.pdf`,
      );

      toast.success("Certificate downloaded as PDF!");
    } catch {
      toast.error("Failed to download certificate");
    }
  };

  const handleMintNFT = async () => {
    if (!certificate || !connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!certificate.student_wallet) {
      toast.error(
        "Student wallet address not found. Please update the certificate with student wallet address.",
      );
      return;
    }

    setMinting(true);

    try {
      // Generate certificate image
      const imageBlob = await generateCertificateImageFromDOM(
        certificateRef.current!,
      );

      // Upload image (you'll need to implement the upload endpoint)
      const imageUrl = await uploadCertificateImage(imageBlob);

      const nftMetadata: CertificateNFTMetadata = {
        studentName: certificate.student_name,
        rollNo: certificate.roll_no,
        courseName: certificate.course_name,
        universityName: certificate.institution_name,
        issuedDate: certificate.issued_date,
        certificateHash: certificate.certificate_hash,
        certificateUrl: window.location.href,
        imageUrl,
      };

      const result = await mintCertificateNFT(
        wallet.adapter,
        certificate.student_wallet,
        nftMetadata,
      );

      if (result.success) {
        // Update certificate with NFT mint address
        await supabase
          .from("certificates")
          .update({ nft_mint: result.nftAddress })
          .eq("id", certificate.id);

        setMintSuccess({
          signature: result.signature!,
          nftAddress: result.nftAddress!,
        });

        toast.success("Certificate NFT minted successfully!");
      } else {
        throw new Error(result.error || "Failed to mint NFT");
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mint NFT",
      );
    } finally {
      setMinting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Certificate Not Found
              </h2>
              <p className="text-muted-foreground">
                The requested certificate could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
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
                  NullSafety Certificate
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Blockchain-verified credential
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificate Display */}
          <div className="lg:col-span-2">
            <div
              ref={certificateRef}
              className="bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 rounded-lg p-16"
            >
              {/* Certificate Header */}
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award className="w-8 h-8 text-white dark:text-black" />
                </div>
                <h1 className="text-3xl font-bold text-black dark:text-white mb-4 tracking-wide">
                  CERTIFICATE OF COMPLETION
                </h1>
                <div className="w-24 h-px bg-black dark:bg-white mx-auto"></div>
              </div>

              {/* Certificate Body */}
              <div className="text-center space-y-8">
                <p className="text-gray-600 dark:text-gray-400">
                  This is to certify that
                </p>

                <h2 className="text-4xl font-bold text-black dark:text-white border-b border-gray-300 dark:border-gray-700 pb-3 mx-8">
                  {certificate.student_name}
                </h2>

                <p className="text-gray-600 dark:text-gray-400">
                  Roll No:{" "}
                  <span className="font-medium text-black dark:text-white">
                    {certificate.roll_no}
                  </span>
                </p>

                <p className="text-gray-600 dark:text-gray-400">
                  has successfully completed the course
                </p>

                <h3 className="text-2xl font-semibold text-black dark:text-white">
                  {certificate.course_name}
                </h3>

                <p className="text-gray-600 dark:text-gray-400">
                  with grade{" "}
                  <span className="font-medium text-black dark:text-white">
                    {certificate.grade}
                  </span>
                </p>

                <div className="flex justify-between items-end mt-16 pt-8">
                  <div className="text-left">
                    <div className="w-32 border-b border-gray-300 dark:border-gray-700 mb-2"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                      Issued Date
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {new Date(certificate.issued_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="w-6 h-6 text-white dark:text-black" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                      Verified
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="w-32 border-b border-gray-300 dark:border-gray-700 mb-2"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                      Issued By
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {certificate.institution_name}
                    </p>
                  </div>
                </div>

                {/* Certificate Hash */}
                <div className="mt-12 p-6 border border-gray-200 dark:border-gray-800 rounded">
                  <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-2">
                    Blockchain Hash
                  </p>
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                    {certificate.certificate_hash}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-4">
            {/* Certificate Status */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-black dark:text-white text-sm font-medium">
                  <CheckCircle
                    className={`w-4 h-4 ${certificate.is_revoked ? "text-gray-400" : "text-black dark:text-white"}`}
                  />
                  <span>Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-black dark:text-white">
                  {certificate.is_revoked ? "Revoked" : "Valid"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Blockchain verified
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-3">
                <CardTitle className="text-black dark:text-white text-sm font-medium">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleDownloadPNG}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PNG
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>

                {/* NFT Minting */}
                {connected ? (
                  certificate.nft_mint ? (
                    <div className="space-y-2">
                      <Button disabled className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        NFT Already Minted
                      </Button>
                      <a
                        href={`https://solscan.io/token/${certificate.nft_mint}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View NFT on Solscan</span>
                      </a>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                          <Award className="w-4 h-4 mr-2" />
                          Mint NFT
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mint Certificate NFT</DialogTitle>
                          <DialogDescription>
                            This will create an NFT version of this certificate
                            and send it to the student&apos;s wallet.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p>
                              <strong>Student:</strong>{" "}
                              {certificate.student_name}
                            </p>
                            <p>
                              <strong>Course:</strong> {certificate.course_name}
                            </p>
                            <p>
                              <strong>Student Wallet:</strong>
                              <span className="font-mono text-sm break-all">
                                {certificate.student_wallet || "Not provided"}
                              </span>
                            </p>
                          </div>

                          {certificate.student_wallet ? (
                            <Button
                              onClick={handleMintNFT}
                              disabled={minting}
                              className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                            >
                              {minting ? "Minting..." : "Mint NFT"}
                            </Button>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Student wallet address required to mint NFT.
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Connect wallet to mint NFT
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success Dialog */}
            {mintSuccess && (
              <Card className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
                <CardHeader>
                  <CardTitle className="text-black dark:text-white text-sm font-medium">
                    NFT Minted Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-500 mb-1">
                        Transaction
                      </p>
                      <a
                        href={`https://solscan.io/tx/${mintSuccess.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 break-all font-mono text-xs"
                      >
                        {mintSuccess.signature}
                      </a>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-500 mb-1">
                        NFT Address
                      </p>
                      <a
                        href={`https://solscan.io/token/${mintSuccess.nftAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 break-all font-mono text-xs"
                      >
                        {mintSuccess.nftAddress}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
