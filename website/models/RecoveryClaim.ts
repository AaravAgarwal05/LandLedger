import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRecoveryClaim extends Document {
  caseId: string;
  clerkUserId: string;
  reportedOldWallet: string;
  requestedNewWallet: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  evidence: {
    type: 'kyc_doc' | 'police_fir' | 'affidavit';
    ipfsCid: string;
    filename: string;
  }[];
  adminNotes?: string;
  assignedTo?: string;
  fabricProof?: string;
  evmTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryClaimSchema = new Schema<IRecoveryClaim>(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clerkUserId: {
      type: String,
      required: true,
      index: true,
    },
    reportedOldWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    requestedNewWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'executed', 'cancelled'],
      default: 'submitted',
      index: true,
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ['kyc_doc', 'police_fir', 'affidavit'],
          required: true,
        },
        ipfsCid: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
      },
    ],
    adminNotes: String,
    assignedTo: String,
    fabricProof: String,
    evmTxHash: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
// RecoveryClaimSchema.index({ caseId: 1 }, { unique: true }); // Defined in field
// RecoveryClaimSchema.index({ clerkUserId: 1 }); // Defined in field
// RecoveryClaimSchema.index({ status: 1 }); // Defined in field

export const RecoveryClaim: Model<IRecoveryClaim> =
  mongoose.models.RecoveryClaim ||
  mongoose.model<IRecoveryClaim>('RecoveryClaim', RecoveryClaimSchema);
