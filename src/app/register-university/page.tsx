"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  Building,
  Wallet,
  CheckCircle,
  ArrowRight,
  Shield,
  Users,
  FileCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Navbar } from "@/components/Navbar";

// Debug utility to test database connection
const testDatabaseConnection = async () => {
  try {
    console.log("Testing database connection...");

    // Test basic connection
    const { error } = await supabase.from("institutions").select("id").limit(1);

    if (error) {
      console.error("Database connection test failed:", error);
      return false;
    }

    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
};

// Debug utility to check table structure
const checkTableStructure = async () => {
  try {
    console.log("Checking institutions table structure...");

    // Try to get table info by attempting to select with all expected columns
    const { error } = await supabase
      .from("institutions")
      .select(
        `
        id,
        name,
        location,
        authority_wallet,
        type,
        website,
        contact_email,
        contact_phone,
        description,
        established_year,
        accreditation,
        is_verified,
        verification_requested_at,
        verified_at,
        verified_by,
        rejection_reason,
        created_at,
        updated_at
      `,
      )
      .limit(0);

    if (error) {
      console.error("Table structure check failed:", error);
      console.error("Missing or incorrect columns in institutions table");
      return false;
    }

    console.log("Table structure check passed");
    return true;
  } catch (error) {
    console.error("Table structure error:", error);
    return false;
  }
};

interface UniversityFormData {
  name: string;
  location: string;
  type: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  established_year: string;
  accreditation: string;
}

export default function RegisterUniversityPage() {
  const { connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [formData, setFormData] = useState<UniversityFormData>({
    name: "",
    location: "",
    type: "University",
    website: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    established_year: "",
    accreditation: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Institution name is required");
      return false;
    }
    if (!formData.location.trim()) {
      toast.error("Location is required");
      return false;
    }
    if (!formData.contact_email.trim()) {
      toast.error("Contact email is required");
      return false;
    }
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return false;
    }

    // Additional validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (
      formData.established_year &&
      (parseInt(formData.established_year) < 1800 ||
        parseInt(formData.established_year) > new Date().getFullYear())
    ) {
      toast.error("Please enter a valid establishment year");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log("Starting registration process...");
      console.log("Wallet address:", publicKey!.toString());
      console.log("Form data:", formData);

      // Check if wallet is already registered
      const { data: existingInstitution, error: checkError } = await supabase
        .from("institutions")
        .select("*")
        .eq("authority_wallet", publicKey!.toString())
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing institution:", checkError);
        toast.error(`Database check failed: ${checkError.message}`);
        return;
      }

      if (existingInstitution) {
        console.log("Existing institution found:", existingInstitution);
        toast.error("This wallet is already registered with an institution");
        setLoading(false);
        return;
      }

      console.log(
        "No existing institution found, proceeding with registration...",
      );

      // Prepare data for insertion
      const institutionData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        authority_wallet: publicKey!.toString(),
        type: formData.type,
        website: formData.website.trim() || null,
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone.trim() || null,
        description: formData.description.trim() || null,
        established_year: formData.established_year
          ? parseInt(formData.established_year)
          : null,
        accreditation: formData.accreditation.trim() || null,
        is_verified: false,
        verification_requested_at: new Date().toISOString(),
      };

      console.log("Institution data to insert:", institutionData);

      // Register the institution
      const { data: insertedData, error: insertError } = await supabase
        .from("institutions")
        .insert([institutionData])
        .select();

      if (insertError) {
        console.error("Registration error details:", insertError);
        console.error("Error code:", insertError.code);
        console.error("Error hint:", insertError.hint);
        console.error("Error details:", insertError.details);

        // Provide more specific error messages
        if (insertError.code === "23505") {
          toast.error("This wallet address is already registered");
        } else if (insertError.code === "23502") {
          toast.error(
            "Missing required field. Please fill all required information.",
          );
        } else if (insertError.message.includes("RLS")) {
          toast.error("Database permission error. Please contact support.");
        } else {
          toast.error(`Registration failed: ${insertError.message}`);
        }
        return;
      }

      console.log("Registration successful:", insertedData);
      toast.success(
        "Institution registered successfully! Awaiting verification.",
      );
      setSubmitted(true);
    } catch (error: unknown) {
      console.error("Unexpected error:", error);

      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const runDatabaseTests = async () => {
    setConnectionStatus("Testing connection...");

    const connectionOk = await testDatabaseConnection();
    const structureOk = await checkTableStructure();

    if (connectionOk && structureOk) {
      setConnectionStatus("✅ Database connection and structure OK");
    } else if (connectionOk && !structureOk) {
      setConnectionStatus(
        "⚠️ Connection OK, but table structure issues detected",
      );
    } else {
      setConnectionStatus("❌ Database connection failed");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <Toaster position="top-right" />
        <Navbar />

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
                    EduChain
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    University Registration
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
                >
                  Home
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-16">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white dark:text-black" />
              </div>

              <h2 className="text-2xl font-bold text-black dark:text-white mb-4">
                Registration Submitted!
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Your institution registration has been submitted successfully.
                Our team will review and verify your institution within 1-2
                business days.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span>Security review in progress</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileCheck className="w-4 h-4" />
                  <span>Document verification pending</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>Admin approval required</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-gray-300 dark:border-gray-700"
                  >
                    Return Home
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster position="top-right" />
      <Navbar />

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
                  EduChain
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  University Registration
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Dashboard
              </Link>
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Building className="w-8 h-8 text-white dark:text-black" />
          </div>

          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Register Your Institution
          </h1>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join the blockchain revolution in educational verification. Register
            your university or institution to start issuing tamper-proof
            certificates.
          </p>
        </div>

        {!connected ? (
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardContent className="py-16 text-center">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Connect your institutional wallet to register as a
                certificate-issuing authority.
              </p>
              <WalletMultiButton />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Debug Panel */}
            {debugMode && (
              <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
                <CardHeader>
                  <CardTitle className="text-yellow-800 dark:text-yellow-200 text-sm">
                    Debug Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={runDatabaseTests}
                      size="sm"
                      variant="outline"
                      className="border-yellow-300 dark:border-yellow-700"
                    >
                      Test Database Connection
                    </Button>
                    {connectionStatus && (
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {connectionStatus}
                      </p>
                    )}
                  </div>

                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Wallet:</strong>{" "}
                      {publicKey?.toString() || "Not connected"}
                    </p>
                    <p>
                      <strong>Form Valid:</strong>{" "}
                      {validateForm() ? "✅" : "❌"}
                    </p>
                    <p>
                      <strong>Required Fields:</strong> Name:{" "}
                      {formData.name ? "✅" : "❌"}, Location:{" "}
                      {formData.location ? "✅" : "❌"}, Email:{" "}
                      {formData.contact_email ? "✅" : "❌"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Registration Form */}
              <div className="lg:col-span-2">
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-black dark:text-white">
                        Institution Information
                      </CardTitle>
                      <Button
                        onClick={() => setDebugMode(!debugMode)}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-gray-500 dark:text-gray-400"
                      >
                        {debugMode ? "Hide Debug" : "Debug Mode"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Institution Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            placeholder="University of Technology"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Type
                          </label>
                          <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          >
                            <option value="University">University</option>
                            <option value="College">College</option>
                            <option value="Institute">Institute</option>
                            <option value="School">School</option>
                            <option value="Academy">Academy</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          placeholder="San Francisco, CA, USA"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Website
                          </label>
                          <input
                            type="url"
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            placeholder="https://university.edu"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Established Year
                          </label>
                          <input
                            type="number"
                            name="established_year"
                            value={formData.established_year}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            placeholder="1965"
                            min="1800"
                            max={new Date().getFullYear()}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Contact Email *
                          </label>
                          <input
                            type="email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            placeholder="admin@university.edu"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-black dark:text-white mb-2">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-2">
                          Accreditation
                        </label>
                        <input
                          type="text"
                          name="accreditation"
                          value={formData.accreditation}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          placeholder="ABET, WASC, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-black dark:text-white"
                          placeholder="Brief description of your institution..."
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                      >
                        {loading ? "Registering..." : "Register Institution"}
                        {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Info Panel */}
              <div className="space-y-6">
                {/* Wallet Info */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                  <CardHeader>
                    <CardTitle className="text-black dark:text-white text-sm">
                      Connected Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Authority Address
                      </p>
                      <p className="font-mono text-xs text-black dark:text-white break-all">
                        {publicKey?.toString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Process Steps */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                  <CardHeader>
                    <CardTitle className="text-black dark:text-white text-sm">
                      Verification Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-black dark:bg-white rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white dark:text-black text-xs font-bold">
                          1
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">
                          Submit Registration
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Complete the form with accurate information
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-gray-400 text-xs font-bold">
                          2
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">
                          Admin Review
                        </p>
                        <p className="text-xs text-gray-500">
                          1-2 business days review period
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-gray-400 text-xs font-bold">
                          3
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">
                          Start Issuing
                        </p>
                        <p className="text-xs text-gray-500">
                          Begin creating certificates
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Benefits */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                  <CardHeader>
                    <CardTitle className="text-black dark:text-white text-sm">
                      Why Register?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-black dark:text-white" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Blockchain security
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-black dark:text-white" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Instant verification
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-black dark:text-white" />
                      <span className="text-gray-600 dark:text-gray-400">
                        NFT capabilities
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-black dark:text-white" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Global recognition
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
