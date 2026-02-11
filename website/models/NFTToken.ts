import mongoose, { Schema, Model, Document } from 'mongoose';

export interface INFTToken extends Document {
  landId: string;
  tokenAddress: string;
  tokenId: string;
  network: string;
  tokenURI: string;
  ipfsCid: string;
  mintTxHash: string;
  mintedAt: Date;
  status: 'minted' | 'burned' | 'retired' | 'pending';
  ownerWallet: string;
  provenance: {
    action: 'mint' | 'transfer' | 'recovery';
    txHash: string;
    timestamp: Date;
    from?: string;
    to?: string;
    note?: string;
  }[];
  metadataSnapshotHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const NFTTokenSchema = new Schema<INFTToken>(
  {
    landId: {
      type: String,
      required: true,
      index: true,
    },
    tokenAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    tokenId: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    tokenURI: {
      type: String,
      required: true,
    },
    ipfsCid: {
      type: String,
      required: true,
    },
    mintTxHash: {
      type: String,
      required: true,
    },
    mintedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['minted', 'burned', 'retired', 'pending'],
      default: 'pending',
    },
    ownerWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    provenance: [
      {
        action: {
          type: String,
          enum: ['mint', 'transfer', 'recovery'],
          required: true,
        },
        txHash: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        from: String,
        to: String,
        note: String,
      },
    ],
    metadataSnapshotHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NFTTokenSchema.index({ tokenAddress: 1, tokenId: 1, network: 1 }, { unique: true });
// NFTTokenSchema.index({ landId: 1 }); // Defined in field
// NFTTokenSchema.index({ ownerWallet: 1 }); // Defined in field

export const NFTToken: Model<INFTToken> =
  mongoose.models.NFTToken || mongoose.model<INFTToken>('NFTToken', NFTTokenSchema);
