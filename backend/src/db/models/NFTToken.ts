import mongoose, { Schema, Document } from 'mongoose';

export interface INFTToken extends Document {
  landId: string;
  tokenAddress?: string;
  tokenId?: string;
  network?: string;
  tokenURI?: string;
  ipfsCid: string;
  mintTxHash?: string;
  mintedAt?: Date;
  status: 'ready_to_mint' | 'minting' | 'minted' | 'mint_failed';
  ownerWallet: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NFTTokenSchema = new Schema<INFTToken>(
  {
    landId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenAddress: String,
    tokenId: String,
    network: String,
    tokenURI: String,
    ipfsCid: {
      type: String,
      required: true,
    },
    mintTxHash: String,
    mintedAt: Date,
    status: {
      type: String,
      enum: ['ready_to_mint', 'minting', 'minted', 'mint_failed'],
      default: 'ready_to_mint',
      index: true,
    },
    ownerWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

export const NFTToken = mongoose.model<INFTToken>('NFTToken', NFTTokenSchema);
