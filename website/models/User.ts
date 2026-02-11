import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser extends Document {
  clerkUserId: string;
  email?: string;
  displayName: string;
  roles: ('user' | 'admin' | 'registrar' | 'support')[];
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  publicProfile?: {
    avatarUrl?: string;
    bio?: string;
  };
  metadata?: Record<string, any>;
  primaryWalletId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: ['user', 'admin', 'registrar', 'support'],
      default: ['user'],
      index: true,
    },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    publicProfile: {
      avatarUrl: String,
      bio: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    primaryWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// UserSchema.index({ clerkUserId: 1 }, { unique: true }); // Defined in field
// UserSchema.index({ email: 1 }, { sparse: true, unique: true }); // Defined in field
// UserSchema.index({ roles: 1 }); // Defined in field

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
