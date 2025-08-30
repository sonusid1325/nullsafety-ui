"use client";

import React from "react";
import { ThemeDemo } from "@/components/ThemeDemo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Award } from "lucide-react";

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
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
                  NullSafety Theme Demo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Minimal black and white design system
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Design System Demo
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience our minimal black and white design system inspired by
            Vercel&apos;s aesthetic. Clean, functional, and accessible.
          </p>
        </div>

        <ThemeDemo />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center">
                  <Award className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="font-medium text-black dark:text-white">
                  NullSafety
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Minimal design system for blockchain certificate verification
              </p>
            </div>

            <div>
              <h3 className="font-medium text-black dark:text-white mb-4">
                Navigation
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <Link
                    href="/"
                    className="hover:text-black dark:hover:text-white"
                  >
                    Home
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
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-black dark:text-white mb-4">
                Theme
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Switch between light and dark modes
              </p>
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 Team NullSafety. Minimal design for maximum impact.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
