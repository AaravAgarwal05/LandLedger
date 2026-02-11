import mongoose, { Schema, Model, Document } from 'mongoose';

export interface INonce extends Document {
  clerkUserId: string;
  address?: string;
  nonce: string;
  type: 'wallet-link' | 'sensitive-action' | 'recovery-confirm';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const NonceSchema = new Schema<INonce>(
  {
    clerkUserId: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      lowercase: true,
    },
    nonce: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['wallet-link', 'sensitive-action', 'recovery-confirm'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // index: true, // Removed to avoid duplicate with TTL index below
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
// NonceSchema.index({ nonce: 1 }); // Defined in field
NonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const Nonce: Model<INonce> =
  mongoose.models.Nonce || mongoose.model<INonce>('Nonce', NonceSchema);
