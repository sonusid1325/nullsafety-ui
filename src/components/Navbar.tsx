"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Award,
  Menu,
  X,
  Home,
  LayoutDashboard,
  FileCheck,
  Shield,
  UserCheck,
  Building,
  Search,
} from "lucide-react";
import { supabase, Institution } from "@/lib/supabase";

// Admin wallet addresses that can access admin panel
const ADMIN_WALLETS = [
  "ADMIN_WALLET_ADDRESS_1", // Replace with actual admin wallet addresses
  "ADMIN_WALLET_ADDRESS_2",
];

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { connected, publicKey } = useWallet();
  const pathname = usePathname();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if connected wallet is registered as an institution
  const checkInstitutionStatus = useCallback(async () => {
    if (!publicKey) {
      setInstitution(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("authority_wallet", publicKey.toString())
        .single();

      if (error) {
        setInstitution(null);
      } else {
        setInstitution(data);
      }
    } catch (error) {
      console.error("Error checking institution status:", error);
      setInstitution(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    checkInstitutionStatus();
  }, [checkInstitutionStatus]);

  const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());
  const isUniversity = institution && institution.is_verified;
  const isStudent = connected && !isUniversity;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const NavLink = ({
    href,
    children,
    icon: Icon,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
  }) => {
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        onClick={onClick || closeMobileMenu}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
            : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{children}</span>
      </Link>
    );
  };

  const renderNavigationLinks = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        </div>
      );
    }

    if (!connected) {
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/collectables" icon={Award}>
            Gallery
          </NavLink>
          <NavLink href="/register-university" icon={Building}>
            Register University
          </NavLink>
        </nav>
      );
    }

    if (isUniversity) {
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/dashboard" icon={LayoutDashboard}>
            Dashboard
          </NavLink>
          <NavLink href="/collectables" icon={FileCheck}>
            Certificates
          </NavLink>
          <NavLink href="/cert-debug" icon={Search}>
            Debug
          </NavLink>
          {isAdmin && (
            <NavLink href="/admin" icon={Shield}>
              Admin
            </NavLink>
          )}
        </nav>
      );
    }

    if (isStudent) {
      return (
        <nav className="hidden md:flex items-center space-x-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/collectables" icon={Award}>
            My Certificates
          </NavLink>
          <NavLink href="/verify" icon={Search}>
            Verify Certificate
          </NavLink>
        </nav>
      );
    }

    return (
      <nav className="hidden md:flex items-center space-x-1">
        <NavLink href="/" icon={Home}>
          Home
        </NavLink>
        <NavLink href="/register-university" icon={Building}>
          Register University
        </NavLink>
      </nav>
    );
  };

  const renderMobileNavigationLinks = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        </div>
      );
    }

    if (!connected) {
      return (
        <nav className="space-y-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/collectables" icon={Award}>
            Gallery
          </NavLink>
          <NavLink href="/register-university" icon={Building}>
            Register University
          </NavLink>
        </nav>
      );
    }

    if (isUniversity) {
      return (
        <nav className="space-y-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/dashboard" icon={LayoutDashboard}>
            Dashboard
          </NavLink>
          <NavLink href="/collectables" icon={FileCheck}>
            Certificates
          </NavLink>
          <NavLink href="/cert-debug" icon={Search}>
            Debug
          </NavLink>
          {isAdmin && (
            <NavLink href="/admin" icon={Shield}>
              Admin
            </NavLink>
          )}
        </nav>
      );
    }

    if (isStudent) {
      return (
        <nav className="space-y-1">
          <NavLink href="/" icon={Home}>
            Home
          </NavLink>
          <NavLink href="/collectables" icon={Award}>
            My Certificates
          </NavLink>
          <NavLink href="/verify" icon={Search}>
            Verify Certificate
          </NavLink>
        </nav>
      );
    }

    return (
      <nav className="space-y-1">
        <NavLink href="/" icon={Home}>
          Home
        </NavLink>
        <NavLink href="/register-university" icon={Building}>
          Register University
        </NavLink>
      </nav>
    );
  };

  return (
    <>
      <header
        className={`border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black ${className}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
                <Award className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="text-xl font-medium text-black dark:text-white">
                NullSafety
              </span>
            </Link>

            {/* Desktop Navigation */}
            {renderNavigationLinks()}

            {/* User Status & Actions */}
            <div className="flex items-center space-x-4">
              {connected && (
                <div className="hidden md:flex items-center space-x-2">
                  {isUniversity && institution && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                      <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {institution.name}
                      </span>
                    </div>
                  )}
                  {isStudent && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                      <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Student
                      </span>
                    </div>
                  )}
                </div>
              )}

              <ThemeToggle />
              <WalletMultiButton />

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 space-y-4">
              {renderMobileNavigationLinks()}

              {/* Mobile User Status */}
              {connected && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  {isUniversity && institution && (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        University: {institution.name}
                      </span>
                    </div>
                  )}
                  {isStudent && (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Student Account
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;
