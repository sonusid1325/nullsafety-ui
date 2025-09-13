"use client";

import React from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Award } from "lucide-react";

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-600">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                <Award className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-black dark:text-white">
                  EduChain Theme Demo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pure black and white design system
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
        <div className="space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-black dark:text-white">
              Pure Black & White Theme
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A minimal, professional design system focused on clarity and
              accessibility. No colors, just pure black, white, and carefully
              selected grays.
            </p>
          </div>

          {/* Color Palette */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white">
              Color Palette
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Light Theme Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-black dark:text-white">
                  Light Theme
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-gray-300 p-4 rounded">
                    <div className="text-black font-medium">Background</div>
                    <div className="text-gray-600 text-sm font-mono">
                      #FFFFFF
                    </div>
                  </div>
                  <div className="bg-black p-4 rounded">
                    <div className="text-white font-medium">Foreground</div>
                    <div className="text-gray-300 text-sm font-mono">
                      #000000
                    </div>
                  </div>
                  <div className="bg-gray-100 border border-gray-300 p-4 rounded">
                    <div className="text-black font-medium">Secondary</div>
                    <div className="text-gray-600 text-sm font-mono">
                      #F5F5F5
                    </div>
                  </div>
                  <div className="bg-gray-600 p-4 rounded">
                    <div className="text-white font-medium">Muted</div>
                    <div className="text-gray-300 text-sm font-mono">
                      #737373
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark Theme Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-black dark:text-white">
                  Dark Theme
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black border border-gray-600 p-4 rounded">
                    <div className="text-white font-medium">Background</div>
                    <div className="text-gray-400 text-sm font-mono">
                      #000000
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 p-4 rounded">
                    <div className="text-black font-medium">Foreground</div>
                    <div className="text-gray-600 text-sm font-mono">
                      #FFFFFF
                    </div>
                  </div>
                  <div className="bg-gray-800 border border-gray-600 p-4 rounded">
                    <div className="text-white font-medium">Secondary</div>
                    <div className="text-gray-400 text-sm font-mono">
                      #0D0D0D
                    </div>
                  </div>
                  <div className="bg-gray-500 p-4 rounded">
                    <div className="text-white font-medium">Muted</div>
                    <div className="text-gray-300 text-sm font-mono">
                      #B3B3B3
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Component Examples */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white">
              Components
            </h2>

            {/* Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-black dark:text-white">
                Buttons
              </h3>
              <div className="flex flex-wrap gap-4">
                <button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded font-medium transition-colors">
                  Primary Button
                </button>
                <button className="bg-gray-100 dark:bg-black border dark:border-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2 rounded font-medium transition-colors">
                  Secondary Button
                </button>
                <button className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 px-4 py-2 rounded font-medium transition-colors">
                  Outline Button
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-black dark:text-white">
                Cards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Card Title
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This is a sample card with clean, minimal styling. Pure
                    black and white design.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Secondary Card
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Using secondary background colors for variation.
                  </p>
                </div>
                <div className="bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Elevated Card
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    With subtle shadow for depth.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Elements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-black dark:text-white">
                Form Elements
              </h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">
                    Text Input
                  </label>
                  <input
                    type="text"
                    placeholder="Enter text..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">
                    Select Dropdown
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-black dark:text-white">
                Status Indicators
              </h3>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Success
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  Error
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Warning
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  Neutral
                </span>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white">
              Typography
            </h2>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-black dark:text-white">
                Heading 1 - Bold & Strong
              </h1>
              <h2 className="text-3xl font-semibold text-black dark:text-white">
                Heading 2 - Semibold
              </h2>
              <h3 className="text-2xl font-medium text-black dark:text-white">
                Heading 3 - Medium
              </h3>
              <h4 className="text-xl font-medium text-black dark:text-white">
                Heading 4 - Regular
              </h4>
              <p className="text-base text-gray-700 dark:text-gray-300">
                Body text - Regular paragraph text that&apos;s easy to read with
                proper contrast.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Small text - Used for captions, labels, and secondary
                information.
              </p>
              <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded text-sm font-mono">
                Code snippet
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center">
                <Award className="w-4 h-4 text-white dark:text-black" />
              </div>
              <span className="font-medium text-black dark:text-white">
                EduChain
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pure black and white design system - Clean, minimal, and
              accessible.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
