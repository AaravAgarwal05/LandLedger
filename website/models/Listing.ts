import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IListing extends Document {
  listingId: string;
  tokenAddress: string;
  tokenId: string;
  network: string;
  sellerClerkId: string;
  sellerWallet: string;
  price: {
    amount: number;
    currency: 'USD' | 'USDT' | 'MATIC' | 'ETH';
  };
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    listingId: {
      type: String,
      required: true,
      unique: true,
    },
    tokenAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: true,
      index: true,
    },
    network: {
      type: String,
      required: true,
    },
    sellerClerkId: {
      type: String,
      required: true,
    },
    sellerWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    price: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        enum: ['USD', 'USDT', 'MATIC', 'ETH'],
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
// ListingSchema.index({ status: 1 }); // Defined in field
ListingSchema.index({ tokenAddress: 1, tokenId: 1 });

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>('Listing', ListingSchema);
