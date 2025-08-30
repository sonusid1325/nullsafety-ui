import { WalletAdapter } from "@solana/wallet-adapter-base";
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";
// Removed Metaplex UMI dependencies to avoid browser compatibility issues
// Using direct web3.js approach for better compatibility

export interface CertificateNFTMetadata {
  studentName: string;
  rollNo: string;
  courseName: string;
  universityName: string;
  issuedDate: string;
  certificateHash: string;
  certificateUrl: string;
  imageUrl?: string;
}

export interface MintResult {
  success: boolean;
  signature?: string;
  nftAddress?: string;
  error?: string;
}

// Initialize connection
const getConnection = () => {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
};

// Create metadata JSON for NFT
const createAndUploadMetadata = async (
  certificateData: CertificateNFTMetadata,
) => {
  const metadata = {
    name: `${certificateData.universityName} - ${certificateData.courseName}`,
    symbol: "CERT",
    description: `Certificate of completion for ${certificateData.studentName} (${certificateData.rollNo}) from ${certificateData.universityName}. Course: ${certificateData.courseName}. Issued: ${certificateData.issuedDate}`,
    image: certificateData.imageUrl || "",
    external_url: certificateData.certificateUrl,
    attributes: [
      {
        trait_type: "Student Name",
        value: certificateData.studentName,
      },
      {
        trait_type: "Roll Number",
        value: certificateData.rollNo,
      },
      {
        trait_type: "Course",
        value: certificateData.courseName,
      },
      {
        trait_type: "University",
        value: certificateData.universityName,
      },
      {
        trait_type: "Issue Date",
        value: certificateData.issuedDate,
      },
      {
        trait_type: "Certificate Hash",
        value: certificateData.certificateHash,
      },
      {
        trait_type: "Type",
        value: "Academic Certificate",
      },
      {
        trait_type: "Verification",
        value: "Blockchain Verified",
      },
    ],
    properties: {
      category: "image",
      files: [
        {
          uri: certificateData.imageUrl || "",
          type: "image/png",
        },
      ],
    },
  };

  // For devnet, create a data URI instead of uploading to Irys
  const metadataJson = JSON.stringify(metadata);
  const base64Data = Buffer.from(metadataJson).toString("base64");
  return `data:application/json;base64,${base64Data}`;
};

export async function mintCertificateNFT(
  wallet: WalletAdapter,
  studentWalletAddress: string,
  certificateData: CertificateNFTMetadata,
): Promise<MintResult> {
  try {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Check if wallet supports signing transactions
    const walletWithSigning = wallet as WalletAdapter & {
      signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    };

    console.log("Starting NFT minting process...");

    // Validate student wallet address
    let studentPublicKey: PublicKey;
    try {
      studentPublicKey = new PublicKey(studentWalletAddress);
    } catch {
      throw new Error("Invalid student wallet address");
    }

    const connection = getConnection();

    // Check if issuer has enough SOL
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      throw new Error(
        "Insufficient SOL balance. Need at least 0.1 SOL for minting.",
      );
    }

    console.log("Creating metadata...");
    const metadataUri = await createAndUploadMetadata(certificateData);
    console.log("Metadata created:", metadataUri);

    // Use simple web3.js approach for more compatibility
    const mintKeypair = Keypair.generate();
    console.log("NFT mint address:", mintKeypair.publicKey.toString());

    // Get minimum lamports for mint account
    const mintLamports =
      await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // Get associated token account for the student
    const tokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      studentPublicKey,
    );

    // Create transaction
    const transaction = new Transaction();

    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintLamports,
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    // Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        0, // 0 decimals for NFT
        wallet.publicKey, // mint authority
        wallet.publicKey, // freeze authority
      ),
    );

    // Create associated token account for student
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, // payer
        tokenAccount, // associated token account
        studentPublicKey, // owner
        mintKeypair.publicKey, // mint
      ),
    );

    // Mint token to student account
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey, // mint
        tokenAccount, // destination
        wallet.publicKey, // authority
        1, // amount (1 for NFT)
      ),
    );

    // Get recent blockhash and set fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign transaction with mint keypair
    transaction.partialSign(mintKeypair);

    if (!walletWithSigning.signTransaction) {
      throw new Error("Wallet doesn't support transaction signing");
    }

    // Sign transaction with wallet
    console.log("Signing transaction...");
    const signedTransaction =
      await walletWithSigning.signTransaction(transaction);

    console.log("Sending transaction...");
    // Send transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    );

    console.log("Confirming transaction...");
    // Confirm transaction
    await connection.confirmTransaction(signature, "confirmed");

    console.log("✅ NFT minted successfully!");
    console.log("Transaction signature:", signature);
    console.log("NFT mint address:", mintKeypair.publicKey.toString());
    console.log("Student token account:", tokenAccount.toString());

    return {
      success: true,
      signature: signature,
      nftAddress: mintKeypair.publicKey.toString(),
    };
  } catch (error: unknown) {
    console.error("❌ Error minting NFT:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error occurred";
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes("insufficient funds")) {
      errorMessage =
        "Insufficient SOL for transaction fees. Need at least 0.1 SOL.";
    } else if (errorMsg.includes("Invalid student wallet")) {
      errorMessage = "Invalid student wallet address format";
    } else if (errorMsg.includes("Wallet not connected")) {
      errorMessage = "Please connect your wallet first";
    } else if (errorMsg.includes("User rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorMsg.includes("doesn't support signing")) {
      errorMessage = "Wallet doesn't support transaction signing";
    } else if (errorMsg) {
      errorMessage = errorMsg;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function uploadCertificateImage(imageBlob: Blob): Promise<string> {
  try {
    // For devnet testing, we'll use a simple base64 data URL
    // In production, you should upload to IPFS, Arweave, or AWS S3
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error("Error uploading certificate image:", error);
    throw new Error("Failed to upload certificate image");
  }
}

export function generateCertificateImageFromDOM(
  certificateElement: HTMLElement,
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: certificateElement.scrollWidth,
        height: certificateElement.scrollHeight,
        logging: false,
        removeContainer: true,
      });

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to generate image blob"));
          }
        },
        "image/png",
        0.95,
      );
    } catch (error) {
      console.error("Error generating certificate image:", error);
      reject(error);
    }
  });
}

// Utility function to check NFT ownership
export async function checkNFTOwnership(
  nftAddress: string,
  ownerAddress: string,
): Promise<boolean> {
  try {
    const connection = getConnection();
    const nftPublicKey = new PublicKey(nftAddress);
    const ownerPublicKey = new PublicKey(ownerAddress);

    // Get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      nftPublicKey,
      ownerPublicKey,
    );

    // Check if the account exists and has balance
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    return accountInfo.value.uiAmount === 1;
  } catch (error) {
    console.error("Error checking NFT ownership:", error);
    return false;
  }
}

// Utility function to get NFT metadata
export async function getNFTMetadata(nftAddress: string) {
  try {
    const connection = getConnection();
    const mintPublicKey = new PublicKey(nftAddress);

    // Get mint info
    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);

    if (!mintInfo.value) {
      throw new Error("Mint account not found");
    }

    return {
      address: mintPublicKey.toString(),
      exists: true,
      supply:
        (mintInfo.value.data as { parsed?: { info?: { supply?: string } } })
          ?.parsed?.info?.supply || "0",
    } as const;
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return null;
  }
}

// Export utility functions
export const nftUtils = {
  checkNFTOwnership,
  getNFTMetadata,
  getConnection,
};
