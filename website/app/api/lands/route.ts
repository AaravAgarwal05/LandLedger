import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import { Land } from "@/models/Land";
import { customAlphabet } from "nanoid";
import {
  computeAreaFromGeo,
  computeGeoBBox,
  validateArea,
  createCanonicalHash,
} from "@/lib/geo-utils";
import {
  formatLandAsNFTMetadata,
  validateNFTMetadata,
} from "@/lib/nft-metadata";
import { uploadMetadataToIPFS, getIPFSGatewayURL } from "@/lib/nft-storage";
import { retryWithBackoff } from "@/lib/retry";
import { submitTransaction } from "@/lib/fabric";

// Helper to generate Land ID
// Format: L-{YYYY}-{CITY}-{STATE}-{NANO5}
function generateLandId(city: string, state: string): string {
  const year = new Date().getFullYear();

  // Get first 3 letters of city, uppercase, default to 'XXX'
  const cityCode = (city?.substring(0, 3) || "XXX").toUpperCase();

  // Get first 2 letters of state, uppercase, default to 'XX'
  const stateCode = (state?.substring(0, 2) || "XX").toUpperCase();

  // Generate 5 char nano id (uppercase alphanumeric)
  const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);
  const nano5 = nanoid();

  return `L-${year}-${cityCode}-${stateCode}-${nano5}`;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const lands = await Land.find({ ownerClerkId: userId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      lands,
    });
  } catch (error: any) {
    console.error("Error fetching lands:", error);
    return NextResponse.json(
      { error: "Failed to fetch lands", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // 1. Normalize wallet address to lowercase
    const normalizedWallet = data.ownerWallet?.toLowerCase();

    // 2. Validate required fields
    if (!data.geo || !data.geo.coordinates) {
      return NextResponse.json(
        { error: "Missing geo boundary data" },
        { status: 400 }
      );
    }

    if (!data.area || !data.areaUnit) {
      return NextResponse.json(
        { error: "Missing area or area unit" },
        { status: 400 }
      );
    }

    // 3. Compute area from GeoJSON
    let computedArea: number;
    try {
      computedArea = computeAreaFromGeo(data.geo);
    } catch (error: any) {
      return NextResponse.json(
        { error: "Invalid GeoJSON polygon", details: error.message },
        { status: 400 }
      );
    }

    // 4. Validate area (30% tolerance)
    const areaValidation = validateArea(
      computedArea,
      parseFloat(data.area),
      data.areaUnit,
      30
    );

    if (!areaValidation.valid) {
      return NextResponse.json(
        {
          error: "Area validation failed",
          message: areaValidation.message,
          computedArea: computedArea,
          userArea: parseFloat(data.area),
          unit: data.areaUnit,
          difference: areaValidation.difference,
        },
        { status: 400 }
      );
    }

    // 5. Compute geoBBox
    let geoBBox: number[];
    try {
      geoBBox = computeGeoBBox(data.geo);
    } catch (error: any) {
      return NextResponse.json(
        { error: "Failed to compute bounding box", details: error.message },
        { status: 400 }
      );
    }

    // 6. Generate Land ID using structured address
    const landId = generateLandId(data.address?.city, data.address?.state);

    // 7. Create canonical hash
    const canonicalHash = createCanonicalHash({
      ownerClerkId: userId,
      surveyNo: data.surveyNo,
      geo: data.geo,
      computedArea: computedArea,
    });

    // 8. Prepare final payload
    const finalPayload = {
      ...data,
      landId,
      ownerWallet: normalizedWallet,
      ownerClerkId: userId,
      computedArea,
      geoBBox,
      canonicalHash,
      fabricTxId: `FABRIC-${Date.now()}`, // Placeholder for now
    };

    console.log("--- Land Registration Data Received ---");
    console.log(JSON.stringify(finalPayload, null, 2));
    console.log("--- Validation Results ---");
    console.log(`Computed Area: ${computedArea.toFixed(2)} sqm`);
    console.log(`Area Validation: ${areaValidation.message}`);
    console.log(`Geo BBox: [${geoBBox.join(", ")}]`);
    console.log(`Canonical Hash: ${canonicalHash}`);
    console.log("---------------------------------------");

    // 9. Save to database
    await dbConnect();

    const land = new Land(finalPayload);

    // Initialize status history with the initial 'registered' status
    land.statusHistory.push({
      status: "registered",
      changedAt: new Date(),
      changedBy: userId,
      notes: "Land initially registered in the system",
    });
    await land.save();

    console.log("--- Land Saved to Database ---");
    console.log(`Land ID: ${land.landId}`);
    console.log(`MongoDB _id: ${land._id}`);
    console.log(`Status: ${land.status}`);
    console.log("-------------------------------");

    // 10. Automatically pin metadata to IPFS with retry logic
    let ipfsPinningResult: {
      success: boolean;
      ipfsCid?: string;
      ipfsUrl?: string;
      error?: string;
      attempts?: number;
    } = { success: false };

    console.log("\n========================================");
    console.log("🚀 STARTING IPFS PINNING WORKFLOW");
    console.log("========================================");
    console.log(`📋 Land ID: ${land.landId}`);
    console.log(`🆔 MongoDB ID: ${land._id}`);
    console.log(`👤 Owner: ${land.ownerClerkId}`);

    // Update status to pending_metadata
    land.updateStatus(
      "pending_metadata",
      userId,
      "Starting IPFS metadata pinning process"
    );
    await land.save();
    console.log(`📊 Status updated: registered → pending_metadata`);

    let attemptCount = 0;
    const startTime = Date.now();

    try {
      console.log("\n--- Step 1: Format NFT Metadata ---");
      console.log("🔄 Converting land data to NFT metadata format...");

      // Format land data as NFT metadata
      const metadata = formatLandAsNFTMetadata(land);

      console.log("✅ Metadata formatted successfully");
      console.log(
        `📊 Metadata attributes count: ${metadata.attributes.length}`
      );
      console.log(`📝 NFT Name: "${metadata.name}"`);

      // Log metadata size for debugging
      const metadataJSON = JSON.stringify(metadata, null, 2);
      const metadataSize = new Blob([metadataJSON]).size;
      console.log(
        `📦 Metadata size: ${metadataSize} bytes (${(
          metadataSize / 1024
        ).toFixed(2)} KB)`
      );

      console.log("\n--- Step 2: Validate Metadata ---");
      console.log("🔍 Validating NFT metadata structure...");

      // Validate metadata
      validateNFTMetadata(metadata);
      console.log("✅ Metadata validation passed");
      console.log("   ✓ Name is valid");
      console.log("   ✓ Description is valid");
      console.log("   ✓ Attributes are valid");

      console.log("\n--- Step 3: Upload to IPFS (with retry logic) ---");
      console.log("⚙️ Retry configuration:");
      console.log("   • Max attempts: 3");
      console.log("   • Initial delay: 1000ms");
      console.log("   • Max delay: 5000ms");
      console.log("   • Backoff multiplier: 2x");

      // Upload to IPFS with retry logic (3 attempts, exponential backoff)
      const ipfsCid = await retryWithBackoff(
        async () => {
          attemptCount++;
          console.log(
            `\n📤 [Attempt ${attemptCount}/3] Uploading metadata to IPFS...`
          );
          console.log(`   ⏱️  Timestamp: ${new Date().toISOString()}`);

          const uploadStartTime = Date.now();
          const cid = await uploadMetadataToIPFS(metadata);
          const uploadDuration = Date.now() - uploadStartTime;

          console.log(`   ✅ Upload successful in ${uploadDuration}ms`);
          console.log(`   📍 CID: ${cid}`);

          return cid;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.warn(`\n⚠️  [Attempt ${attempt}/3] FAILED`);
            console.warn(`   ❌ Error: ${error.message}`);
            console.warn(`   🔄 Preparing to retry...`);
          },
        }
      );

      console.log("\n--- Step 4: Update MongoDB with CID ---");
      console.log("💾 Saving IPFS CID to database...");
      console.log(`   CID to save: ${ipfsCid}`);

      // Update land document with IPFS CID
      land.ipfsCid = ipfsCid;

      // Update status to metadata_pinned
      land.updateStatus(
        "metadata_pinned",
        userId,
        `Metadata successfully pinned to IPFS: ${ipfsCid}`
      );
      await land.save();

      console.log("✅ Database updated successfully");
      console.log(`📊 Status updated: pending_metadata → metadata_pinned`);

      const totalDuration = Date.now() - startTime;
      const ipfsUrl = getIPFSGatewayURL(ipfsCid);

      ipfsPinningResult = {
        success: true,
        ipfsCid,
        ipfsUrl,
        attempts: attemptCount,
      };

      console.log("\n========================================");
      console.log("✅ IPFS PINNING COMPLETED SUCCESSFULLY");
      console.log("========================================");
      console.log(`📍 IPFS CID: ${ipfsCid}`);
      console.log(`🌐 Gateway URL: ${ipfsUrl}`);
      console.log(`🔗 Protocol URL: ipfs://${ipfsCid}`);
      console.log(`📊 Total attempts: ${attemptCount}`);
      console.log(`⏱️  Total duration: ${totalDuration}ms`);
      console.log("========================================\n");
    } catch (ipfsError: any) {
      // IPFS pinning failed after all retries
      // Don't fail the entire registration - land is already saved to MongoDB
      const totalDuration = Date.now() - startTime;

      // Update status back to registered with error note
      land.updateStatus(
        "registered",
        userId,
        `IPFS pinning failed: ${ipfsError.message}`
      );
      await land.save();

      console.error("\n========================================");
      console.error("❌ IPFS PINNING FAILED");
      console.error("========================================");
      console.error(`🔴 Error: ${ipfsError.message}`);
      console.error(`📊 Total attempts: ${attemptCount}`);
      console.error(`⏱️  Total duration: ${totalDuration}ms`);
      console.error(`📋 Land ID: ${land.landId}`);
      console.error(`🆔 MongoDB ID: ${land._id}`);
      console.error(`📊 Status reverted to: registered`);
      console.error("\n⚠️  NOTE: Land registration was successful!");
      console.error("   The land data is safely stored in MongoDB.");
      console.error("   You can retry IPFS pinning later using:");
      console.error(`   POST /api/lands/${land._id}/pin`);
      console.error("========================================\n");

      // Log full error stack for debugging
      if (ipfsError.stack) {
        console.error("📋 Full error stack:");
        console.error(ipfsError.stack);
      }

      ipfsPinningResult = {
        success: false,
        error: ipfsError.message,
        attempts: attemptCount,
      };
    }

    // 11. Submit to Hyperledger Fabric
    let fabricResult: {
      success: boolean;
      txId?: string;
      error?: string;
    } = { success: false };

    if (ipfsPinningResult.success && ipfsPinningResult.ipfsCid) {
      try {
        console.log("\n========================================");
        console.log("⛓️  STARTING BLOCKCHAIN REGISTRATION");
        console.log("========================================");

        // Update status to pending_fabric_commit
        land.updateStatus(
          "pending_fabric_commit",
          userId,
          "Submitting transaction to Hyperledger Fabric"
        );
        await land.save();
        console.log(
          `📊 Status updated: metadata_pinned → pending_fabric_commit`
        );

        const startTimeFabric = Date.now();

        // Prepare data for chaincode
        // Ensure the object matches what the chaincode expects
        const landDataForChaincode = {
          landId: land.landId,
          ownerWallet: land.ownerWallet,
          ownerClerkId: land.ownerClerkId,
          ipfsCid: ipfsPinningResult.ipfsCid,
          canonicalHash: land.canonicalHash,
          surveyNo: land.surveyNo,
          landTitle: land.landTitle,
          status: "registered", // Initial on-chain status
          createdAt: land.createdAt.toISOString(),
          updatedAt: land.updatedAt.toISOString(),
          history: [], // Chaincode will initialize this
        };

        console.log('📤 Submitting "RegisterLand" transaction...');
        console.log(
          `   Data payload size: ${
            JSON.stringify(landDataForChaincode).length
          } bytes`
        );

        // Submit transaction
        // submitTransaction now returns { result: string, txId: string }
        const { result: resultJson, txId } = await submitTransaction(
          "RegisterLand",
          JSON.stringify(landDataForChaincode)
        );
        const result = JSON.parse(resultJson);

        const fabricDuration = Date.now() - startTimeFabric;

        console.log(
          `✅ Transaction submitted successfully in ${fabricDuration}ms`
        );
        console.log(`   TxID: ${txId}`);

        fabricResult = {
          success: true,
          txId: txId,
        };

        // Update MongoDB with Fabric details
        land.fabricTxId = txId;
        land.updateStatus(
          "fabric_registered",
          userId,
          `Successfully registered on blockchain. TxID: ${txId}`
        );
        await land.save();

        console.log(`💾 Database updated with Fabric TxID: ${txId}`);
        console.log(
          `📊 Status updated: pending_fabric_commit → fabric_registered`
        );
        console.log("========================================\n");
      } catch (fabricError: any) {
        console.error("\n❌ BLOCKCHAIN REGISTRATION FAILED");
        console.error(`🔴 Error: ${fabricError.message}`);

        // Revert status but keep land (it's pinned but not on chain)
        land.updateStatus(
          "metadata_pinned",
          userId,
          `Blockchain registration failed: ${fabricError.message}`
        );
        await land.save();

        fabricResult = {
          success: false,
          error: fabricError.message,
        };
      }
    } else {
      console.warn(
        "\n⚠️  Skipping Blockchain registration because IPFS pinning failed."
      );
    }

    // 12. Return response
    return NextResponse.json({
      success: true,
      message: "Land registered successfully",
      land: {
        _id: land._id,
        landId: land.landId,
        landTitle: land.landTitle,
        status: land.status,
        canonicalHash: land.canonicalHash,
        ipfsCid: land.ipfsCid,
        fabricTxId: land.fabricTxId,
      },
      validation: {
        areaValidation: areaValidation.message,
        computedArea: computedArea,
        geoBBox: geoBBox,
        canonicalHash: canonicalHash,
      },
      ipfsPinning: ipfsPinningResult,
      blockchain: fabricResult,
    });
  } catch (error: any) {
    console.error("Error registering land:", error);
    return NextResponse.json(
      { error: "Failed to register land", details: error.message },
      { status: 500 }
    );
  }
}
