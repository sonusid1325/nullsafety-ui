'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WalletButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  showBalance?: boolean;
  className?: string;
}

export function WalletButton({
  variant = 'default',
  size = 'default',
  showBalance = false,
  className = '',
}: WalletButtonProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <div className={`wallet-adapter-button-trigger ${className}`}>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Wallet className="w-4 h-4 mr-2" />
          {formatAddress(publicKey?.toString() || '')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wallet Details</DialogTitle>
          <DialogDescription>
            Your connected wallet information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Wallet Address
            </label>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
              <code className="flex-1 text-sm font-mono break-all">
                {publicKey?.toString()}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAddress}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {showBalance && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                SOL Balance
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCopyAddress}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WalletButton;
