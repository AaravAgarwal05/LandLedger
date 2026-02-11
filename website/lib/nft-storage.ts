import { PinataSDK } from 'pinata-web3';

/**
 * Pinata client utility
 * Handles uploading metadata and files to IPFS via Pinata
 */

// Initialize Pinata client
function getPinataClient(): PinataSDK {
  const jwt = process.env.PINATA_JWT;
  
  if (!jwt) {
    throw new Error('PINATA_JWT is not defined in environment variables');
  }
  
  // Trim whitespace from JWT (common issue)
  const trimmedJwt = jwt.trim();
  
  if (trimmedJwt.length === 0) {
    throw new Error('PINATA_JWT is empty after trimming whitespace');
  }
  
  console.log(`   🔍 [Pinata] JWT length: ${trimmedJwt.length} characters`);
  console.log(`   🔍 [Pinata] JWT starts with: ${trimmedJwt.substring(0, 10)}...`);
  
  return new PinataSDK({
    pinataJwt: trimmedJwt,
  });
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param metadata - The metadata object to upload
 * @returns The IPFS CID (Content Identifier)
 */
export async function uploadMetadataToIPFS(metadata: any): Promise<string> {
  console.log('   🔧 [Pinata] Initializing upload process...');
  
  try {
    console.log('   🔑 [Pinata] Checking JWT...');
    const pinata = getPinataClient();
    console.log('   ✅ [Pinata] JWT validated, client initialized');
    
    console.log('   📝 [Pinata] Converting metadata to JSON...');
    // Convert metadata to JSON string
    const metadataJSON = JSON.stringify(metadata, null, 2);
    console.log(`   ✅ [Pinata] JSON created (${metadataJSON.length} characters)`);
    
    console.log('   📄 [Pinata] Creating File object...');
    // Create a File object from the JSON string
    const metadataFile = new File(
      [metadataJSON],
      'metadata.json',
      { type: 'application/json' }
    );
    console.log('   ✅ [Pinata] File object created');
    
    console.log('   ☁️  [Pinata] Uploading to IPFS...');
    console.log('   ⏳ [Pinata] Please wait, this may take a few seconds...');
    
    // Upload to IPFS via Pinata
    const uploadStart = Date.now();
    const upload = await pinata.upload.file(metadataFile);
    const uploadDuration = Date.now() - uploadStart;
    
    const cid = upload.IpfsHash;
    
    console.log(`   ✅ [Pinata] Upload completed in ${uploadDuration}ms`);
    console.log(`   📍 [Pinata] CID: ${cid}`);
    console.log(`   🌐 [Pinata] Gateway URL: https://gateway.pinata.cloud/ipfs/${cid}`);
    
    return cid;
  } catch (error: any) {
    console.error('   ❌ [Pinata] Upload failed');
    console.error(`   🔴 [Pinata] Error type: ${error.name}`);
    console.error(`   🔴 [Pinata] Error message: ${error.message}`);
    
    if (error.response) {
      console.error(`   🔴 [Pinata] HTTP Status: ${error.response.status}`);
      console.error(`   🔴 [Pinata] Response data:`, error.response.data);
    }
    
    throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
  }
}

/**
 * Upload a file to IPFS via Pinata
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file
 * @param mimeType - The MIME type of the file
 * @returns The IPFS CID
 */
export async function uploadFileToIPFS(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    const pinata = getPinataClient();
    
    // Create a File object from the buffer
    // Convert Buffer to Uint8Array for compatibility
    const file = new File([new Uint8Array(fileBuffer)], fileName, { type: mimeType });
    
    // Upload to IPFS
    const upload = await pinata.upload.file(file);
    const cid = upload.IpfsHash;
    
    console.log(`✅ File "${fileName}" uploaded to IPFS:`, cid);
    console.log('📍 IPFS Gateway URL:', `https://gateway.pinata.cloud/ipfs/${cid}`);
    
    return cid;
  } catch (error: any) {
    console.error('❌ Error uploading file to IPFS:', error);
    throw new Error(`Failed to upload file to IPFS: ${error.message}`);
  }
}

/**
 * Store complete NFT (metadata + image)
 * @param metadata - NFT metadata object
 * @param imageBuffer - Optional image buffer
 * @param imageName - Optional image name
 * @returns Object containing metadata CID and image CID (if provided)
 */
export async function storeNFT(
  metadata: any,
  imageBuffer?: Buffer,
  imageName?: string
): Promise<{ metadataCID: string; imageCID?: string }> {
  try {
    const pinata = getPinataClient();
    
    let imageCID: string | undefined;
    
    // Upload image first if provided
    if (imageBuffer && imageName) {
      imageCID = await uploadFileToIPFS(imageBuffer, imageName, 'image/png');
      
      // Update metadata to include image URL
      metadata.image = `ipfs://${imageCID}`;
    }
    
    // Upload metadata
    const metadataCID = await uploadMetadataToIPFS(metadata);
    
    return {
      metadataCID,
      imageCID,
    };
  } catch (error: any) {
    console.error('❌ Error storing NFT:', error);
    throw new Error(`Failed to store NFT: ${error.message}`);
  }
}

/**
 * Get IPFS gateway URL for a CID (using Pinata gateway)
 * @param cid - The IPFS CID
 * @returns The gateway URL
 */
export function getIPFSGatewayURL(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Get IPFS protocol URL for a CID
 * @param cid - The IPFS CID
 * @returns The ipfs:// protocol URL
 */
export function getIPFSProtocolURL(cid: string): string {
  return `ipfs://${cid}`;
}
