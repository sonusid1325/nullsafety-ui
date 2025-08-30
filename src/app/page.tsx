"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Award,
  Shield,
  Zap,
  Users,
  CheckCircle,
  Globe,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                CertifyChain
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                How it Works
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/theme-demo"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Theme Demo
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Blockchain-Powered Certificate Verification</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Issue & Verify
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              Digital Certificates
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            Create tamper-proof digital certificates on Solana blockchain.
            Enable instant verification, NFT minting, and build trust in digital
            credentials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {connected ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <WalletMultiButton />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect wallet to get started
                </p>
              </div>
            )}

            <Link href="/theme-demo">
              <Button variant="outline" size="lg">
                View Theme Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 px-4 bg-white/50 dark:bg-gray-800/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose CertifyChain?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Revolutionary features that make certificate management simple,
              secure, and future-ready
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Blockchain Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Immutable certificates stored on Solana blockchain ensure
                  tamper-proof verification and permanent record keeping.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Instant Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Verify certificates in seconds with cryptographic proof. No
                  more waiting for manual verification processes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>NFT Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Transform certificates into NFTs for enhanced portability,
                  ownership proof, and integration with Web3 platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle>Multi-Institution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Support multiple educational institutions with role-based
                  access control and institutional verification.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Global Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Share and verify certificates globally with permanent URLs and
                  cross-platform compatibility.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow dark:bg-gray-800">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Easy Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Simple APIs and webhooks for seamless integration with
                  existing student management systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Simple process from certificate creation to blockchain
              verification
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Create Certificate
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Institution creates digital certificate with student details,
                course information, and grades through our dashboard.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Blockchain Storage
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Certificate data is hashed and stored on Solana blockchain,
                creating an immutable record with cryptographic proof.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4 dark:text-white">
                Share & Verify
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Students receive shareable certificates with QR codes. Anyone
                can instantly verify authenticity using blockchain data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Revolutionize Your Certificates?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join institutions worldwide in creating secure, verifiable digital
            certificates
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {connected ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Start Issuing Certificates
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <WalletMultiButton />
                <p className="text-sm opacity-80">
                  Connect your wallet to begin
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">CertifyChain</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Blockchain-powered certificate verification system for the
                digital age.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400 dark:text-gray-500">
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-white">
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link href="/theme-demo" className="hover:text-white">
                    Theme Demo
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400 dark:text-gray-500">
                <li>
                  <a href="#" className="hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Built on</h3>
              <ul className="space-y-2 text-sm text-gray-400 dark:text-gray-500">
                <li>Solana Blockchain</li>
                <li>Metaplex Protocol</li>
                <li>Anchor Framework</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 dark:border-gray-700 pt-8 mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
            <p>
              &copy; 2024 CertifyChain. Built for educational verification on
              blockchain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
