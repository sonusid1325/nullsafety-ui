"use client";

import React, { useEffect, useState, useRef } from "react";
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

  useEffect(() => {
    fetchCertificate();
  }, [certificateId]);

  const fetchCertificate = async () => {
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
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${certificate?.student_name}`,
          text: `View ${certificate?.student_name}'s certificate for ${certificate?.course_name}`,
          url,
        });
      } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      const imageUrl = await uploadCertificateImage(imageBlob, certificate.id);

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
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Digital Certificate
            </h1>
            <p className="text-gray-600">
              Blockchain-verified academic credential
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <WalletMultiButton />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificate Display */}
          <div className="lg:col-span-2">
            <div
              ref={certificateRef}
              className="bg-white rounded-lg shadow-lg p-12 border-8 border-blue-100"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23f0f8ff' fill-opacity='0.1'%3e%3ccircle cx='30' cy='30' r='4'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
              }}
            >
              {/* Certificate Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">
                  CERTIFICATE OF COMPLETION
                </h1>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto"></div>
              </div>

              {/* Certificate Body */}
              <div className="text-center space-y-6">
                <p className="text-lg text-gray-600">This is to certify that</p>

                <h2 className="text-3xl font-serif font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mx-12">
                  {certificate.student_name}
                </h2>

                <p className="text-lg text-gray-600">
                  Roll No:{" "}
                  <span className="font-semibold">{certificate.roll_no}</span>
                </p>

                <p className="text-lg text-gray-600">
                  has successfully completed the course
                </p>

                <h3 className="text-2xl font-serif font-semibold text-blue-700">
                  {certificate.course_name}
                </h3>

                <p className="text-lg text-gray-600">
                  with grade{" "}
                  <span className="font-bold text-green-600">
                    {certificate.grade}
                  </span>
                </p>

                <div className="flex justify-between items-end mt-12 pt-8">
                  <div className="text-left">
                    <div className="w-40 border-b border-gray-400 mb-2"></div>
                    <p className="text-sm text-gray-600">Issued Date</p>
                    <p className="font-semibold">
                      {new Date(certificate.issued_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500">Blockchain Verified</p>
                  </div>

                  <div className="text-right">
                    <div className="w-40 border-b border-gray-400 mb-2"></div>
                    <p className="text-sm text-gray-600">Issued By</p>
                    <p className="font-semibold">
                      {certificate.institution_name}
                    </p>
                  </div>
                </div>

                {/* Certificate Hash */}
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-500">
                    Certificate Hash (Blockchain Proof)
                  </p>
                  <p className="font-mono text-sm text-gray-700 break-all">
                    {certificate.certificate_hash}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {/* Certificate Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle
                    className={`w-5 h-5 ${certificate.is_revoked ? "text-red-500" : "text-green-500"}`}
                  />
                  <span>Certificate Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`font-semibold ${certificate.is_revoked ? "text-red-600" : "text-green-600"}`}
                >
                  {certificate.is_revoked ? "Revoked" : "Valid & Verified"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Last verified on blockchain
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Certificate
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleDownloadPNG}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PNG
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    size="sm"
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
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                          <Award className="w-4 h-4 mr-2" />
                          Mint as NFT
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mint Certificate NFT</DialogTitle>
                          <DialogDescription>
                            This will create an NFT version of this certificate
                            and send it to the student's wallet.
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
                              className="w-full"
                            >
                              {minting ? "Minting..." : "Mint NFT"}
                            </Button>
                          ) : (
                            <p className="text-sm text-red-600">
                              Student wallet address required to mint NFT.
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Connect wallet to mint NFT
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success Dialog */}
            {mintSuccess && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">
                    NFT Minted Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Transaction:</strong>{" "}
                      <a
                        href={`https://solscan.io/tx/${mintSuccess.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {mintSuccess.signature}
                      </a>
                    </p>
                    <p>
                      <strong>NFT Address:</strong>{" "}
                      <a
                        href={`https://solscan.io/token/${mintSuccess.nftAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {mintSuccess.nftAddress}
                      </a>
                    </p>
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
