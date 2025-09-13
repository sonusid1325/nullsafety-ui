"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { supabase, Institution } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

// Admin wallet addresses that can access this panel
const ADMIN_WALLETS = [
  "BYQ7mNMX1UWjaC4yZ9KQFRsNSTyTf84FrkpgcpKorcky", // Replace with actual admin wallet addresses
  "ADMIN_WALLET_ADDRESS_2",
];

interface ExtendedInstitution extends Institution {
  type?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  description?: string;
  established_year?: number;
  accreditation?: string;
  verification_requested_at?: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
}

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const [institutions, setInstitutions] = useState<ExtendedInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("pending");

  const isAdmin =
    connected && publicKey && ADMIN_WALLETS.includes(publicKey.toString());

  const fetchInstitutions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .order("verification_requested_at", { ascending: false });

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      toast.error("Failed to fetch institutions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchInstitutions();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchInstitutions]);

  const handleVerifyInstitution = async (institutionId: string) => {
    if (!publicKey) return;

    setActionLoading(institutionId);

    try {
      const { error } = await supabase
        .from("institutions")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: publicKey.toString(),
          rejection_reason: null,
        })
        .eq("id", institutionId);

      if (error) throw error;

      toast.success("Institution verified successfully!");
      fetchInstitutions();
    } catch (error) {
      console.error("Error verifying institution:", error);
      toast.error("Failed to verify institution");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInstitution = async (
    institutionId: string,
    reason: string,
  ) => {
    if (!publicKey) return;

    setActionLoading(institutionId);

    try {
      const { error } = await supabase
        .from("institutions")
        .update({
          is_verified: false,
          verified_at: null,
          verified_by: publicKey.toString(),
          rejection_reason: reason,
        })
        .eq("id", institutionId);

      if (error) throw error;

      toast.success("Institution rejected");
      fetchInstitutions();
    } catch (error) {
      console.error("Error rejecting institution:", error);
      toast.error("Failed to reject institution");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInstitutions = institutions.filter((institution) => {
    switch (filter) {
      case "pending":
        return !institution.is_verified && !institution.rejection_reason;
      case "verified":
        return institution.is_verified;
      case "rejected":
        return !institution.is_verified && institution.rejection_reason;
      default:
        return true;
    }
  });

  if (!connected) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Card className="w-96 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Admin Access Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your admin wallet to access the verification panel
              </p>
              <WalletMultiButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Card className="w-96 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your wallet does not have admin privileges
              </p>
              <Link href="/">
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                  Return Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />

      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Institutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {institutions.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {
                  institutions.filter(
                    (i) => !i.is_verified && !i.rejection_reason,
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {institutions.filter((i) => i.is_verified).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black dark:text-white">
                {
                  institutions.filter(
                    (i) => !i.is_verified && i.rejection_reason,
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8">
          {[
            { key: "pending", label: "Pending", icon: Clock },
            { key: "verified", label: "Verified", icon: CheckCircle },
            { key: "rejected", label: "Rejected", icon: XCircle },
            { key: "all", label: "All", icon: Building },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              onClick={() =>
                setFilter(key as "all" | "pending" | "verified" | "rejected")
              }
              variant={filter === key ? "default" : "outline"}
              className={`flex items-center space-x-2 ${
                filter === key
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        {/* Institutions List */}
        <div className="space-y-6">
          {filteredInstitutions.length === 0 ? (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                    No institutions found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No institutions match the current filter criteria
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredInstitutions.map((institution) => (
              <Card
                key={institution.id}
                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center">
                        <Building className="w-6 h-6 text-white dark:text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-black dark:text-white">
                          {institution.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{institution.location}</span>
                          {institution.type && (
                            <>
                              <span>•</span>
                              <span>{institution.type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {institution.is_verified ? (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      ) : institution.rejection_reason ? (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-full text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Rejected</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Institution Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {institution.contact_email && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{institution.contact_email}</span>
                      </div>
                    )}
                    {institution.contact_phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{institution.contact_phone}</span>
                      </div>
                    )}
                    {institution.website && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Globe className="w-4 h-4" />
                        <a
                          href={institution.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-black dark:hover:text-white underline"
                        >
                          {institution.website}
                        </a>
                      </div>
                    )}
                    {institution.established_year && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Established {institution.established_year}</span>
                      </div>
                    )}
                  </div>

                  {institution.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {institution.description}
                    </p>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        <p>
                          Wallet: {institution.authority_wallet.slice(0, 8)}...
                          {institution.authority_wallet.slice(-4)}
                        </p>
                        <p>
                          Requested:{" "}
                          {institution.verification_requested_at
                            ? new Date(
                                institution.verification_requested_at,
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>

                      {!institution.is_verified &&
                        !institution.rejection_reason && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                handleRejectInstitution(
                                  institution.id,
                                  "Does not meet requirements",
                                )
                              }
                              disabled={actionLoading === institution.id}
                              variant="outline"
                              size="sm"
                              className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              onClick={() =>
                                handleVerifyInstitution(institution.id)
                              }
                              disabled={actionLoading === institution.id}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {actionLoading === institution.id ? (
                                "Processing..."
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                      {institution.rejection_reason && (
                        <div className="text-right">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Reason: {institution.rejection_reason}
                          </p>
                          <Button
                            onClick={() =>
                              handleVerifyInstitution(institution.id)
                            }
                            disabled={actionLoading === institution.id}
                            size="sm"
                            className="mt-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                          >
                            Override & Verify
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
