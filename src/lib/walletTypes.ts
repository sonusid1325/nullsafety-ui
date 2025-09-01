import { WalletContextState } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";

export interface WalletInterface {
  publicKey: NonNullable<WalletContextState["publicKey"]>;
  connected: boolean;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]>;
}

export function createMockWallet(
  wallet: WalletContextState,
): WalletInterface | null {
  if (!wallet.publicKey) return null;

  return {
    publicKey: wallet.publicKey,
    connected: true,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      transaction: T,
    ): Promise<T> => {
      if (wallet?.signTransaction) {
        return await wallet.signTransaction(transaction);
      }
      throw new Error("Wallet signing not available");
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      transactions: T[],
    ): Promise<T[]> => {
      if (wallet?.signAllTransactions) {
        return await wallet.signAllTransactions(transactions);
      }
      throw new Error("Wallet signing not available");
    },
  };
}

// Server-side wallet adapter that implements partial WalletContextState interface
export class ServerWalletAdapter implements Partial<WalletContextState> {
  publicKey: PublicKey;
  connected = true;
  connecting = false;
  disconnecting = false;
  wallet = null;
  wallets = [];
  autoConnect = false;

  constructor(publicKeyString: string) {
    this.publicKey = new PublicKey(publicKeyString);
  }

  async signTransaction(): Promise<never> {
    throw new Error("Server-side signing not supported");
  }

  async signAllTransactions(): Promise<never> {
    throw new Error("Server-side signing not supported");
  }

  async connect(): Promise<void> {
    throw new Error("Server-side connection not supported");
  }

  async disconnect(): Promise<void> {
    throw new Error("Server-side disconnection not supported");
  }

  sendTransaction = undefined;
  signMessage = undefined;
  signIn = undefined;
}
