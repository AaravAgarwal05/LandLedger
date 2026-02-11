# NFT.Storage Integration for Land NFT Metadata

This documentation covers the complete implementation of NFT.Storage integration for pinning MongoDB land data as NFT metadata to IPFS.

## Overview

The system allows land registry data stored in MongoDB to be pinned to IPFS as ERC721-compliant NFT metadata using NFT.Storage. This creates a decentralized, permanent record of land ownership that can be used for minting NFTs.

## Architecture

### Components

1. **NFT.Storage Utility** (`lib/nft-storage.ts`)
   - Handles IPFS uploads via NFT.Storage
   - Provides functions for uploading metadata and files
   - Returns IPFS CIDs and gateway URLs

2. **NFT Metadata Formatter** (`lib/nft-metadata.ts`)
   - Converts Land documents to ERC721-compliant metadata
   - Validates metadata structure
   - Formats attributes and properties

3. **API Endpoints**
   - `/api/lands/[id]/pin` - Pin individual land metadata
   - `/api/lands/pin-all` - Bulk pin all user's lands

## Setup

### 1. Install Dependencies

```bash
npm install nft.storage
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
NFT_STORAGE_API_KEY=your_nft_storage_api_key_here
```

**Getting your API key:**
1. Visit [https://nft.storage](https://nft.storage)
2. Sign in or create an account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy and paste into `.env.local`

## API Reference

### Pin Individual Land

**Endpoint:** `POST /api/lands/[id]/pin`

**Description:** Pins a single land's metadata to IPFS

**Authentication:** Required (Clerk)

**Parameters:**
- `id` (path) - MongoDB ObjectId of the land

**Response:**
```json
{
  "success": true,
  "message": "Land metadata successfully pinned to IPFS",
  "landId": "L-2025-MUM-MA-ABC12",
  "ipfsCid": "bafkreiabcd1234...",
  "ipfsUrl": "https://nftstorage.link/ipfs/bafkreiabcd1234...",
  "ipfsProtocol": "ipfs://bafkreiabcd1234...",
  "metadata": { /* NFT metadata object */ }
}
```

**Error Responses:**
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not the owner)
- `404` - Land not found
- `400` - Invalid metadata
- `500` - Server error

### Get Pin Status

**Endpoint:** `GET /api/lands/[id]/pin`

**Description:** Check if a land's metadata is pinned

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "success": true,
  "isPinned": true,
  "landId": "L-2025-MUM-MA-ABC12",
  "ipfsCid": "bafkreiabcd1234...",
  "ipfsUrl": "https://nftstorage.link/ipfs/bafkreiabcd1234...",
  "metadata": { /* NFT metadata object */ }
}
```

### Bulk Pin All Lands

**Endpoint:** `POST /api/lands/pin-all`

**Description:** Pins all unpinned lands for the authenticated user

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "success": true,
  "message": "Bulk pinning completed: 5 successful, 0 failed",
  "pinnedCount": 5,
  "failedCount": 0,
  "totalProcessed": 5,
  "results": [
    {
      "landId": "L-2025-MUM-MA-ABC12",
      "_id": "507f1f77bcf86cd799439011",
      "ipfsCid": "bafkreiabcd1234...",
      "ipfsUrl": "https://nftstorage.link/ipfs/bafkreiabcd1234...",
      "success": true
    }
  ]
}
```

### Get Bulk Pin Status

**Endpoint:** `GET /api/lands/pin-all`

