import { ILand } from '@/models/Land';

/**
 * NFT Metadata Formatter
 * Converts MongoDB Land data to ERC721 compliant NFT metadata
 */

export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: NFTAttribute[];
  properties?: {
    landId: string;
    surveyNo: string;
    ownerWallet: string;
    status: string;
    fabricTxId: string;
    canonicalHash: string;
    geo?: {
      type: string;
      coordinates: number[][][];
    };
    geoBBox?: number[];
    address: {
      plotNo: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date';
}

/**
 * Format Land data as ERC721 compliant NFT metadata
 * @param land - The Land document from MongoDB
 * @returns NFT metadata object
 */
export function formatLandAsNFTMetadata(land: ILand): NFTMetadata {
  const attributes: NFTAttribute[] = [
    {
      trait_type: 'Land ID',
      value: land.landId,
    },
    {
      trait_type: 'Survey Number',
      value: land.surveyNo,
    },
    {
      trait_type: 'Area',
      value: land.area,
      display_type: 'number',
    },
    {
      trait_type: 'Area Unit',
      value: land.areaUnit,
    },
    {
      trait_type: 'Status',
      value: land.status,
    },
    {
      trait_type: 'City',
      value: land.address.city,
    },
    {
      trait_type: 'State',
      value: land.address.state,
    },
    {
      trait_type: 'Pincode',
      value: land.address.pincode,
    },
  ];

  // Add computed area if available
  if (land.computedArea) {
    attributes.push({
      trait_type: 'Computed Area (sqm)',
      value: parseFloat(land.computedArea.toFixed(2)),
      display_type: 'number',
    });
  }

  // Add registration date
  if (land.createdAt) {
    attributes.push({
      trait_type: 'Registration Date',
      value: new Date(land.createdAt).getTime() / 1000, // Unix timestamp
      display_type: 'date',
    });
  }

  // Add parent/child relationship if exists
  if (land.parentId) {
    attributes.push({
      trait_type: 'Parent Land ID',
      value: land.parentId,
    });
  }

  if (land.childrenIds && land.childrenIds.length > 0) {
    attributes.push({
      trait_type: 'Subdivisions',
      value: land.childrenIds.length,
      display_type: 'number',
    });
  }

  // Create description
  const description = `
Land NFT for ${land.landTitle}

📍 Location: ${land.address.plotNo}, ${land.address.street1}, ${land.address.city}, ${land.address.state} - ${land.address.pincode}

📏 Area: ${land.area} ${land.areaUnit}${land.computedArea ? ` (${land.computedArea.toFixed(2)} sqm computed)` : ''}

📋 Survey No: ${land.surveyNo}

🔗 Land ID: ${land.landId}

🔐 Canonical Hash: ${land.canonicalHash}

⛓️ Fabric Transaction: ${land.fabricTxId}

${land.notes ? `\n📝 Notes: ${land.notes}` : ''}

This NFT represents verified ownership of the land parcel registered on the LandLedger Land Registry blockchain.
  `.trim();

  const metadata: NFTMetadata = {
    name: land.landTitle,
    description,
    attributes,
    properties: {
      landId: land.landId,
      surveyNo: land.surveyNo,
      ownerWallet: land.ownerWallet,
      status: land.status,
      fabricTxId: land.fabricTxId,
      canonicalHash: land.canonicalHash,
      address: land.address,
    },
  };

  // Add geo data if available
  if (land.geo) {
    metadata.properties!.geo = land.geo;
  }

  // Add geoBBox if available
  if (land.geoBBox) {
    metadata.properties!.geoBBox = land.geoBBox;
  }

  return metadata;
}

/**
 * Validate NFT metadata structure
 * @param metadata - The metadata object to validate
 * @returns true if valid, throws error if invalid
 */
export function validateNFTMetadata(metadata: NFTMetadata): boolean {
  if (!metadata.name || typeof metadata.name !== 'string') {
    throw new Error('NFT metadata must have a valid name');
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    throw new Error('NFT metadata must have a valid description');
  }

  if (!Array.isArray(metadata.attributes)) {
    throw new Error('NFT metadata must have an attributes array');
  }

  // Validate each attribute
  metadata.attributes.forEach((attr, index) => {
    if (!attr.trait_type || typeof attr.trait_type !== 'string') {
      throw new Error(`Attribute at index ${index} must have a valid trait_type`);
    }
    if (attr.value === undefined || attr.value === null) {
      throw new Error(`Attribute at index ${index} must have a value`);
    }
  });

  return true;
}

/**
 * Create a minimal NFT metadata object
 * @param name - NFT name
 * @param description - NFT description
 * @param attributes - NFT attributes
 * @returns NFT metadata object
 */
export function createNFTMetadata(
  name: string,
  description: string,
  attributes: NFTAttribute[] = []
): NFTMetadata {
  return {
    name,
    description,
    attributes,
  };
}
