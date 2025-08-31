"use client";

import React, { useState, useEffect } from "react";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  Calendar,
  GraduationCap,
  School,
  User,
  ExternalLink,
} from "lucide-react";
import { supabase, Certificate } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

interface UserCertificate extends Certificate {
  institutions?: {
    name: string;
    logo_url?: string;
  };
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserCertificates();
  }, []);

  const fetchUserCertificates = async () => {
    try {
      setLoading(true);

      // Fetch all certificates (public view)
      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          *,
          institutions (
            name,
            logo_url
          )
        `,
        )
        .eq("is_revoked", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCertificates(data || []);

      if (data && data.length > 0) {
        toast.success(
          `Found ${data.length} certificate${data.length === 1 ? "" : "s"}`,
        );
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const CertificateCard = ({
    certificate,
  }: {
    certificate: UserCertificate;
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {certificate.institutions?.logo_url ? (
              <Image
                src={certificate.institutions.logo_url}
                alt="Institution Logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <School className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg font-semibold">
                {certificate.course_name}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {certificate.institutions?.name || certificate.university_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                Verified
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {certificate.student_name}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Grade: {certificate.grade}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(certificate.issue_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Roll: {certificate.roll_no}
            </span>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Link href={`/cert/${certificate.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Certificate
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                  <Award className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h1 className="text-xl font-bold text-black dark:text-white">
                  NullSafety
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            Certificate Gallery
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse all verified certificates issued by institutions
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading your certificates...
            </p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              No Certificates Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              No certificates have been issued by institutions yet. Check back
              later as new certificates are added to the system.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={fetchUserCertificates} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400">
                {certificates.length} certificate
                {certificates.length === 1 ? "" : "s"} found
              </p>
              <Button
                onClick={fetchUserCertificates}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
