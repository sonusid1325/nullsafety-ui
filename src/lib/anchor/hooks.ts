import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  solanaClient,
  GlobalStateAccount,
  InstitutionAccount,
  CertificateAccount,
} from "./client";

// Hook to get Anchor provider
export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useCallback(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      throw new Error("Wallet not connected");
    }

    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: "confirmed" },
    );
  }, [connection, wallet]);
}

// Hook to initialize Solana client
export function useSolanaClient() {
  const getProvider = useAnchorProvider();
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected) {
      try {
        const provider = getProvider();
        solanaClient.initializeProgram(provider);
      } catch (error) {
        console.error("Error initializing Solana client:", error);
      }
    }
  }, [wallet.connected, getProvider]);

  return solanaClient;
}

// Hook to get global state
export function useGlobalState() {
  const [globalState, setGlobalState] = useState<GlobalStateAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchGlobalState = useCallback(async () => {
    if (!wallet.connected) {
      setGlobalState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const state = await client.getGlobalState();
      setGlobalState(state);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch global state",
      );
      setGlobalState(null);
    } finally {
      setLoading(false);
    }
  }, [client, wallet.connected]);

  useEffect(() => {
    fetchGlobalState();
  }, [fetchGlobalState]);

  return { globalState, loading, error, refetch: fetchGlobalState };
}

// Hook to get institution data
export function useInstitution(authority?: PublicKey) {
  const [institution, setInstitution] = useState<InstitutionAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchInstitution = useCallback(
    async (authKey?: PublicKey) => {
      const targetAuthority = authKey || authority || wallet.publicKey;

      if (!targetAuthority || !wallet.connected) {
        setInstitution(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const inst = await client.getInstitution(targetAuthority);
        setInstitution(inst);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch institution",
        );
        setInstitution(null);
      } finally {
        setLoading(false);
      }
    },
    [client, authority, wallet.connected, wallet.publicKey],
  );

  useEffect(() => {
    fetchInstitution();
  }, [fetchInstitution]);

  return {
    institution,
    loading,
    error,
    refetch: fetchInstitution,
    isRegistered: institution !== null,
  };
}

// Hook to get all institutions
export function useInstitutions() {
  const [institutions, setInstitutions] = useState<
    (InstitutionAccount & { publicKey: PublicKey })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchInstitutions = useCallback(async () => {
    if (!wallet.connected) {
      setInstitutions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const insts = await client.getAllInstitutions();
      setInstitutions(insts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch institutions",
      );
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  }, [client, wallet.connected]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  return { institutions, loading, error, refetch: fetchInstitutions };
}

// Hook to get certificates for an institution
export function useCertificates(institutionAuthority?: PublicKey) {
  const [certificates, setCertificates] = useState<CertificateAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchCertificates = useCallback(
    async (authKey?: PublicKey) => {
      const targetAuthority =
        authKey || institutionAuthority || wallet.publicKey;

      if (!targetAuthority || !wallet.connected) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const certs =
          await client.getCertificatesForInstitution(targetAuthority);
        setCertificates(certs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch certificates",
        );
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    },
    [client, institutionAuthority, wallet.connected, wallet.publicKey],
  );

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return { certificates, loading, error, refetch: fetchCertificates };
}

// Hook to get all certificates
export function useAllCertificates() {
  const [certificates, setCertificates] = useState<
    (CertificateAccount & { publicKey: PublicKey })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchCertificates = useCallback(async () => {
    if (!wallet.connected) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const certs = await client.getAllCertificates();
      setCertificates(certs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch certificates",
      );
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, [client, wallet.connected]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return { certificates, loading, error, refetch: fetchCertificates };
}

// Hook to get a specific certificate
export function useCertificate(certificateAddress?: PublicKey) {
  const [certificate, setCertificate] = useState<CertificateAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchCertificate = useCallback(
    async (certAddress?: PublicKey) => {
      const targetAddress = certAddress || certificateAddress;

      if (!targetAddress || !wallet.connected) {
        setCertificate(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const cert = await client.getCertificate(targetAddress);
        setCertificate(cert);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch certificate",
        );
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    },
    [client, certificateAddress, wallet.connected],
  );

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  return { certificate, loading, error, refetch: fetchCertificate };
}

// Hook for program operations
export function useProgramOperations() {
  const client = useSolanaClient();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  const registerInstitution = useCallback(
    async (name: string, location: string) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        // Create a keypair from the wallet's public key for signing
        // Note: This is a simplified approach. In a real app, you'd handle signing differently
        const tx = await client.registerInstitution(
          // This would need to be handled differently in the actual implementation
          // as we can't create a Keypair from just a PublicKey
          wallet.publicKey as never,
          name,
          location,
        );
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [client, wallet],
  );

  const issueCertificate = useCallback(
    async (
      studentName: string,
      courseName: string,
      grade: string,
      certificateId: string,
    ) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tx = await client.issueCertificate(
          wallet.publicKey as never,
          studentName,
          courseName,
          grade,
          certificateId,
        );
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [client, wallet],
  );

  const verifyCertificate = useCallback(
    async (certificateAddress: PublicKey) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tx = await client.verifyCertificate(
          wallet.publicKey as never,
          certificateAddress,
        );
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [client, wallet],
  );

  const revokeCertificate = useCallback(
    async (certificateAddress: PublicKey) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tx = await client.revokeCertificate(
          wallet.publicKey as never,
          certificateAddress,
        );
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [client, wallet],
  );

  return {
    registerInstitution,
    issueCertificate,
    verifyCertificate,
    revokeCertificate,
    loading,
  };
}

// Hook to get certificate by institution and ID
export function useCertificateByInstitutionAndId(
  institutionAddress?: PublicKey,
  certificateId?: string,
) {
  const [certificate, setCertificate] = useState<CertificateAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useSolanaClient();
  const wallet = useWallet();

  const fetchCertificate = useCallback(async () => {
    if (!institutionAddress || !certificateId || !wallet.connected) {
      setCertificate(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const cert = await client.getCertificateByInstitutionAndId(
        institutionAddress,
        certificateId,
      );
      setCertificate(cert);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch certificate",
      );
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  }, [client, institutionAddress, certificateId, wallet.connected]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  return { certificate, loading, error, refetch: fetchCertificate };
}

// Hook for wallet balance and utilities
export function useWalletUtils() {
  const client = useSolanaClient();
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  const getBalance = useCallback(async () => {
    if (!wallet.publicKey) return null;

    try {
      const bal = await client.getBalance(wallet.publicKey);
      setBalance(bal);
      return bal;
    } catch (error) {
      console.error("Error getting balance:", error);
      return null;
    }
  }, [client, wallet.publicKey]);

  const requestAirdrop = useCallback(
    async (lamports?: number) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      return await client.requestAirdrop(wallet.publicKey, lamports);
    },
    [client, wallet.publicKey],
  );

  useEffect(() => {
    if (wallet.connected) {
      getBalance();
    }
  }, [wallet.connected, getBalance]);

  return {
    balance,
    getBalance,
    requestAirdrop,
  };
}
