"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle, SimpleThemeToggle } from "@/components/ThemeToggle";
import {
  Award,
  Shield,
  Moon,
  Sun,
  Palette,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export function ThemeDemo() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium">
          <Palette className="w-4 h-4" />
          <span>Theme Demonstration</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Dark & Light Theme Support
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Experience the seamless transition between light and dark modes.
          Perfect for both day and night certificate viewing!
        </p>
      </div>

      {/* Theme Controls */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <Moon className="w-5 h-5 text-blue-500" />
            <span>Theme Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex items-center space-x-2"
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </Button>

            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex items-center space-x-2"
            >
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </Button>

            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className="flex items-center space-x-2"
            >
              <Palette className="w-4 h-4" />
              <span>System</span>
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium dark:text-gray-200">
              Toggle Buttons:
            </span>
            <SimpleThemeToggle />
            <ThemeToggle />
          </div>

          <div className="p-3 bg-muted dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-gray-300">
              Current theme: <span className="font-mono font-semibold">{theme}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sample Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Certificate Preview Card */}
        <Card className="dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Sample Certificate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center py-6 px-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                <Award className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <h3 className="font-serif font-bold text-gray-800 dark:text-gray-200">
                  CERTIFICATE OF COMPLETION
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  This certifies that <span className="font-semibold">John Doe</span>
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Computer Science Degree
                </p>
                <div className="flex justify-center items-center mt-3 space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Blockchain Verified
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" className="flex-1">
                  View Full
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Showcase */}
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span>Features Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Blockchain Security
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Immutable and tamper-proof
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    NFT Minting
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Transform to tradeable assets
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">
                    Global Access
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    Share and verify worldwide
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Palette Demo */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="space-y-2">
              <div className="w-full h-12 bg-background border rounded"></div>
              <p className="text-xs font-medium">Background</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-foreground rounded"></div>
              <p className="text-xs font-medium">Foreground</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-primary rounded"></div>
              <p className="text-xs font-medium">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-secondary rounded"></div>
              <p className="text-xs font-medium">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-muted rounded"></div>
              <p className="text-xs font-medium">Muted</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-accent rounded"></div>
              <p className="text-xs font-medium">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-destructive rounded"></div>
              <p className="text-xs font-medium">Destructive</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-12 bg-border border-2 rounded"></div>
              <p className="text-xs font-medium">Border</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="dark:bg-gray-800 border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-blue-600 dark:text-blue-400">
            Theme Usage Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-gray-700 dark:text-gray-300">
              The theme automatically persists across browser sessions
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-gray-700 dark:text-gray-300">
              System theme follows your OS preference automatically
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-gray-700 dark:text-gray-300">
              Certificates maintain readability in both themes when downloaded
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-gray-700 dark:text-gray-300">
              All interactive elements work seamlessly in both modes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ThemeDemo;
