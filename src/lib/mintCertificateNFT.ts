import { WalletAdapter } from "@solana/wallet-adapter-base";
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";

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

// Initialize connection and Metaplex
const getConnection = () => {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
};

const getMetaplex = (wallet: WalletAdapter) => {
  const connection = getConnection();

  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Create a temporary keypair for Metaplex operations
  const tempKeypair = Keypair.generate();
  const metaplex = Metaplex.make(connection).use(keypairIdentity(tempKeypair));

  return metaplex;
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

    const connection = getConnection();

    // Validate student wallet address
    let studentPublicKey: PublicKey;
    try {
      studentPublicKey = new PublicKey(studentWalletAddress);
    } catch {
      throw new Error("Invalid student wallet address");
    }

    // Check if issuer has enough SOL
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error(
        "Insufficient SOL balance. Need at least 0.01 SOL for minting.",
      );
    }

    const metaplex = getMetaplex(wallet);

    // Create metadata for the NFT
    const nftMetadata = {
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

    console.log("Creating NFT metadata...");

    // Upload metadata to Arweave/IPFS using Metaplex
    const { uri: metadataUri } = await metaplex
      .nfts()
      .uploadMetadata(nftMetadata);

    console.log("Metadata uploaded to:", metadataUri);

    // Create the NFT
    console.log("Minting NFT...");
    const { nft, response } = await metaplex.nfts().create({
      uri: metadataUri,
      name: nftMetadata.name,
      symbol: nftMetadata.symbol,
      sellerFeeBasisPoints: 0, // No royalties
      creators: [
        {
          address: wallet.publicKey,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    });

    console.log("NFT created with address:", nft.address.toString());
    console.log("Transaction signature:", response.signature);

    // Transfer NFT to student wallet if different from issuer
    if (!studentPublicKey.equals(wallet.publicKey)) {
      console.log("Transferring NFT to student wallet...");

      const transferResponse = await metaplex.nfts().transfer({
        nftOrSft: nft,
        toOwner: studentPublicKey,
      });

      console.log(
        "Transfer signature:",
        (transferResponse as { response: { signature: string } }).response
          .signature,
      );
    }

    return {
      success: true,
      signature: (response as { signature: string }).signature,
      nftAddress: nft.address.toString(),
    };
  } catch (error: unknown) {
    console.error("Error minting NFT:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error occurred";

    const errorObj = error as Error;
    if (errorObj.message?.includes("insufficient funds")) {
      errorMessage =
        "Insufficient SOL for transaction fees. Need at least 0.01 SOL.";
    } else if (errorObj.message?.includes("Invalid student wallet")) {
      errorMessage = "Invalid student wallet address format";
    } else if (errorObj.message?.includes("Wallet not connected")) {
      errorMessage = "Please connect your wallet first";
    } else if (errorObj.message?.includes("User rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorObj.message) {
      errorMessage = errorObj.message;
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

    // Alternative: Upload to IPFS using a service like Pinata
    /*
    const formData = new FormData();
    formData.append("file", imageBlob, `certificate-${certificateId}.png`);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload to IPFS");
    }

    const result = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    */
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

    const accountInfo = await connection.getParsedAccountInfo(nftPublicKey);

    if (
      !accountInfo.value?.data ||
      typeof accountInfo.value.data === "string"
    ) {
      return false;
    }

    const parsedData = accountInfo.value.data as {
      program: string;
      parsed?: { info?: { owner?: string } };
    };
    if (parsedData.program === "spl-token" && parsedData.parsed?.info?.owner) {
      return parsedData.parsed.info.owner === ownerPublicKey.toString();
    }

    return false;
  } catch (error) {
    console.error("Error checking NFT ownership:", error);
    return false;
  }
}

// Utility function to get NFT metadata
export async function getNFTMetadata(nftAddress: string) {
  try {
    const connection = getConnection();

    // Create a temporary Metaplex instance for reading
    const keypair = Keypair.generate(); // Temporary keypair just for reading
    const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(nftAddress),
    });

    return nft;
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
