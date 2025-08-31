"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import {
  CheckCircle,
  XCircle,
  User,
  Building,
  Shield,
  Award,
} from "lucide-react";

export default function NavTestPage() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
            Navigation Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the unified navigation bar with different user roles and
            connection states
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span>Wallet Connection Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Status:</span>{" "}
                {connected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">Not Connected</span>
                )}
              </p>
              {connected && publicKey && (
                <p>
                  <span className="font-medium">Public Key:</span>{" "}
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {publicKey.toString().slice(0, 8)}...
                    {publicKey.toString().slice(-8)}
                  </code>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Expected Behavior */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expected Navigation Behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connected && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Not Connected
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Should show: Home, Gallery, Register University
                  </p>
                </div>
              </div>
            )}

            {connected && (
              <>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Student Account
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Should show: Home, My Certificates, Verify Certificate
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Building className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      University Account
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Should show: Home, Dashboard, Certificates, Debug (+ Admin
                      if admin wallet)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100">
                      Admin Account
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Should show all university features + Admin panel access
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Testing Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">
                  1. Test Wallet Connection
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                  <li>Connect your wallet using the button in the navbar</li>
                  <li>Observe how the navigation links change</li>
                  <li>Disconnect and reconnect to test state changes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Test Role Detection</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                  <li>
                    If registered as university: Should show Dashboard,
                    Certificates
                  </li>
                  <li>If not registered: Should show student navigation</li>
                  <li>Check if user status indicator appears correctly</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Test Navigation Links</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                  <li>Click each navigation link to ensure routing works</li>
                  <li>Check active link highlighting</li>
                  <li>Test mobile menu functionality (on smaller screens)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Test Theme Toggle</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                  <li>Toggle between light and dark themes</li>
                  <li>Check that navbar styling updates correctly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links for Testing */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Quick navigation test links:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Dashboard
            </Link>
            <Link
              href="/collectables"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Collectables
            </Link>
            <Link
              href="/verify"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Verify
            </Link>
            <Link
              href="/admin"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Admin
            </Link>
            <Link
              href="/cert-debug"
              className="text-blue-500 hover:underline text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              Debug
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