**Description:** Get pinning status for all user's lands

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "success": true,
  "totalLands": 10,
  "pinnedCount": 7,
  "unpinnedCount": 3,
  "pinningProgress": "70.00%",
  "pinnedLands": [ /* array of pinned lands */ ],
  "unpinnedLands": [ /* array of unpinned lands */ ]
}
```

## NFT Metadata Format

The system generates ERC721-compliant metadata with the following structure:

```json
{
  "name": "Land Title",
  "description": "Detailed description with location, area, etc.",
  "attributes": [
    {
      "trait_type": "Land ID",
      "value": "L-2025-MUM-MA-ABC12"
    },
    {
      "trait_type": "Survey Number",
      "value": "123/45"
    },
    {
      "trait_type": "Area",
      "value": 1000,
      "display_type": "number"
    },
    {
      "trait_type": "Area Unit",
      "value": "sqft"
    },
    {
      "trait_type": "Status",
      "value": "registered"
    },
    {
      "trait_type": "City",
      "value": "Mumbai"
    },
    {
      "trait_type": "State",
      "value": "Maharashtra"
    },
    {
      "trait_type": "Computed Area (sqm)",
      "value": 92.90,
      "display_type": "number"
    },
    {
      "trait_type": "Registration Date",
      "value": 1700000000,
      "display_type": "date"
    }
  ],
  "properties": {
    "landId": "L-2025-MUM-MA-ABC12",
    "surveyNo": "123/45",
    "ownerWallet": "0x1234...",
    "status": "registered",
    "fabricTxId": "FABRIC-1234567890",
    "canonicalHash": "abc123...",
    "geo": {
      "type": "Polygon",
      "coordinates": [[[...]]]
    },
    "geoBBox": [72.8, 19.0, 72.9, 19.1],
    "address": {
      "plotNo": "123",
      "street1": "Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }
}
```

## Usage Examples

### Frontend Integration

```typescript
// Pin a single land
async function pinLandMetadata(landId: string) {
  try {
    const response = await fetch(`/api/lands/${landId}/pin`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Pinned to IPFS:', data.ipfsCid);
      console.log('View at:', data.ipfsUrl);
    }
  } catch (error) {
    console.error('Failed to pin:', error);
  }
}

// Check pin status
async function checkPinStatus(landId: string) {
  const response = await fetch(`/api/lands/${landId}/pin`);
  const data = await response.json();
  
  return data.isPinned;
}

// Bulk pin all lands
async function pinAllLands() {
  const response = await fetch('/api/lands/pin-all', {
    method: 'POST',
  });
  
  const data = await response.json();
  console.log(`Pinned ${data.pinnedCount} lands`);
}

// Get bulk status
async function getBulkStatus() {
  const response = await fetch('/api/lands/pin-all');
  const data = await response.json();
  
  console.log(`Progress: ${data.pinningProgress}`);
  console.log(`Pinned: ${data.pinnedCount}/${data.totalLands}`);
}
```

### cURL Examples

```bash
# Pin a single land
curl -X POST https://your-domain.com/api/lands/507f1f77bcf86cd799439011/pin \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check pin status
curl https://your-domain.com/api/lands/507f1f77bcf86cd799439011/pin \
  -H "Authorization: Bearer YOUR_TOKEN"

# Bulk pin all lands
curl -X POST https://your-domain.com/api/lands/pin-all \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get bulk status
curl https://your-domain.com/api/lands/pin-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Schema

The `Land` model includes the `ipfsCid` field:

```typescript
ipfsCid?: string;  // IPFS CID of the pinned metadata
```

This field is automatically populated when metadata is pinned to IPFS.

## Features

✅ **ERC721 Compliance** - Metadata follows OpenSea and ERC721 standards
✅ **Automatic Validation** - Validates metadata before uploading
✅ **Ownership Verification** - Only land owners can pin their lands
✅ **Duplicate Prevention** - Checks if already pinned before uploading
✅ **Bulk Operations** - Pin multiple lands in one request
✅ **Progress Tracking** - Monitor pinning progress across all lands
✅ **Error Handling** - Comprehensive error messages and logging
✅ **IPFS Gateway URLs** - Returns both CID and gateway URLs
✅ **Rich Metadata** - Includes all land details, geo data, and attributes

## Best Practices

1. **Pin Before Minting** - Always pin metadata to IPFS before minting NFTs
2. **Verify Ownership** - The API automatically verifies ownership
3. **Check Status First** - Use GET endpoint to check if already pinned
4. **Bulk Operations** - Use bulk endpoint for multiple lands
5. **Store CID** - The IPFS CID is automatically saved to the database
6. **Use Gateway URLs** - Use the provided gateway URLs for reliable access

## Troubleshooting

### "NFT_STORAGE_API_KEY is not defined"
- Ensure you've added the API key to `.env.local`
- Restart your development server after adding environment variables

### "Failed to upload metadata to IPFS"
- Check your NFT.Storage API key is valid
- Verify you haven't exceeded your storage quota
- Check your internet connection

### "Invalid metadata format"
- The metadata validation failed
- Check the error details in the response
- Ensure all required land fields are populated

### "You do not have permission to pin this land"
- You must be the owner of the land (ownerClerkId matches)
- Verify you're logged in with the correct account

## Security Considerations

- ✅ Authentication required for all endpoints
- ✅ Ownership verification before pinning
- ✅ API key stored securely in environment variables
- ✅ No sensitive data exposed in metadata (only public land records)
- ✅ Canonical hash included for data integrity verification

## Future Enhancements

- [ ] Add image generation for land parcels (map visualization)
- [ ] Support for custom metadata fields
- [ ] Batch processing with rate limiting
- [ ] Webhook notifications when pinning completes
- [ ] Integration with smart contract minting
- [ ] IPFS pinning service redundancy (Pinata, Infura)
- [ ] Metadata versioning and updates

## Support

For issues or questions:
1. Check the error message in the API response
2. Review the console logs (server-side)
3. Verify your NFT.Storage account status
4. Check the NFT.Storage documentation: https://nft.storage/docs/

---

**Last Updated:** November 2025
**Version:** 1.0.0
