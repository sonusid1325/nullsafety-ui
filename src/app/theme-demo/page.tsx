"use client";

import React from "react";
import { ThemeDemo } from "@/components/ThemeDemo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>

              <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>

              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Theme Demo
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <ThemeDemo />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This demo showcases the complete dark and light theme integration
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href="/cert/demo"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sample Certificate
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
