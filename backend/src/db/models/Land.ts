import mongoose, { Schema, Document } from 'mongoose';

export interface ILand extends Document {
  landId: string;
  ownerWallet: string;
  ownerClerkId: string;
  status: string;
  ipfsCid?: string;
  fabricTxId?: string;
  tokenId?: string;
  tokenAddress?: string;
  mintTxHash?: string;
  mintedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LandSchema = new Schema<ILand>(
  {
    landId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    ownerClerkId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    ipfsCid: String,
    fabricTxId: String,
    // NFT Fields
    tokenId: String,
    tokenAddress: String,
    mintTxHash: String,
    mintedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const Land = mongoose.model<ILand>('Land', LandSchema);
