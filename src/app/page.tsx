"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Award,
  Shield,
  Zap,
  Users,
  CheckCircle,
  Globe,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black dark:text-white mb-8 tracking-tight">
            EduChain Certificate
            <br />
            Verification System
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Built by Team EduChain - Create tamper-proof digital certificates on
            Solana blockchain. Enable instant verification and build trust in
            digital credentials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {connected ? (
              <Link href="/dashboard">
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-3 text-sm">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <WalletMultiButton />
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Connect wallet to get started
                </p>
              </div>
            )}

            <Link href="/theme-demo">
              <Button
                variant="outline"
                className="px-8 py-3 text-sm border-gray-300 dark:border-gray-700"
              >
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-24 px-6 border-t border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
              Simple. Secure. Verifiable.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need for modern certificate management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <Shield className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  Blockchain Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Immutable certificates stored on Solana blockchain ensure
                  tamper-proof verification and permanent record keeping.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <Zap className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  Instant Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Verify certificates in seconds with cryptographic proof. No
                  more waiting for manual verification processes.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <Award className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  NFT Certificates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Transform certificates into NFTs for enhanced portability,
                  ownership proof, and integration with Web3 platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <Users className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  Multi-Institution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Support multiple educational institutions with role-based
                  access control and institutional verification.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <Globe className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  Global Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Share and verify certificates globally with permanent URLs and
                  cross-platform compatibility.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              <CardHeader className="pb-4">
                <CheckCircle className="w-6 h-6 text-black dark:text-white mb-3" />
                <CardTitle className="text-lg text-black dark:text-white">
                  Easy Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Simple APIs and webhooks for seamless integration with
                  existing student management systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join institutions worldwide in creating secure, verifiable digital
            certificates on the blockchain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {connected ? (
              <Link href="/dashboard">
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-3 text-sm">
                  Start Issuing Certificates
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <WalletMultiButton />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect your wallet to begin
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center">
                  <Award className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="font-medium text-black dark:text-white">
                  EduChain
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Team EduChain&apos;s blockchain-powered certificate verification
                for the digital age.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-black dark:text-white mb-4">
                Platform
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <Link
                    href="/register-university"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Register University
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collectables"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Collectables
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/theme-demo"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Demo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/debug"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Debug
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mint-debug"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Mint Debug
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-black dark:text-white mb-4">
                Resources
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-black dark:hover:text-white"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-black dark:text-white mb-4">
                Built on
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Solana Blockchain</li>
                <li>Metaplex Protocol</li>
                <li>Anchor Framework</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 Team EduChain. Built for educational verification on
              blockchain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
