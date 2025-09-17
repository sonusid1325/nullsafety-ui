"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  Bug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Wifi,
  Shield,
  User,
  Copy,
  Download,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  runFullVerification,
  generateDiagnosticReport,
  DbVerificationResult,
} from "@/lib/dbVerification";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";

interface RegistrationDetails {
  institutionName?: string;
  isVerified?: boolean;
  registeredAt?: string;
}

export default function DebugPage() {
  const { connected, publicKey } = useWallet();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{
    connection: DbVerificationResult;
    tableStructure: DbVerificationResult;
    rlsPolicies?: DbVerificationResult;
    existingRegistration?: DbVerificationResult;
    overallSuccess: boolean;
    environment?: {
      supabaseUrl: { exists: boolean; valid: boolean; value: string };
      supabaseKey: { exists: boolean; valid: boolean; value: string };
    };
  } | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<string>("");
  const [envCheck, setEnvCheck] = useState<{
    supabaseUrl: { exists: boolean; valid: boolean; value: string };
    supabaseKey: { exists: boolean; valid: boolean; value: string };
  } | null>(null);

  const checkEnvironmentVariables = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const envResults = {
      supabaseUrl: {
        exists: !!supabaseUrl,
        valid: !!(supabaseUrl && supabaseUrl.includes("supabase")),
        value: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "Not set",
      },
      supabaseKey: {
        exists: !!supabaseKey,
        valid: !!(supabaseKey && supabaseKey.length > 50),
        value: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : "Not set",
      },
    };

    setEnvCheck(envResults);
    return envResults;
  };

  const runDiagnostics = async () => {
    setRunning(true);
    try {
      // Check environment variables
      const envResults = checkEnvironmentVariables();

      // Run database verification
      const dbResults = await runFullVerification(publicKey?.toString());

      // Generate diagnostic report
      const report = generateDiagnosticReport({
        connection: dbResults.connection,
        tableStructure: dbResults.tableStructure,
        ...(dbResults.rlsPolicies && { rlsPolicies: dbResults.rlsPolicies }),
        ...(dbResults.existingRegistration && {
          existingRegistration: dbResults.existingRegistration,
        }),
      });

      setResults({ ...dbResults, environment: envResults });
      setDiagnosticReport(report);

      if (
        dbResults.overallSuccess &&
        envResults.supabaseUrl.valid &&
        envResults.supabaseKey.valid
      ) {
        toast.success("All diagnostics passed! ✅");
      } else {
        toast.error("Issues found - check the results below");
      }
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast.error("Failed to run diagnostics");
    } finally {
      setRunning(false);
    }
  };

  const copyReport = () => {
    navigator.clipboard.writeText(diagnosticReport);
    toast.success("Diagnostic report copied to clipboard");
  };

  const downloadReport = () => {
    const blob = new Blob([diagnosticReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `educhain-diagnostic-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Diagnostic report downloaded");
  };

  const testManualRegistration = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const testData = {
        name: `Test Institution ${Date.now()}`,
        location: "Test City, Test State",
        authority_wallet: publicKey.toString(),
        contact_email: "test@example.edu",
        type: "University",
        is_verified: false,
        verification_requested_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("institutions")
        .insert([testData])
        .select();

      if (error) {
        toast.error(`Manual registration test failed: ${error.message}`);
        console.error("Registration error:", error);
        return;
      }

      if (data && data.length > 0) {
        // Clean up test data
        await supabase.from("institutions").delete().eq("id", data[0].id);

        toast.success("Manual registration test passed! ✅");
      }
    } catch (error) {
      toast.error("Manual registration test failed");
      console.error("Manual test error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                <Bug className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-black dark:text-white">
                  EduChain Debug Console
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Registration & Database Diagnostics
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
                href="/collectables"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm"
              >
                Collectables
              </Link>

              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="text-black dark:text-white flex items-center space-x-2">
                <Bug className="w-5 h-5" />
                <span>Diagnostic Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={runDiagnostics}
                  disabled={running}
                  className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  {running ? "Running..." : "Run Full Diagnostics"}
                </Button>

                <Button
                  onClick={testManualRegistration}
                  disabled={!connected}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  Test Manual Registration
                </Button>

                <Button
                  onClick={checkEnvironmentVariables}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  Check Environment
                </Button>

                {diagnosticReport && (
                  <>
                    <Button
                      onClick={copyReport}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-700"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Report
                    </Button>
                    <Button
                      onClick={downloadReport}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environment Variables Check */}
        {envCheck && (
          <div className="mb-8">
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader>
                <CardTitle className="text-black dark:text-white flex items-center space-x-2">
                  <Wifi className="w-5 h-5" />
                  <span>Environment Variables</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded">
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      NEXT_PUBLIC_SUPABASE_URL
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {envCheck.supabaseUrl.value}
                    </p>
                  </div>
                  {envCheck.supabaseUrl.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded">
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {envCheck.supabaseKey.value}
                    </p>
                  </div>
                  {envCheck.supabaseKey.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wallet Status */}
        <div className="mb-8">
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="text-black dark:text-white flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Wallet Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span className="text-black dark:text-white">
                    {connected ? "Connected" : "Not Connected"}
                  </span>
                </div>

                {connected && publicKey && (
                  <div className="text-sm">
                    <p className="text-gray-600 dark:text-gray-400">Address:</p>
                    <p className="font-mono text-black dark:text-white break-all">
                      {publicKey.toString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostic Results */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Connection Test */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-black dark:text-white flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Database Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  {results.connection.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {results.connection.success ? "Connected" : "Failed"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {results.connection.message}
                </p>
              </CardContent>
            </Card>

            {/* Table Structure */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-black dark:text-white flex items-center space-x-2">
                  <Award className="w-4 h-4" />
                  <span>Table Structure</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  {results.tableStructure.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {results.tableStructure.success ? "Valid" : "Invalid"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {results.tableStructure.message}
                </p>
              </CardContent>
            </Card>

            {/* RLS Policies */}
            {results.rlsPolicies && (
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-black dark:text-white flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>RLS Policies</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-2">
                    {results.rlsPolicies.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium">
                      {results.rlsPolicies.success ? "Working" : "Issues"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {results.rlsPolicies.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Registration Status */}
            {results.existingRegistration && (
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-black dark:text-white flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Registration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-2">
                    {(
                      results.existingRegistration
                        .details as RegistrationDetails
                    )?.institutionName ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <span className="text-sm font-medium">
                      {(
                        results.existingRegistration
                          .details as RegistrationDetails
                      )?.institutionName
                        ? "Registered"
                        : "Available"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {results.existingRegistration.message}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Diagnostic Report */}
        {diagnosticReport && (
          <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <CardHeader>
              <CardTitle className="text-black dark:text-white">
                Full Diagnostic Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                {diagnosticReport}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Quick Fixes */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black mt-8">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">
              Common Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                Database Connection Issues
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>
                  • Check your .env.local file has correct Supabase URL and key
                </li>
                <li>• Verify your Supabase project is active</li>
                <li>• Test internet connection</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                Table Structure Issues
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Run the complete SQL schema from supabase-schema.sql</li>
                <li>
                  • Check that all columns exist in the institutions table
                </li>
                <li>• Verify column names match exactly</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                RLS Policy Issues
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>
                  • Temporarily disable RLS: ALTER TABLE institutions DISABLE
                  ROW LEVEL SECURITY;
                </li>
                <li>• Or set up proper policies for authenticated users</li>
                <li>
                  • Re-enable RLS after testing: ALTER TABLE institutions ENABLE
                  ROW LEVEL SECURITY;
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                Registration Already Exists
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use a different wallet address</li>
                <li>• Check your existing registration in the dashboard</li>
                <li>• Contact admin to reset if needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="mt-8 text-center space-x-4">
          <Link href="/register-university">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
            >
              Try Registration
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
            >
              Back to Home
            </Button>
          </Link>
          <a
            href="https://github.com/educhain/certificate-verification/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
            >
              Report Issue
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
