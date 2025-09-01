import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  TransactionManager,
  TransactionResult,
  createTransactionManager,
} from "./transactions";
import toast from "react-hot-toast";

export interface UseTransactionsState {
  loading: boolean;
  error: string | null;
  lastTransaction: TransactionResult | null;
}

export function useTransactions() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [state, setState] = useState<UseTransactionsState>({
    loading: false,
    error: null,
    lastTransaction: null,
  });

  const getTransactionManager = useCallback(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      throw new Error("Wallet not connected");
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: "confirmed" },
    );

    return createTransactionManager(provider);
  }, [connection, wallet]);

  const executeTransaction = useCallback(
    async (
      operation: (manager: TransactionManager) => Promise<TransactionResult>,
      loadingMessage?: string,
      successMessage?: string,
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      if (loadingMessage) {
        toast.loading(loadingMessage, { id: "transaction" });
      }

      try {
        const manager = getTransactionManager();
        const result = await operation(manager);

        setState((prev) => ({
          ...prev,
          loading: false,
          lastTransaction: result,
          error: result.success ? null : result.error || "Transaction failed",
        }));

        toast.dismiss("transaction");

        if (result.success) {
          if (successMessage) {
            toast.success(successMessage);
          }
        } else {
          toast.error(result.error || "Transaction failed");
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        toast.dismiss("transaction");
        toast.error(errorMessage);

        return { signature: "", success: false, error: errorMessage };
      }
    },
    [getTransactionManager],
  );

  // Initialize system
  const initializeSystem = useCallback(async () => {
    return executeTransaction(
      (manager) => manager.initializeSystem(wallet),
      "Initializing system...",
      "System initialized successfully!",
    );
  }, [executeTransaction, wallet]);

  // Register institution
  const registerInstitution = useCallback(
    async (name: string, location: string) => {
      return executeTransaction(
        (manager) => manager.registerInstitution(wallet, name, location),
        "Registering institution...",
        "Institution registered successfully!",
      );
    },
    [executeTransaction, wallet],
  );

  // Issue certificate
  const issueCertificate = useCallback(
    async (
      studentName: string,
      courseName: string,
      grade: string,
      certificateId: string,
    ) => {
      return executeTransaction(
        (manager) =>
          manager.issueCertificate(
            wallet,
            studentName,
            courseName,
            grade,
            certificateId,
          ),
        "Issuing certificate...",
        "Certificate issued successfully!",
      );
    },
    [executeTransaction, wallet],
  );

  // Verify certificate
  const verifyCertificate = useCallback(
    async (certificateAddress: PublicKey) => {
      return executeTransaction(
        (manager) => manager.verifyCertificate(wallet, certificateAddress),
        "Verifying certificate...",
        "Certificate verified successfully!",
      );
    },
    [executeTransaction, wallet],
  );

  // Revoke certificate
  const revokeCertificate = useCallback(
    async (certificateAddress: PublicKey) => {
      return executeTransaction(
        (manager) => manager.revokeCertificate(wallet, certificateAddress),
        "Revoking certificate...",
        "Certificate revoked successfully!",
      );
    },
    [executeTransaction, wallet],
  );

  // Verify institution (admin only)
  const verifyInstitution = useCallback(
    async (institutionAddress: PublicKey) => {
      return executeTransaction(
        (manager) => manager.verifyInstitution(wallet, institutionAddress),
        "Verifying institution...",
        "Institution verified successfully!",
      );
    },
    [executeTransaction, wallet],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    initializeSystem,
    registerInstitution,
    issueCertificate,
    verifyCertificate,
    revokeCertificate,
    verifyInstitution,
    clearError,
    isWalletConnected: wallet.connected,
  };
}

// Hook for getting PDAs
export function usePDAs() {
  const wallet = useWallet();

  const getGlobalStatePDA = useCallback(() => {
    return TransactionManager.getGlobalStatePDA();
  }, []);

  const getInstitutionPDA = useCallback(
    (authority?: PublicKey) => {
      const targetAuthority = authority || wallet.publicKey;
      if (!targetAuthority) {
        throw new Error("No authority provided");
      }
      return TransactionManager.getInstitutionPDA(targetAuthority);
    },
    [wallet.publicKey],
  );

  const getCertificatePDA = useCallback(
    (institution: PublicKey, certificateId: string) => {
      return TransactionManager.getCertificatePDA(institution, certificateId);
    },
    [],
  );

  return {
    getGlobalStatePDA,
    getInstitutionPDA,
    getCertificatePDA,
  };
}

// Hook for certificate lookups
export function useCertificateLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCertificatePDA, getInstitutionPDA } = usePDAs();

  const findCertificateByInstitutionAndId = useCallback(
    async (institutionAuthority: PublicKey, certificateId: string) => {
      setLoading(true);
      setError(null);

      try {
        const [institutionPDA] = getInstitutionPDA(institutionAuthority);
        const [certificatePDA] = getCertificatePDA(
          institutionPDA,
          certificateId,
        );

        setLoading(false);
        return { institutionPDA, certificatePDA };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to find certificate";
        setError(errorMessage);
        setLoading(false);
        throw err;
      }
    },
    [getCertificatePDA, getInstitutionPDA],
  );

  const findCertificateByWalletAndId = useCallback(
    async (certificateId: string, walletPublicKey: PublicKey) => {
      if (!walletPublicKey) {
        throw new Error("Wallet not connected");
      }

      return findCertificateByInstitutionAndId(walletPublicKey, certificateId);
    },
    [findCertificateByInstitutionAndId],
  );

  return {
    findCertificateByInstitutionAndId,
    findCertificateByWalletAndId,
    loading,
    error,
  };
}

// Hook for batch operations
export function useBatchOperations() {
  const [loading, setLoading] = useState(false);
  const { issueCertificate } = useTransactions();

  const issueBatchCertificates = useCallback(
    async (
      certificates: Array<{
        studentName: string;
        courseName: string;
        grade: string;
        certificateId: string;
      }>,
    ) => {
      setLoading(true);
      const results: TransactionResult[] = [];

      try {
        for (const cert of certificates) {
          const result = await issueCertificate(
            cert.studentName,
            cert.courseName,
            cert.grade,
            cert.certificateId,
          );
          results.push(result);

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        setLoading(false);
        return results;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [issueCertificate],
  );

  return {
    issueBatchCertificates,
    loading,
  };
}
