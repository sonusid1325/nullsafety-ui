"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Award,
  Shield,
  Moon,
  Sun,
  CheckCircle,
  Zap,
  Globe,
} from "lucide-react";

export function ThemeDemo() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-16">
      {/* Theme Controls */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Theme Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className={`flex items-center space-x-2 ${
                theme === "light"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </Button>

            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className={`flex items-center space-x-2 ${
                theme === "dark"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </Button>

            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className={`flex items-center space-x-2 ${
                theme === "system"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <span>System</span>
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Toggle Component:
            </span>
            <ThemeToggle />
          </div>

          <div className="text-center p-4 border border-gray-200 dark:border-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current theme:{" "}
              <span className="font-mono font-medium text-black dark:text-white">
                {theme}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sample Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Certificate Preview */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Certificate Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8 px-6 border-2 border-gray-200 dark:border-gray-800 rounded">
                <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  CERTIFICATE OF COMPLETION
                </h3>
                <div className="w-16 h-px bg-black dark:bg-white mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  This certifies that
                </p>
                <p className="text-black dark:text-white font-semibold text-lg border-b border-gray-300 dark:border-gray-700 pb-2 mb-4">
                  John Doe
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  has completed
                </p>
                <p className="text-black dark:text-white font-medium">
                  Computer Science Program
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="flex-1 bg-black dark:bg-white text-white dark:text-black"
                >
                  View Full
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 dark:border-gray-700"
                >
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Key Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-800 rounded">
                <CheckCircle className="w-5 h-5 text-black dark:text-white" />
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Blockchain Security
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Immutable verification
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-800 rounded">
                <Zap className="w-5 h-5 text-black dark:text-white" />
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Instant Validation
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Real-time checking
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-800 rounded">
                <Globe className="w-5 h-5 text-black dark:text-white" />
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Global Access
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share anywhere
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Design Principles */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Design Principles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-black dark:bg-white rounded mx-auto flex items-center justify-center">
                <span className="text-white dark:text-black font-bold">M</span>
              </div>
              <h3 className="font-medium text-black dark:text-white">
                Minimal
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clean, focused design with no unnecessary elements
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-black dark:bg-white rounded mx-auto flex items-center justify-center">
                <span className="text-white dark:text-black font-bold">F</span>
              </div>
              <h3 className="font-medium text-black dark:text-white">
                Functional
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Every element serves a purpose in the user journey
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-black dark:bg-white rounded mx-auto flex items-center justify-center">
                <span className="text-white dark:text-black font-bold">A</span>
              </div>
              <h3 className="font-medium text-black dark:text-white">
                Accessible
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                High contrast and clear typography for all users
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Information */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            NullSafety Design System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-black dark:text-white mb-2">
                Color Palette
              </p>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <p>• Primary: Black / White</p>
                <p>• Background: White / Black</p>
                <p>• Text: Black / White</p>
                <p>• Borders: Gray-200 / Gray-800</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-black dark:text-white mb-2">
                Typography
              </p>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <p>• Font: Geist Sans</p>
                <p>• Weights: 400, 500, 600, 700</p>
                <p>• Scale: Modular spacing</p>
                <p>• Line height: 1.5</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-black dark:text-white" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Theme preference persists across sessions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ThemeDemo;
