import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  irysStorage,
} from "@metaplex-foundation/js";
import { WalletAdapter } from "@solana/wallet-adapter-base";

export interface CertificateNFTMetadata {
  studentName: string;
  rollNo: string;
  courseName: string;
  universityName: string;
  issuedDate: string;
  certificateHash: string;
  certificateUrl: string;
  imageUrl: string;
}

export interface MintResult {
  success: boolean;
  signature?: string;
  nftAddress?: string;
  error?: string;
}

export async function mintCertificateNFT(
  wallet: WalletAdapter,
  studentWalletAddress: string,
  certificateData: CertificateNFTMetadata,
): Promise<MintResult> {
  try {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Create connection to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
      "confirmed",
    );

    // Create Metaplex instance
    const metaplex = Metaplex.make(connection)
      .use(
        keypairIdentity({
          publicKey: wallet.publicKey,
          secretKey: new Uint8Array(), // This will be handled by the wallet
        }),
      )
      .use(
        irysStorage({
          address: "https://devnet.irys.xyz",
          providerUrl:
            process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
          timeout: 60000,
        }),
      );

    // Prepare metadata
    const metadata = {
      name: `Certificate - ${certificateData.studentName}`,
      symbol: "CERT",
      description: `Official certificate issued by ${certificateData.universityName} to ${certificateData.studentName} for completing ${certificateData.courseName}. This NFT serves as a verifiable digital credential.`,
      image: certificateData.imageUrl,
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
          value: "Educational Certificate",
        },
      ],
      properties: {
        files: [
          {
            uri: certificateData.imageUrl,
            type: "image/png",
          },
        ],
        category: "image",
      },
    };

    // Upload metadata to Arweave via Irys
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log("Metadata uploaded to:", uri);

    // Create NFT
    const { nft, response } = await metaplex.nfts().create({
      uri,
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 0, // No royalties
      creators: [
        {
          address: wallet.publicKey,
          verified: true,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    });

    // Transfer NFT to student's wallet
    if (studentWalletAddress !== wallet.publicKey.toString()) {
      const studentPublicKey = new PublicKey(studentWalletAddress);

      const transferResponse = await metaplex.nfts().transfer({
        nftOrSft: nft,
        toOwner: studentPublicKey,
      });

      console.log(
        "NFT transferred to student:",
        transferResponse.response.signature,
      );
    }

    return {
      success: true,
      signature: response.signature,
      nftAddress: nft.address.toString(),
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function uploadCertificateImage(
  imageBlob: Blob,
  certificateId: string,
): Promise<string> {
  try {
    // In a production app, you might want to upload to IPFS or Arweave
    // For now, we'll use a placeholder or you can implement your preferred storage

    // Create FormData for image upload
    const formData = new FormData();
    formData.append("image", imageBlob, `certificate-${certificateId}.png`);

    // Upload to your preferred storage service
    // This is a placeholder - replace with your actual upload logic
    const response = await fetch("/api/upload-certificate-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const { imageUrl } = await response.json();
    return imageUrl;
  } catch (error) {
    console.error("Error uploading certificate image:", error);
    throw error;
  }
}

export function generateCertificateImageFromDOM(
  certificateElement: HTMLElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: certificateElement.scrollWidth,
        height: certificateElement.scrollHeight,
      })
        .then((canvas) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to generate image blob"));
              }
            },
            "image/png",
            0.9,
          );
        })
        .catch(reject);
    });
  });
}
