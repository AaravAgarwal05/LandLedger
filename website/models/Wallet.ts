import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IWallet extends Document {
  clerkUserId: string;
  address: string;
  label: string;
  network: string;
  primary: boolean;
  verifiedAt?: Date;
  addedAt: Date;
  lastSeenAt: Date;
  source: 'metamask' | 'ledger' | 'safe';
  metadata?: Record<string, any>;
  deleted: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    clerkUserId: {
      type: String,
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    primary: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    addedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['metamask', 'ledger', 'safe'],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
WalletSchema.index({ address: 1, network: 1 }, { unique: true });
// WalletSchema.index({ clerkUserId: 1 }); // Defined in field

export const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
